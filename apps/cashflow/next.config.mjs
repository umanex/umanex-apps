/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@umanex/ui', '@umanex/tokens'],
  // De flow-harness bouwt in een eigen map (`.next-harness`) zodat hij `.next` — de map
  // waar PM2 op :3000 uit leest, in dezelfde tree — nooit overschrijft. Zonder de
  // variabele blijft alles bij de gewone `.next`; PM2 en `pm2:rebuild` zetten hem niet.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
};

export default nextConfig;
