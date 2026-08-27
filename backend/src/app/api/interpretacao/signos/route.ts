import { NextResponse } from 'next/server';
import type { InterpretacaoSignos } from '@shared/types/api';
import type { MapaOcidental, SignoChines, SistemaEgipcio, SistemaId } from '@shared/types/astro';
import { usuarioAutenticado } from '@/lib/auth';
import { clienteAdmin } from '@/lib/supabase';
import { gerarTexto } from '@/lib/interpretacao';
import { montarSystemPromptSignos } from '@/lib/prompts';
import { ErroApi, respostaDeErro } from '@/lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SISTEMAS: SistemaId[] = ['ocidental', 'chines', 'egipcio'];

function validarInterpretacao(json: unknown): InterpretacaoSignos {
  const obj = json as Partial<Record<SistemaId, { paragrafos?: unknown }>> | null;
  const valido =
    obj != null &&
    SISTEMAS.every(
      (s) =>
        Array.isArray(obj[s]?.paragrafos) &&
        (obj[s]!.paragrafos as unknown[]).every((p) => typeof p === 'string'),
    );
  if (!valido) {
    throw new ErroApi(
      'INTERPRETACAO_INDISPONIVEL',
      'Os textos sobre seus signos estão indisponíveis agora.',
      503,
      { motivo: 'JSON da Gemini fora do formato esperado', recebido: json },
    );
  }
  return obj as InterpretacaoSignos;
}

async function gerarInterpretacaoSignos(mapa: {
  ocidental: MapaOcidental;
  chines: SignoChines;
  egipcio: SistemaEgipcio;
}): Promise<InterpretacaoSignos> {
  const systemPrompt = montarSystemPromptSignos(mapa);
  let bruto: string;
  try {
    bruto = await gerarTexto({
      systemPrompt,
      mensagemUsuario: 'Gere os parágrafos no formato JSON pedido.',
      maxTokens: 1200,
      respostaJson: true,
    });
  } catch (erro) {
    if (erro instanceof ErroApi) throw erro;
    throw new ErroApi(
      'INTERPRETACAO_INDISPONIVEL',
      'Os textos sobre seus signos estão indisponíveis agora.',
      503,
      String(erro),
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(bruto);
  } catch {
    throw new ErroApi(
      'INTERPRETACAO_INDISPONIVEL',
      'Os textos sobre seus signos estão indisponíveis agora.',
      503,
      { motivo: 'resposta da Gemini não é JSON válido', bruto },
    );
  }
  return validarInterpretacao(json);
}

/**
 * POST /api/interpretacao/signos
 *
 * Exige `Authorization: Bearer <token>`. Não recebe corpo — o mapa vem de
 * `mapas_natais`. Devolve `InterpretacaoSignos`: 2 parágrafos por sistema,
 * sobre a PESSOA (não sobre o dia) — CLAUDE.md, PARTE 2 seção 4.
 *
 * Cache PERMANENTE em `interpretacoes_signos`, por (perfil_id, sistema). Só
 * regenera (os três sistemas juntos, numa chamada só) quando falta algum dos
 * três no cache ou quando `mapas_natais.atualizado_em` é mais recente que a
 * linha cacheada (dados de nascimento mudaram).
 *
 * A lista "O que está onde" do Mapa (`InterpretacaoMapa`) NÃO é gerada por
 * esta rota — não fazia parte do escopo desta entrega; fica como pendência
 * (precisa de decisão de cache: nova tabela ou uma coluna aqui).
 */
export async function POST(req: Request) {
  try {
    const { usuarioId } = await usuarioAutenticado(req);
    const supabase = clienteAdmin();

    const { data: mapaRow, error: erroMapa } = await supabase
      .from('mapas_natais')
      .select('ocidental, chines, egipcio, atualizado_em')
      .eq('perfil_id', usuarioId)
      .maybeSingle();

    if (erroMapa) {
      throw new ErroApi('ERRO_INTERNO', 'Não conseguimos buscar seu mapa agora.', 500, erroMapa.message);
    }
    if (!mapaRow) {
      throw new ErroApi(
        'MAPA_NAO_CALCULADO',
        'Calcule seu mapa primeiro para ver a interpretação dos seus signos.',
        409,
      );
    }

    const { data: cacheRows, error: erroCache } = await supabase
      .from('interpretacoes_signos')
      .select('sistema, paragrafos, atualizado_em')
      .eq('perfil_id', usuarioId);

    if (erroCache) {
      throw new ErroApi('ERRO_INTERNO', 'Não conseguimos buscar o cache de signos.', 500, erroCache.message);
    }

    const porSistema = new Map((cacheRows ?? []).map((linha) => [linha.sistema as SistemaId, linha]));
    const mapaAtualizadoEm = new Date(mapaRow.atualizado_em as string).getTime();

    const cacheCompletoEValido = SISTEMAS.every((sistema) => {
      const linha = porSistema.get(sistema);
      if (!linha) return false;
      return new Date(linha.atualizado_em as string).getTime() >= mapaAtualizadoEm;
    });

    if (cacheCompletoEValido) {
      const resultado = {} as InterpretacaoSignos;
      for (const sistema of SISTEMAS) {
        resultado[sistema] = { paragrafos: porSistema.get(sistema)!.paragrafos as string[] };
      }
      return NextResponse.json<InterpretacaoSignos>(resultado);
    }

    const gerado = await gerarInterpretacaoSignos({
      ocidental: mapaRow.ocidental as MapaOcidental,
      chines: mapaRow.chines as SignoChines,
      egipcio: mapaRow.egipcio as SistemaEgipcio,
    });

    const agora = new Date().toISOString();
    const { error: erroUpsert } = await supabase.from('interpretacoes_signos').upsert(
      SISTEMAS.map((sistema) => ({
        perfil_id: usuarioId,
        sistema,
        paragrafos: gerado[sistema].paragrafos,
        atualizado_em: agora,
      })),
      { onConflict: 'perfil_id,sistema' },
    );
    if (erroUpsert) {
      console.error('[interpretacao/signos] falha ao cachear', erroUpsert);
    }

    return NextResponse.json<InterpretacaoSignos>(gerado);
  } catch (erro) {
    return respostaDeErro(erro);
  }
}
