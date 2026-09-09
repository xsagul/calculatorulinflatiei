// @ts-check
import { defineConfig } from 'astro/config';

// Static, fara JavaScript trimis implicit catre browser. Calculatorul are nevoie
// de o singura insula de interactivitate; restul paginii ramane HTML pur, ceea ce
// e cea mai buna pozitie de plecare pe Core Web Vitals.
export default defineConfig({
  site: 'https://calculatorulinflatiei.ro',
  output: 'static',
  // URL-urile indexate ale site-ului precedent au slash la final —
  // /cookies/, /politica-de-confidentialitate/ — iar widgetul e incorporat de
  // pe /widget/. Forma de director le pastreaza identice, ca migrarea sa nu
  // ceara redirecturi si sa nu piarda ce e deja clasat.
  trailingSlash: 'always',
  build: { format: 'directory' },
  compressHTML: true,
});
