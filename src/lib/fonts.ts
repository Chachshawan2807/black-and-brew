import { IBM_Plex_Sans_Thai, Inter, Prompt } from 'next/font/google';

/** Latin fallback — loaded on demand only when Prompt/IBM Plex miss a glyph. */
export const inter = Inter({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-inter',
  display: 'swap',
  preload: false,
});

/** Primary UI font (Thai + Latin). Weights load via @font-face when used — no link preload. */
export const prompt = Prompt({
  subsets: ['latin', 'thai'],
  weight: ['400', '500', '600'],
  variable: '--font-prompt',
  display: 'swap',
  preload: false,
});

/** Thai fallback before Inter — regular weight only. */
export const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['400'],
  variable: '--font-ibm-plex-sans-thai',
  display: 'swap',
  preload: false,
});

export const appFontClassName = `${inter.variable} ${prompt.variable} ${ibmPlexSansThai.variable} font-sans`;

/** Matches --font-sans in globals.css — use for SVG/canvas/Recharts where CSS vars apply */
export const APP_FONT_FAMILY_CSS =
  'var(--font-prompt), var(--font-ibm-plex-sans-thai), var(--font-inter), system-ui, sans-serif';
