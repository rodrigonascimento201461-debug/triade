import { NextResponse } from 'next/server';
import type { MapaOcidental } from '@shared/types/astro';
import { calcularMapaOcidental } from '@/lib/astroCalc';
import { respostaDeErro } from '@/lib/errors';
import { dadosNascimentoSchema, lerCorpo } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/calcular/mapa-ocidental
 *
 * Corpo (plano, sem envelope):
 * { data_nascimento, hora_nascimento, hora_desconhecida, cidade, pais }
 *
 * Proxy para POST /calcular/mapa-ocidental do astro-calc-service, que exige o
 * envelope { dados: {...} } — o embrulho acontece em lib/astroCalc.ts.
 *
 * TODO (especialista de banco): cachear em `natal_charts` por usuário e devolver
 * do cache quando os dados de nascimento não mudaram. O cálculo é determinístico.
 */
export async function POST(req: Request) {
  try {
    const dados = await lerCorpo(req, dadosNascimentoSchema);
    const mapa = await calcularMapaOcidental(dados);
    return NextResponse.json<MapaOcidental>(mapa);
  } catch (erro) {
    return respostaDeErro(erro);
  }
}
