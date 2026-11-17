// Mutarea pe salariile.ro, decisă de proprietar pe 17 noiembrie 2026.
//
// Site-ul nu mai e întreținut separat: fiecare adresă veche trimite cu 301 la
// echivalentul ei de pe salariile.ro, ca vizitele și autoritatea să ajungă acolo.
// Scriptul citește adresele publicate din ultimul build (dist/) și scrie
// redirectionare/_redirects, care se publică pe Cloudflare Pages în locul site-ului:
//
//   npm run build && node scripts/genereaza-redirectari.mjs
//   npx wrangler pages deploy redirectionare --project-name calculatorulinflatiei --branch main
//
// Pe Cloudflare Pages, regulile din _redirects au întâietate față de fișiere și se
// aplică prima care se potrivește. Limite: 2.000 de reguli fixe și 100 cu „*”.
//
// Unde merge fiecare familie:
//   /                               → /calculator-inflatie (91% din clicuri)
//   /actualizare-cu-rata-inflatiei/ → /calculator-inflatie (comasată acolo)
//   /rata-inflatiei/[an][/luna]/    → /rata-inflatiei#an-AAAA (un tabel cu toți anii)
//   /salariu/N-lei-brut/            → /calculator/calcul-salariu-net-N-brut dacă suma e
//                                     indexată pe salariile.ro, altfel /?brut=N
//   /tva/*                          → /calculator-tva
//   /api/, /widget/, /incorporeaza/ → /widget
//   /date/, /ipc-lunar.*            → /rata-inflatiei#date, /date/ipc-lunar.*
//   orice altceva                   → /calculator-inflatie
import fs from 'node:fs';
import path from 'node:path';

const NOU = 'https://salariile.ro';

// Copiate din src/lib/seo.ts al salariile.ro (CALCULATOR_BRUT_VALUES), 17 noiembrie 2026.
const BRUT_INDEXAT = new Set([
  4050, 4325, 4400, 4500, 4582, 4600, 4700, 4800, 4900, 5000, 5200, 5500,
  5800, 6000, 6200, 6500, 6800, 7000, 7200, 7350, 7500, 8000, 8500, 9000,
  9500, 10000, 12000, 20000,
]);

const FIXE = {
  '/': '/calculator-inflatie',
  '/actualizare-cu-rata-inflatiei/': '/calculator-inflatie',
  '/rata-inflatiei/': '/rata-inflatiei',
  '/salariu/': '/',
  '/salariu-minim/': '/salariu-minim',
  '/tva/': '/calculator-tva',
  '/date/': '/rata-inflatiei#date',
  '/api/': '/widget',
  '/incorporeaza/': '/widget',
  '/widget/': '/widget',
  '/contact/': '/contact',
  '/politica-de-confidentialitate/': '/politica-confidentialitate',
  '/cookies/': '/cookies',
};

// Adresele site-ului de dinainte de Astro (septembrie 2026), care pot fi încă în index.
const VECHI = {
  '/index.html': '/calculator-inflatie',
  '/api.html': '/widget',
  '/cookies.html': '/cookies',
  '/politica-de-confidentialitate.html': '/politica-confidentialitate',
  '/ipc-lunar.csv': '/date/ipc-lunar.csv',
  '/ipc-lunar.json': '/date/ipc-lunar.json',
};

function destinatie(url) {
  if (FIXE[url]) return FIXE[url];
  let m = url.match(/^\/rata-inflatiei\/(\d{4})\/(?:[a-z]+\/)?$/);
  if (m) return `/rata-inflatiei#an-${m[1]}`;
  m = url.match(/^\/salariu\/(\d+)-lei-brut\/$/);
  if (m) {
    const n = Number(m[1]);
    return BRUT_INDEXAT.has(n) ? `/calculator/calcul-salariu-net-${n}-brut` : `/?brut=${n}`;
  }
  if (url.startsWith('/tva/')) return '/calculator-tva';
  throw new Error(`Adresă fără echivalent stabilit: ${url}`);
}

// Adresele publicate: fiecare index.html din dist/.
const adrese = [];
(function parcurge(dir) {
  for (const intrare of fs.readdirSync(dir, { withFileTypes: true })) {
    const cale = path.join(dir, intrare.name);
    if (intrare.isDirectory()) parcurge(cale);
    else if (intrare.name === 'index.html') {
      const rel = '/' + path.relative('dist', path.dirname(cale)).split(path.sep).join('/');
      adrese.push(rel === '/' ? '/' : rel + '/');
    }
  }
})('dist');
adrese.sort();

const reguli = [];
const adauga = (de, la) => reguli.push(`${de} ${NOU}${la} 301`);

for (const url of adrese) {
  const la = destinatie(url);
  adauga(url, la);
  // Aceeași adresă fără slash final: Pages nu le leagă singur când nu mai există fișiere.
  if (url !== '/') adauga(url.slice(0, -1), la);
}
for (const [de, la] of Object.entries(VECHI)) adauga(de, la);

// Plasa de siguranță, după regulile fixe: orice adresă necunoscută ajunge la echivalentul
// cel mai apropiat, nu la o pagină de eroare.
reguli.push(
  `/rata-inflatiei/* ${NOU}/rata-inflatiei 301`,
  `/salariu/* ${NOU}/ 301`,
  `/tva/* ${NOU}/calculator-tva 301`,
  `/api/* ${NOU}/widget 301`,
  `/widget/* ${NOU}/widget 301`,
  `/* ${NOU}/calculator-inflatie 301`,
);

fs.mkdirSync('redirectionare', { recursive: true });
fs.writeFileSync(
  path.join('redirectionare', '_redirects'),
  `# calculatorulinflatiei.ro s-a mutat pe salariile.ro (17 noiembrie 2026).\n# Generat de scripts/genereaza-redirectari.mjs; nu se editează de mână.\n${reguli.join('\n')}\n`,
);
const fixe = reguli.filter((r) => !r.includes('*')).length;
console.log(`redirectionare/_redirects: ${adrese.length} adrese publicate, ${fixe} reguli fixe, ${reguli.length - fixe} cu „*”.`);
