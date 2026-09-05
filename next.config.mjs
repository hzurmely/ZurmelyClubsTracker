/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  // Para o app de desktop: BUILD_DESKTOP=1 npm run build gera .next/standalone,
  // uma pasta que roda sozinha com o node, sem precisar do projeto inteiro.
  // Na Vercel a variável não existe, então nada muda por lá.
  output: process.env.BUILD_DESKTOP === '1' ? 'standalone' : undefined,
};

export default nextConfig;
