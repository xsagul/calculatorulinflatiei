// Sitemap scris de mana, fara dependente in plus. `lastmod` vine din data
// ultimei luni de date, nu din data build-ului — o pagina care nu s-a schimbat
// nu are ce sa declare drept modificata.
//
// Paginile de salarii se genereaza din aceeasi lista care le si creeaza, ca sa
// nu existe niciodata o pagina publicata si nedeclarata, sau invers.
import type { APIRoute } from 'astro';
import date from '@/data/ipc-lunar.json';
import { valoriBrut } from '@/lib/salarii-pagini';
import { COTE } from '@/lib/tva';

const SITE = 'https://calculatorulinflatiei.ro';
const u = date.ultimaLuna as { an: number; luna: number };
// Ultima zi a lunii de referinta, ca data de modificare a continutului.
const lastmod = new Date(Date.UTC(u.an, u.luna, 0)).toISOString().slice(0, 10);

const rute = [
  { cale: '/', prioritate: '1.0' },
  { cale: '/salariu', prioritate: '0.9' },
  { cale: '/salariu-minim', prioritate: '0.9' },
  { cale: '/tva', prioritate: '0.9' },
  { cale: '/rata-inflatiei', prioritate: '0.8' },
  { cale: '/actualizare-cu-rata-inflatiei', prioritate: '0.9' },
  { cale: '/date', prioritate: '0.7' },
  { cale: '/api', prioritate: '0.4' },
  { cale: '/politica-de-confidentialitate', prioritate: '0.3' },
  { cale: '/cookies', prioritate: '0.3' },
  ...COTE.map((c) => ({ cale: `/tva/${c.slug}`, prioritate: c.inVigoare ? '0.8' : '0.5' })),
  ...valoriBrut().map((brut) => ({ cale: `/salariu/${brut}-lei-brut`, prioritate: '0.6' })),
];

export const GET: APIRoute = () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rute.map((r) => `  <url>
    <loc>${SITE}${r.cale === '/' ? '/' : r.cale + '/'}</loc>
    <lastmod>${lastmod}</lastmod>
    <priority>${r.prioritate}</priority>
  </url>`).join('\n')}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
