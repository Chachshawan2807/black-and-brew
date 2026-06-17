import { IBM_Plex_Sans_Thai, Inter, Prompt } from 'next/font/google';

export const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-inter',
  display: 'swap',
});

export const prompt = Prompt({
  subsets: ['latin', 'thai'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-prompt',
  display: 'swap',
});

export const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans-thai',
  display: 'swap',
});

export const appFontClassName = `${inter.variable} ${prompt.variable} ${ibmPlexSansThai.variable}`;
