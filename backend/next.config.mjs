/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // TESTE TEMPORÁRIO: output standalone removido pra isolar se é a causa
  // do "Build script returned non-zero exit code: 2" no Netlify.
  // output: 'standalone',
};

export default nextConfig;
