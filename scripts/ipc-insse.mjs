#!/usr/bin/env node
// scripts/ipc-insse.mjs
// Descarca din TEMPO-Online (INS) lantul lunar al indicelui preturilor de consum
// si scrie src/data/ipc-lunar.json.
//
// Matricea: IPC102A — „Indicii preturilor de consum - evolutia lunara fata de
// luna anterioara". 426 de luni, ianuarie 1991 – iunie 2026, in procente fata de
// luna precedenta (100 = pret neschimbat).
//
// DE CE LANTUL LUNAR SI NU INDICELE ANUAL. Din indici lunari se poate calcula
// orice interval — luna la luna, an la an, sau de la o data la alta — iar
// rezultatul ramane exact acelasi indiferent de drum. Dintr-un indice anual nu se
// poate cobori la luna. Calculatorul devine mai precis decat orice concurent care
// lucreaza doar pe ani.
//
// DENOMINAREA DIN 1 IULIE 2005. Prin Legea 348/2004, 10.000 lei vechi (ROL) au
// devenit 1 leu nou (RON). Indicii de pret NU contin taierea: ea e o schimbare de
// unitate, nu de pret. Cine inlantuie indicii peste iulie 2005 fara sa imparta la
// 10.000 obtine un rezultat gresit de zece mii de ori pentru orice an anterior.
// Factorul se pastreaza aici, langa date, ca sa nu poata fi uitat in cod.
//
// Licenta sursei: continutul TEMPO se reutilizeaza conform licentei pentru o
// guvernare deschisa (OGL-ROU-1.0), cu indicarea clara a sursei.
//
//   node scripts/ipc-insse.mjs

import fs from 'node:fs/promises';
import path from 'node:path';

const BASE = 'http://statistici.insse.ro:8077/tempo-ins';
const MATRICE = 'IPC102A';
const IESIRE = path.join(process.cwd(), 'src', 'data', 'ipc-lunar.json');
const TIMEOUT = 60_000;
const REINCERCARI = 6;

const LUNI = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
  'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];

async function cere(url, init) {
  let ultima;
  for (let i = 0; i < REINCERCARI; i++) {
    try {
      const r = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r;
    } catch (e) { ultima = e; await new Promise(s => setTimeout(s, 2000 * (i + 1))); }
  }
  throw new Error(`TEMPO nu a raspuns la ${url}: ${ultima?.message ?? ultima}`);
}

const CELULA = /<(th|td)\b([^>]*)>([\s\S]*?)<\/\1\b[^>]*>/g;
const RAND = /<tr>([\s\S]*?)<\/tr>/g;
const faraEtichete = v => v.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();

/** „Luna martie 1997" -> { an: 1997, luna: 3 } */
function citesteLuna(eticheta) {
  const m = /Luna\s+(\p{L}+)\s+(\d{4})/u.exec(eticheta);
  if (!m) return null;
  const luna = LUNI.indexOf(m[1].toLowerCase());
  return luna < 0 ? null : { an: Number(m[2]), luna: luna + 1 };
}

const meta = await (await cere(`${BASE}/matrix/${MATRICE}`)).json();
const [dimCategorii, dimLuni, dimUm] = meta.dimensionsMap;
// Toate cele patru categorii, nu doar totalul. „Inflatia la alimente" e o
// intrebare pe care lumea o pune separat, iar INS o publica de-a gata.
const categorii = dimCategorii.options;
if (categorii.length !== 4) throw new Error(`Asteptam 4 categorii, matricea are ${categorii.length}.`);

const alege = o => ({ label: o.label, nomItemId: o.nomItemId, offset: o.offset, parentId: o.parentId });
const raspuns = await (await cere(`${BASE}/matrix/${MATRICE}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    language: 'ro',
    arr: [categorii.map(alege), dimLuni.options.map(alege), dimUm.options.map(alege)],
    matrixName: meta.matrixName,
    matrixDetails: meta.details,
  }),
})).json();

const html = typeof raspuns === 'string' ? raspuns : (raspuns.html ?? JSON.stringify(raspuns));
const randuri = [...html.matchAll(RAND)].map(m => m[1]);
if (!randuri.length) throw new Error('Raspunsul TEMPO nu contine tabel.');

// Antetul poarta lunile; randul de date poarta valorile, in aceeasi ordine.
const etichete = [];
for (const r of randuri) {
  for (const c of r.matchAll(CELULA)) {
    const l = citesteLuna(faraEtichete(c[3]));
    if (l) etichete.push(l);
  }
  if (etichete.length) break;
}
if (etichete.length !== dimLuni.options.length) {
  throw new Error(`Antet cu ${etichete.length} luni, asteptam ${dimLuni.options.length}.`);
}

const peCategorii = {};
for (const r of randuri) {
  const celule = [...r.matchAll(CELULA)];
  const text = celule.map(c => faraEtichete(c[3]));
  const eticheta = categorii.find(c => text.includes(c.label.trim()))?.label.trim();
  const numere = celule.filter(c => c[1] === 'td').map(c => faraEtichete(c[3])).map(t => {
    const brut = t.replace(/\./g, '').replace(',', '.');
    const n = Number(brut);
    return brut !== '' && Number.isFinite(n) ? n : null;
  }).filter(n => n !== null);
  if (eticheta && numere.length === etichete.length) peCategorii[eticheta] = numere;
}
if (Object.keys(peCategorii).length !== categorii.length) {
  throw new Error(`Am citit ${Object.keys(peCategorii).length} categorii din ${categorii.length}.`);
}
const valori = peCategorii['Total'];

const serie = etichete.map((l, i) => ({ ...l, indice: valori[i] }));
const nefiresc = serie.filter(r => !(r.indice > 50 && r.indice < 400));
if (nefiresc.length) {
  throw new Error(`Valori in afara intervalului plauzibil: ${nefiresc.slice(0, 3).map(r => `${r.an}-${r.luna}: ${r.indice}`).join(', ')}`);
}

const payload = {
  sursa: {
    institutie: 'Institutul Național de Statistică',
    baza: 'TEMPO-Online',
    matrice: MATRICE,
    denumire: meta.matrixName,
    url: `http://statistici.insse.ro:8077/tempo-ins/matrix/${MATRICE}`,
    licenta: 'OGL-ROU-1.0',
  },
  descarcatLa: new Date().toISOString(),
  unitate: 'procente fata de luna precedenta (100 = preturi neschimbate)',
  denominare: {
    dataLegala: '2005-07-01',
    act: 'Legea nr. 348/2004 privind denominarea monedei naționale',
    factor: 10000,
    nota: 'Indicii de pret nu contin taierea. Orice conversie a unei sume dinainte de 1 iulie 2005 in lei de azi trebuie impartita la 10.000, altfel rezultatul e gresit de zece mii de ori.',
  },
  categorii: Object.fromEntries(Object.entries(peCategorii).map(([nume, v]) =>
    [nume, etichete.map((l, i) => ({ ...l, indice: v[i] }))])),
  primaLuna: serie[0],
  ultimaLuna: serie.at(-1),
  luni: serie.length,
  serie,
};

await fs.mkdir(path.dirname(IESIRE), { recursive: true });
await fs.writeFile(IESIRE, JSON.stringify(payload, null, 2) + '\n');
console.log(JSON.stringify({
  scris: path.relative(process.cwd(), IESIRE),
  luni: serie.length,
  de_la: `${serie[0].an}-${String(serie[0].luna).padStart(2, '0')}`,
  pana_la: `${serie.at(-1).an}-${String(serie.at(-1).luna).padStart(2, '0')}`,
}, null, 1));
