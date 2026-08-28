/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @netlify/plugin-nextjs (Netlify) exige isso — sem `output: 'standalone'`
  // ele não encontra `.next/standalone` e falha o deploy com "does not
  // contain expected Next.js build output" (mensagem enganosa, não é sobre
  // versão do Next). Não quebra `next start` (usado no deploy Railway
  // antigo) — standalone é só um artefato extra gerado no build.
  output: 'standalone',
};

export default nextConfig;
