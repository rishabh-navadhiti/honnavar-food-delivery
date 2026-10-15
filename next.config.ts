import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/shared/i18n/request.ts');

const nextConfig: NextConfig = {
  experimental: {
    // Photos up to 5 MB are uploaded through server actions (research R7).
    serverActions: { bodySizeLimit: '6mb' },
  },
  images: {
    loader: 'custom',
    loaderFile: './src/shared/images/loader.ts',
  },
};

export default withNextIntl(nextConfig);
