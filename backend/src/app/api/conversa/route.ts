import type { MapaOcidental, SignoChines, SistemaEgipcio } from '@shared/types/astro';
import { usuarioAutenticado } from '@/lib/auth';
import { clienteAdmin } from '@/lib/supabase';
import { gerarTextoStream, type TurnoConversa } from '@/lib/interpretacao';
import { montarSystemPromptConversa } from '@/lib/prompts';
import { ErroApi, respostaDeErro } from '@/lib/errors';
import { conversaSchema, lerCorpo } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HISTORICO_MAXIMO = 20;

/**
 * POST /api/conversa
 *
 * Exige `Authorization: Bearer <token>`. Corpo: `{ mensagem: string }`
 * (`ConversaRequest`, campo `historico` é ignorado — o histórico real vem de
 * `mensagens` no Supabase, não do que o app manda).
 *
 * Streaming: a resposta é `text/event-stream`. Cada evento:
 * `data: {"delta":"texto parcial"}\n\n`, terminando com `data: [DONE]\n\n`.
 * O app consome via `fetch` + `response.body.getReader()` (não é um
 * `EventSource` de verdade porque é POST, mas o formato é o mesmo).
 *
 * A mensagem do usuário é salva em `mensagens` antes de chamar a Gemini; a
 * resposta completa da IA é salva depois que o stream termina (fora do
 * caminho crítico de resposta ao app — não atrasa o primeiro byte).
 *
 * Se a chamada à Gemini falhar ANTES do stream começar (chave ausente, rede
 * caiu), a rota devolve o erro normal (`INTERPRETACAO_INDISPONIVEL`, 503) em
 * JSON, não um stream vazio.
 */
export async function POST(req: Request) {
  try {
    const { usuarioId } = await usuarioAutenticado(req);
    const entrada = await lerCorpo(req, conversaSchema);
    const supabase = clienteAdmin();

    const { data: mapaRow, error: erroMapa } = await supabase
      .from('mapas_natais')
      .select('ocidental, chines, egipcio')
      .eq('perfil_id', usuarioId)
      .maybeSingle();

    if (erroMapa) {
      throw new ErroApi('ERRO_INTERNO', 'Não conseguimos buscar seu mapa agora.', 500, erroMapa.message);
    }
    if (!mapaRow) {
      throw new ErroApi(
        'MAPA_NAO_CALCULADO',
        'Calcule seu mapa primeiro para conversar sobre ele.',
        409,
      );
    }

    const { data: historicoRows, error: erroHistorico } = await supabase
      .from('mensagens')
      .select('papel, texto, criado_em')
      .eq('perfil_id', usuarioId)
      .order('criado_em', { ascending: false })
      .limit(HISTORICO_MAXIMO);

    if (erroHistorico) {
      throw new ErroApi('ERRO_INTERNO', 'Não conseguimos buscar o histórico da conversa.', 500, erroHistorico.message);
    }

    const historico: TurnoConversa[] = (historicoRows ?? [])
      .slice()
      .reverse()
      .map((linha) => ({ papel: linha.papel as TurnoConversa['papel'], texto: linha.texto as string }));

    const { error: erroSalvarUsuario } = await supabase.from('mensagens').insert({
      perfil_id: usuarioId,
      papel: 'usuario',
      texto: entrada.mensagem,
    });
    if (erroSalvarUsuario) {
      console.error('[conversa] falha ao salvar mensagem do usuário', erroSalvarUsuario);
    }

    const systemPrompt = montarSystemPromptConversa({
      ocidental: mapaRow.ocidental as MapaOcidental,
      chines: mapaRow.chines as SignoChines,
      egipcio: mapaRow.egipcio as SistemaEgipcio,
    });

    const { stream, textoCompleto } = await gerarTextoStream({
      systemPrompt,
      mensagemUsuario: entrada.mensagem,
      historico,
      maxTokens: 1024,
    });

    // Persiste a resposta completa quando o stream terminar. Não bloqueia a
    // resposta HTTP — roda em paralelo enquanto o app já está lendo o stream.
    textoCompleto
      .then(async (texto) => {
        if (!texto) return;
        const { error } = await supabase.from('mensagens').insert({
          perfil_id: usuarioId,
          papel: 'triade',
          texto,
        });
        if (error) console.error('[conversa] falha ao salvar resposta da IA', error);
      })
      .catch((causa) => {
        console.error('[conversa] geração em stream falhou antes de completar', causa);
      });

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (erro) {
    return respostaDeErro(erro);
  }
}
