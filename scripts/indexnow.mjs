// Anunta paginile la IndexNow.
//
// Un site nou nu are nicio problema de continut si toate problemele de
// descoperire: cat timp nu e indexat, orice pagina in plus valoreaza zero.
// IndexNow rezolva jumatate din asta gratuit si instant — Bing, Yandex, Seznam,
// Naver impart aceeasi coada, si indexul Bing e si cel din spatele cautarii din
// ChatGPT. Google nu participa; acolo raman sitemap-ul si linkurile.
//
// Lista de adrese se citeste din sitemap, ca sa nu existe niciodata o a doua
// lista care sa ramana in urma.
//
//     node scripts/indexnow.mjs [--cheie <cheie>]

import { readdir, readFile } from 'node:fs/promises';

const GAZDA = 'calculatorulinflatiei.ro';
const SITE = `https://${GAZDA}`;

/** Cheia e numele fisierului din public/, ca sa nu fie scrisa in doua locuri. */
async function cheie() {
  const dat = process.argv.indexOf('--cheie');
  if (dat > -1 && process.argv[dat + 1]) return process.argv[dat + 1];

  const fisiere = await readdir('public');
  const gasit = fisiere.find((f) => /^[0-9a-f]{8,128}\.txt$/.test(f));
  if (!gasit) throw new Error('Nu am gasit fisierul de cheie in public/.');
  return gasit.replace(/\.txt$/, '');
}

async function adrese() {
  const xml = await readFile('dist/sitemap.xml', 'utf8');
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

const k = await cheie();
const urlList = await adrese();

// Verificam intai ca fisierul de cheie chiar se serveste: fara el, trimiterea e
// respinsa si nu ai de unde sti de ce.
const proba = await fetch(`${SITE}/${k}.txt`);
if (!proba.ok) {
  throw new Error(`Cheia nu se serveste la ${SITE}/${k}.txt (HTTP ${proba.status}). Publica intai.`);
}
if ((await proba.text()).trim() !== k) {
  throw new Error('Fisierul de cheie exista, dar nu contine cheia.');
}

const raspuns = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: GAZDA, key: k, keyLocation: `${SITE}/${k}.txt`, urlList }),
});

// 200 si 202 inseamna amandoua „primit". 422 inseamna ca adresele nu apartin
// gazdei, 403 ca nu se potriveste cheia.
console.log(JSON.stringify({
  trimise: urlList.length,
  status: raspuns.status,
  raspuns: (await raspuns.text()).slice(0, 200) || '(gol)',
}, null, 1));
