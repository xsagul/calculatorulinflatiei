// src/lib/inflatie.ts
//
// Calculul puterii de cumparare, din lantul lunar al indicelui preturilor de
// consum publicat de INS (matricea IPC102A, vezi scripts/ipc-insse.mjs).
//
// TREI DECIZII CARE FAC DIFERENTA FATA DE RESTUL CALCULATOARELOR:
//
// 1. Lantul e lunar, nu anual. „Ianuarie 2020" si „decembrie 2020" sunt doua
//    intrebari diferite, cu doua raspunsuri diferite. Cine calculeaza pe ani
//    raspunde la o intrebare pe care nimeni n-a pus-o.
//
// 2. Denominarea din 1 iulie 2005 se aplica. Prin Legea 348/2004, 10.000 lei
//    vechi au devenit 1 leu nou. Indicii de pret nu contin taierea, fiindca e o
//    schimbare de unitate, nu de pret. Cine inlantuie indicii peste iulie 2005
//    fara sa imparta la 10.000 raspunde gresit de zece mii de ori.
//
// 3. Nu inventam date. Seria incepe in ianuarie 1991, de unde o publica INS.
//    Pentru orice data anterioara raspunsul este ca nu stim, nu o extrapolare.

import date from '../data/ipc-lunar.json' with { type: 'json' };

export type Luna = { an: number; luna: number };
type RandSerie = Luna & { indice: number };

const SERIE = date.serie as RandSerie[];
const DENOMINARE = date.denominare;

/** 1 iulie 2005: de aici incolo sumele sunt in lei noi. */
export const DENOMINARE_AN = 2005;
export const DENOMINARE_LUNA = 7;
export const FACTOR_DENOMINARE = DENOMINARE.factor;
export const SURSA = date.sursa;
export const PRIMA_LUNA = SERIE[0];
export const ULTIMA_LUNA = SERIE[SERIE.length - 1];

const NUME_LUNI = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
  'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'] as const;

export const numeLuna = (luna: number) => NUME_LUNI[luna - 1];
export const etichetaLuna = (l: Luna) => `${numeLuna(l.luna)} ${l.an}`;

const rang = (l: Luna) => l.an * 12 + (l.luna - 1);
const inSerie = (l: Luna) => rang(l) >= rang(PRIMA_LUNA) && rang(l) <= rang(ULTIMA_LUNA);

/** Moneda in care se exprima o suma la o data data. */
export function moneda(l: Luna): 'ROL' | 'RON' {
  return rang(l) < rang({ an: DENOMINARE_AN, luna: DENOMINARE_LUNA }) ? 'ROL' : 'RON';
}

/**
 * De cate ori au crescut preturile intre doua luni, ignorand moneda.
 * Indicii sunt „fata de luna precedenta", deci factorul de la luna A la luna B
 * este produsul indicilor lunilor A+1 .. B. Rezultatul e simetric: drumul invers
 * da exact inversul, oricat de lung ar fi intervalul.
 */
export function factorPreturi(de: Luna, la: Luna): number {
  const [a, b] = rang(de) <= rang(la) ? [de, la] : [la, de];
  let factor = 1;
  for (const r of SERIE) {
    const p = rang(r);
    if (p > rang(a) && p <= rang(b)) factor *= r.indice / 100;
  }
  return rang(de) <= rang(la) ? factor : 1 / factor;
}

export type Rezultat = {
  suma: number;
  de: Luna;
  la: Luna;
  monedaDe: 'ROL' | 'RON';
  monedaLa: 'ROL' | 'RON';
  /** Suma echivalenta, in moneda de la data-tinta. */
  echivalent: number;
  /** De cate ori au crescut preturile. */
  factorPreturi: number;
  /** Cat la suta din puterea de cumparare initiala a mai ramas. */
  putereRamasa: number;
  /** Inflatia cumulata, in procente. */
  inflatieCumulata: number;
  /** Rata medie anuala echivalenta, in procente. */
  rataMedieAnuala: number | null;
  denominareAplicata: boolean;
};

/**
 * Mesajul spune pe ce parte a seriei am iesit. „Seria incepe in 1991" pentru o
 * data din viitor ar trimite omul sa caute problema unde nu e.
 */
function verificaInterval(l: Luna): void {
  if (inSerie(l)) return;
  const inainte = rang(l) < rang(PRIMA_LUNA);
  throw new Error(inainte
    ? `Nu avem date pentru ${etichetaLuna(l)}. Seria publicata de INS incepe in ${etichetaLuna(PRIMA_LUNA)}.`
    : `Nu avem date pentru ${etichetaLuna(l)}. Seria publicata de INS se opreste la ${etichetaLuna(ULTIMA_LUNA)}.`);
}

/** Suma dintr-o luna, exprimata in puterea de cumparare a altei luni. */
export function converteste(suma: number, de: Luna, la: Luna): Rezultat {
  verificaInterval(de);
  verificaInterval(la);

  const factor = factorPreturi(de, la);
  const monedaDe = moneda(de);
  const monedaLa = moneda(la);
  // Taierea a patru zerouri se aplica o singura data, cand se trece granita.
  const schimbareUnitate = monedaDe === 'ROL' && monedaLa === 'RON' ? 1 / FACTOR_DENOMINARE
    : monedaDe === 'RON' && monedaLa === 'ROL' ? FACTOR_DENOMINARE : 1;

  const luni = Math.abs(rang(la) - rang(de));
  const ani = luni / 12;

  return {
    suma,
    de,
    la,
    monedaDe,
    monedaLa,
    echivalent: suma * factor * schimbareUnitate,
    factorPreturi: factor,
    putereRamasa: 100 / factor,
    inflatieCumulata: (factor - 1) * 100,
    rataMedieAnuala: ani >= 1 ? (Math.pow(factor, 1 / ani) - 1) * 100 : null,
    denominareAplicata: schimbareUnitate !== 1,
  };
}

/** Inflatia dintre doua luni consecutive de acelasi nume, an peste an. */
export function inflatieAnuala(an: number, luna: number = ULTIMA_LUNA.luna): number | null {
  const la = { an, luna };
  const de = { an: an - 1, luna };
  if (!inSerie(de) || !inSerie(la)) return null;
  return (factorPreturi(de, la) - 1) * 100;
}

/** Anii intregi acoperiti de serie, pentru selectoare si pagini generate. */
export function aniDisponibili(): number[] {
  const ani: number[] = [];
  for (let an = PRIMA_LUNA.an; an <= ULTIMA_LUNA.an; an++) ani.push(an);
  return ani;
}

// ─── Agregari pe an ─────────────────────────────────────────────────────────
//
// Search Console arata cerere clara pentru „rata inflatiei 2023", „inflatia in
// romania in ultimii 10 ani", „indice inflatie 2026" — interogari la care azi
// aparem cu pagina principala si nu raspundem. Functiile de mai jos sunt tot ce
// trebuie ca fiecare an sa aiba pagina lui, calculata din aceeasi serie.

/**
 * Nivelul preturilor la o luna, cu prima luna a seriei ca 100.
 *
 * Nu e un indice oficial publicat, e lantul nostru cumulat — dar rapoartele
 * dintre doua niveluri sunt exact factorii de pret, si asta e tot ce folosim.
 * Denominarea nu intervine: indicii masoara preturi, nu unitati monetare.
 */
export function nivel(l: Luna): number {
  return factorPreturi(PRIMA_LUNA, l) * 100;
}

/** Lunile unui an care exista in serie. */
export function lunileAnului(an: number): (RandSerie & { anLaAn: number | null })[] {
  return SERIE
    .filter((r) => r.an === an)
    .map((r) => ({ ...r, anLaAn: inSerie({ an: an - 1, luna: r.luna }) ? inflatieAnuala(an, r.luna) : null }));
}

/**
 * Rata medie anuala: nivelul mediu al preturilor dintr-un an fata de nivelul
 * mediu al anului precedent.
 *
 * E alta cifra decat decembrie-la-decembrie si raspunde altei intrebari — „cat
 * mai scump a fost anul acesta fata de anul trecut, luat pe tot" — iar INS o
 * publica pe amandoua. Un an care incepe cu inflatie mare si se linisteste are
 * media mult peste decembrie-la-decembrie, si invers. De aceea le aratam pe
 * amandoua, cu numele fiecareia.
 */
export function inflatieMedieAnuala(an: number): number | null {
  const acum = lunileAnului(an);
  const inainte = lunileAnului(an - 1);
  if (acum.length !== 12 || inainte.length !== 12) return null;
  const medie = (luni: RandSerie[]) =>
    luni.reduce((s, r) => s + nivel(r), 0) / luni.length;
  return (medie(acum) / medie(inainte) - 1) * 100;
}

/** Anii cu serie completa, deci cu rata anuala calculabila. */
export function aniIntregi(): number[] {
  return aniDisponibili().filter((an) => lunileAnului(an).length === 12);
}
