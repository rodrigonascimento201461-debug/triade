import { NextResponse } from 'next/server';
import type { SignoChines } from '@shared/types/astro';
import { calcularSignoChines } from '@/lib/astroCalc';
import { respostaDeErro } from '@/lib/errors';
import { apenasDataSchema, lerCorpo } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/calcular/signo-chines
 * Corpo: { data_nascimento: "AAAA-MM-DD" }
 *
 * 422 do serviço vira codigo ANO_FORA_DA_TABELA: o app deve degradar mostrando
 * só ocidental + egípcio em vez de travar (TAREFAS P0 item 4).
 *
 * TODO: `tronco_celeste` / `ramo_terrestre` ainda não vêm do serviço (P1 item 7).
 * O design mostra "Tronco Geng · Ramo Wu" — a preferência do briefing é adicionar
 * no serviço Python, não derivar no app.
 */
export async function POST(req: Request) {
  try {
    const entrada = await lerCorpo(req, apenasDataSchema);
    const chines = await calcularSignoChines(entrada);
    return NextResponse.json<SignoChines>(chines);
  } catch (erro) {
    return respostaDeErro(erro);
  }
}
