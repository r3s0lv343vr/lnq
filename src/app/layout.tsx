import type { Metadata, Viewport } from 'next';
import { Fraunces, IBM_Plex_Mono, Source_Serif_4 } from 'next/font/google';
import { SessionProvider } from '@/lib/session';
import './globals.css';

const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  display: 'swap',
});

const sourceSerif = Source_Serif_4({
  variable: '--font-source-serif',
  subsets: ['latin'],
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: '--font-ibm-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Lnq — async cohort comms',
  description:
    'Lnq is async-first cohort communication — Zulip-class streams, topics, and DMs for program teams.',
};

export const viewport: Viewport = {
  themeColor: '#0B1F24',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${fraunces.variable} ${sourceSerif.variable} ${ibmPlexMono.variable} antialiased`}
      >
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
