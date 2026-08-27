import { NextResponse } from 'next/server';
import type { SistemaEgipcio } from '@shared/types/astro';
import { calcularSistemaEgipcio } from '@/lib/astroCalc';
import { respostaDeErro } from '@/lib/errors';
import { apenasDataSchema, lerCorpo } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/calcular/sistema-egipcio
 * Corpo: { data_nascimento: "AAAA-MM-DD" }
 *
 * O campo `metodologia` da resposta é texto obrigatório: exibir na íntegra no
 * Perfil. Nunca resumir nem apresentar o sistema egípcio como astronomia
 * comprovada do Egito antigo (CLAUDE.md, "Não fazer").
 */
export async function POST(req: Request) {
  try {
    const entrada = await lerCorpo(req, apenasDataSchema);
    const egipcio = await calcularSistemaEgipcio(entrada);
    return NextResponse.json<SistemaEgipcio>(egipcio);
  } catch (erro) {
    return respostaDeErro(erro);
  }
}
