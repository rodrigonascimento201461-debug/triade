import { respostaSpa } from '@/lib/spa';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET / — serve o app web (SPA). Ver src/lib/spa.ts. */
export function GET() {
  return respostaSpa();
}
