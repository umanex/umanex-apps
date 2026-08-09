import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @umanex/rowtrack-tokens exporteert rauwe .ts (de Tailwind-preset) en een .mjs
  // met de rollen; zonder transpilePackages struikelt de app-build erover.
  transpilePackages: ['@umanex/rowtrack-tokens'],
};

export default withNextIntl(nextConfig);
