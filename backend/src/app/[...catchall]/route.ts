import { respostaCatchAll } from '@/lib/spa';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /qualquer/coisa — fallback da SPA (expo-router faz o roteamento no
 * cliente), com um desvio: se o caminho bater com um arquivo real em
 * public/, serve o arquivo em vez do HTML. Ver `lib/spa.ts` para o porquê
 * (bug de produção com segmentos de caminho começando com `@`).
 *
 * Rotas de /api/* têm segmentos mais específicos e o Next.js as resolve
 * antes de cair aqui.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ catchall: string[] }> },
) {
  const { catchall } = await params;
  return respostaCatchAll(catchall ?? []);
}
