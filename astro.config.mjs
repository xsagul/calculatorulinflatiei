// @ts-check
import { defineConfig } from 'astro/config';

// Static, fara JavaScript trimis implicit catre browser. Calculatorul are nevoie
// de o singura insula de interactivitate; restul paginii ramane HTML pur, ceea ce
// e cea mai buna pozitie de plecare pe Core Web Vitals.
export default defineConfig({
  site: 'https://calculatorulinflatiei.ro',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
  compressHTML: true,
});
