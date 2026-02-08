import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import './globals.css';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'ZKProofport — Zero-Knowledge Proof Infrastructure',
    template: '%s | ZKProofport',
  },
  description: 'Privacy infrastructure for the next generation of dApps. From Noir circuits to mobile proof generation to on-chain verification.',
  metadataBase: new URL(process.env.SITE_URL || 'https://zkproofport.app'),
  openGraph: {
    title: 'ZKProofport — Zero-Knowledge Proof Infrastructure',
    description: 'Prove who you are without revealing who you are. Complete ZK proof pipeline from circuits to mobile to on-chain.',
    siteName: 'ZKProofport',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ZKProofport — Zero-Knowledge Proof Infrastructure',
    description: 'Prove who you are without revealing who you are.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jetbrainsMono.variable}>
      <body>
        <div className="scanline" />
        {children}
      </body>
    </html>
  );
}
