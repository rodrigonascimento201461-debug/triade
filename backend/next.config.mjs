/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // `shared/` fica fora da pasta do projeto. Só tipos são importados de lá
  // (apagados na compilação), mas o Next precisa saber que o diretório raiz do
  // traçado de arquivos é um nível acima.
  outputFileTracingRoot: new URL('..', import.meta.url).pathname,
};

export default nextConfig;
