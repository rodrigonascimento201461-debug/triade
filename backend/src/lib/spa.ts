/**
 * Serve o app web do TRÍADE (export estático do Expo, `mobile/`) direto deste
 * backend Next.js — um único serviço no Railway, sem CORS entre front e API.
 *
 * O HTML é o mesmo para toda rota fora de /api: é uma SPA (expo-router), o
 * roteamento acontece no cliente depois que o bundle carrega. `_expo/` e
 * `app-web.html` são arquivos estáticos normais dentro de public/, servidos
 * pelo próprio Next.js sem passar por aqui.
 *
 * As FONTES (e outros assets do pacote `@expo-google-fonts`) são um caso à
 * parte — ver `tentarServirArquivoEstatico` abaixo — porque o Railway CLI
 * (`railway up`) pula silenciosamente qualquer diretório chamado
 * `node_modules`, não importa o que o `.gitignore` diga. O export web do
 * Expo gera exatamente esse caminho (`assets/node_modules/@expo-google-fonts/
 * archivo/*.ttf`, espelhando de onde o `require()` importa a fonte), então
 * essas fontes nunca chegavam a subir pro Railway — a resposta vinha 200 com
 * o HTML da SPA no lugar do arquivo (nenhum erro 4xx, nenhum erro de
 * console; só as fontes falhavam em silêncio e o app carregava sem estilo
 * nenhum). Corrigido copiando esses arquivos para `backend/font-assets/`
 * (mesmo conteúdo, caminho de disco sem a palavra "node_modules") e
 * remapeando aqui — a URL pública continua `/assets/node_modules/...`
 * porque esse caminho está fixo no bundle JS (Metro gera os requires em
 * build-time, não é reconfigurável em runtime).
 *
 * Para atualizar o app web: `cd mobile && npm run build`, depois:
 *   - `mobile/dist/_expo` → `backend/public/_expo`
 *   - `mobile/dist/index.html` → `backend/public/app-web.html`
 *   - `mobile/dist/assets/node_modules/*` → `backend/font-assets/*`
 * `EXPO_PUBLIC_BACKEND_URL` precisa apontar para a URL pública deste backend
 * ANTES do build — é embutida no bundle em tempo de build, não lida em
 * runtime pelo navegador.
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';

let htmlCache: string | null = null;

function carregarHtml(): string {
  if (htmlCache) return htmlCache;
  const caminho = path.join(process.cwd(), 'public', 'app-web.html');
  htmlCache = readFileSync(caminho, 'utf-8');
  return htmlCache;
}

const MIME_POR_EXTENSAO: Record<string, string> = {
  '.js': 'application/javascript; charset=utf-8',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
};

function servirDoDisco(absoluto: string, raizPermitida: string): NextResponse | null {
  if (!absoluto.startsWith(raizPermitida)) return null; // nunca sair da raiz (path traversal via `..`)
  if (!existsSync(absoluto)) return null;

  const extensao = path.extname(absoluto).toLowerCase();
  const conteudo = readFileSync(absoluto);
  return new NextResponse(conteudo, {
    status: 200,
    headers: {
      'Content-Type': MIME_POR_EXTENSAO[extensao] ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

/**
 * Serve o arquivo correspondente à URL `/assets/node_modules/<resto>` a
 * partir de `backend/font-assets/<resto>` (ver o porquê no comentário do
 * topo do arquivo). Devolve `null` se o caminho não começar com
 * `assets/node_modules/` ou se o arquivo não existir.
 */
function tentarServirFonteRemapeada(segmentos: string[]): NextResponse | null {
  if (segmentos[0] !== 'assets' || segmentos[1] !== 'node_modules') return null;
  const resto = segmentos.slice(2);
  if (resto.length === 0) return null;

  const raiz = path.join(process.cwd(), 'font-assets');
  const absoluto = path.join(raiz, ...resto);
  return servirDoDisco(absoluto, raiz);
}

/** Serve `public/<segmentos>` se existir de verdade. */
function tentarServirArquivoEstatico(segmentos: string[]): NextResponse | null {
  const raiz = path.join(process.cwd(), 'public');
  const absoluto = path.join(raiz, ...segmentos);
  return servirDoDisco(absoluto, raiz);
}

/**
 * Resposta para qualquer rota fora de /api: tenta servir uma fonte
 * remapeada, depois um arquivo real de public/, e só então cai no HTML da
 * SPA (fallback de rota do expo-router).
 */
export function respostaCatchAll(segmentos: string[]): NextResponse {
  return (
    tentarServirFonteRemapeada(segmentos) ?? tentarServirArquivoEstatico(segmentos) ?? respostaSpa()
  );
}

export function respostaSpa(): NextResponse {
  return new NextResponse(carregarHtml(), {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Nunca cachear a resposta desta rota-fallback — response de página
      // dinâmica (dynamic = 'force-dynamic' nas rotas que chamam isto).
      'Cache-Control': 'no-store',
    },
  });
}
