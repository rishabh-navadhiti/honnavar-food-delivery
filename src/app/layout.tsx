import type { Metadata, Viewport } from 'next';
import { Anek_Kannada } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import './globals.css';

/** One family drawn for Kannada and Latin together, self-hosted at build time (research R2). */
const anek = Anek_Kannada({ subsets: ['kannada', 'latin'], axes: ['wdth'], variable: '--font-anek', display: 'swap' });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common');
  return { title: t('appName') };
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#b8461a' };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={anek.variable}>
      <body className="min-h-dvh font-sans antialiased">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
