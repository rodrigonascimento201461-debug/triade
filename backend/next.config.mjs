import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // `shared/` fica fora da pasta do projeto (só tipos, apagados na
  // compilação — ver shared/README.md), mas sem isso o Next tenta detectar
  // a raiz do monorepo sozinho subindo diretórios, o que:
  // - no Windows, achava C:\Projetos\package-lock.json (de outro projeto,
  //   vários níveis acima) e só avisava;
  // - no build do Netlify (container sandboxed), batia num limite de
  //   permissão subindo diretórios e quebrava o build com exit code 2.
  // BUG anterior: `new URL('..', import.meta.url).pathname` no Windows
  // gera um caminho tipo "/C:/Projetos/..." (barra extra antes da letra do
  // drive, inválido) — por isso parecia quebrar o standalone. `fileURLToPath`
  // resolve certo nas duas plataformas.
  outputFileTracingRoot: fileURLToPath(new URL('..', import.meta.url)),
  // @netlify/plugin-nextjs (Netlify) exige isso — sem `output: 'standalone'`
  // ele não encontra `.next/standalone` e falha o deploy. Não quebra
  // `next start` (usado no deploy Railway antigo) — standalone é só um
  // artefato extra gerado no build.
  output: 'standalone',
};

export default nextConfig;
