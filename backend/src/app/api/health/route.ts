import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/health — checagem rápida de configuração de ambiente. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    servico: 'triade-backend',
    configurado: {
      astro_calc: Boolean(process.env.ASTRO_CALC_URL),
      gemini: Boolean(process.env.GEMINI_API_KEY),
      supabase: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
  });
}
