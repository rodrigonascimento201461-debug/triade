import { NextResponse } from 'next/server';
import type { LeituraDiaria } from '@shared/types/api';
import type { MapaOcidental, SignoChines, SistemaEgipcio } from '@shared/types/astro';
import { usuarioAutenticado } from '@/lib/auth';
import { clienteAdmin } from '@/lib/supabase';
import { gerarTexto } from '@/lib/interpretacao';
import { montarSystemPromptLeituraDiaria } from '@/lib/prompts';
import { ErroApi, respostaDeErro } from '@/lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** "Hoje" no fuso de referência do produto (Brasil). Estável mesmo perto da meia-noite. */
function dataDeHojeISO(): string {
  const agora = new Date();
  const comOffset = new Date(agora.getTime() - 3 * 60 * 60 * 1000); // UTC-3, sem DST no Brasil hoje
  return comOffset.toISOString().slice(0, 10);
}

interface LinhaMapaNatal {
  ocidental: MapaOcidental;
  chines: SignoChines;
  egipcio: SistemaEgipcio;
}

interface RespostaGeracaoDiaria {
  sintese: string;
  apoio: string;
  frases: { ocidental: string; chines: string; egipcio: string };
}

function validarRespostaDiaria(json: unknown): RespostaGeracaoDiaria {
  const obj = json as Partial<RespostaGeracaoDiaria> | null;
  if (
    !obj ||
    typeof obj.sintese !== 'string' ||
    typeof obj.apoio !== 'string' ||
    !obj.frases ||
    typeof obj.frases.ocidental !== 'string' ||
    typeof obj.frases.chines !== 'string' ||
    typeof obj.frases.egipcio !== 'string'
  ) {
    throw new ErroApi(
      'INTERPRETACAO_INDISPONIVEL',
      'Os textos do dia estão indisponíveis agora.',
      503,
      { motivo: 'JSON da Gemini fora do formato esperado', recebido: json },
    );
  }
  return obj as RespostaGeracaoDiaria;
}

async function gerarLeituraDiaria(mapa: LinhaMapaNatal, data: string): Promise<RespostaGeracaoDiaria> {
  const systemPrompt = montarSystemPromptLeituraDiaria(mapa, data);
  let bruto: string;
  try {
    bruto = await gerarTexto({
      systemPrompt,
      mensagemUsuario: 'Gere a leitura de hoje no formato JSON pedido.',
      maxTokens: 700,
      respostaJson: true,
    });
  } catch (erro) {
    if (erro instanceof ErroApi) throw erro;
    throw new ErroApi('INTERPRETACAO_INDISPONIVEL', 'Os textos do dia estão indisponíveis agora.', 503, String(erro));
  }

  let json: unknown;
  try {
    json = JSON.parse(bruto);
  } catch (erro) {
    throw new ErroApi(
      'INTERPRETACAO_INDISPONIVEL',
      'Os textos do dia estão indisponíveis agora.',
      503,
      { motivo: 'resposta da Gemini não é JSON válido', bruto },
    );
  }
  return validarRespostaDiaria(json);
}

/**
 * POST /api/interpretacao/leitura-diaria
 *
 * Exige `Authorization: Bearer <token>`. Não recebe corpo — o mapa vem de
 * `mapas_natais` (perfil já precisa ter calculado e persistido o mapa).
 *
 * Cache por (perfil_id, data): uma geração por dia. Se a Gemini falhar, devolve
 * `INTERPRETACAO_INDISPONIVEL` (503) — o app continua mostrando os signos
 * calculados sem os textos (ver `mobile/src/app/(tabs)/hoje.tsx`).
 */
export async function POST(req: Request) {
  try {
    const { usuarioId } = await usuarioAutenticado(req);
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
        'Calcule seu mapa primeiro para ver a leitura do dia.',
        409,
      );
    }

    const hoje = dataDeHojeISO();

    const { data: cache, error: erroCache } = await supabase
      .from('leituras_diarias')
      .select('data, sintese, apoio, frases')
      .eq('perfil_id', usuarioId)
      .eq('data', hoje)
      .maybeSingle();

    if (erroCache) {
      throw new ErroApi('ERRO_INTERNO', 'Não conseguimos buscar a leitura de hoje.', 500, erroCache.message);
    }

    if (cache) {
      return NextResponse.json<LeituraDiaria>({
        data: cache.data,
        sintese: cache.sintese,
        apoio: cache.apoio,
        frases: cache.frases,
      });
    }

    const gerado = await gerarLeituraDiaria(
      {
        ocidental: mapaRow.ocidental as MapaOcidental,
        chines: mapaRow.chines as SignoChines,
        egipcio: mapaRow.egipcio as SistemaEgipcio,
      },
      hoje,
    );

    const { error: erroInsercao } = await supabase.from('leituras_diarias').insert({
      perfil_id: usuarioId,
      data: hoje,
      sintese: gerado.sintese,
      apoio: gerado.apoio,
      frases: gerado.frases,
    });
    if (erroInsercao) {
      // Já geramos o texto — não derruba a resposta por falha no cache.
      console.error('[leitura-diaria] falha ao cachear', erroInsercao);
    }

    return NextResponse.json<LeituraDiaria>({ data: hoje, ...gerado });
  } catch (erro) {
    return respostaDeErro(erro);
  }
}
