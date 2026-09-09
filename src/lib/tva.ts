// src/lib/tva.ts
//
// Taxa pe valoarea adaugata: adunata la un pret fara TVA, sau extrasa dintr-unul
// cu TVA.
//
// Aritmetica e triviala. Ce nu e trivial, si ce lipseste din aproape toate
// calculatoarele de TVA din Romania, e ca intrebarea are o data:
//
// - De la 1 august 2025 cotele sunt 21% si 11%. Inainte erau 19%, 9% si 5%.
//   Cine verifica o factura din iulie 2025 are nevoie de cotele vechi, si un
//   calculator care stie doar cotele de azi ii da un raspuns gresit cu care se
//   duce la contabil.
// - Cota de 9% pentru locuinte a fost pastrata tranzitoriu si a expirat la
//   31 iulie 2026. Un calculator care inca o ofera trimite oamenii intr-o
//   prevedere care nu mai exista.
//
// Sursa cotelor: Codul Fiscal art. 291, modificat prin Legea 141/2025.

export type Cota = {
  /** Procentul, ca numar intreg: 21, 11, 19, 9, 5. */
  procent: number;
  /** Adresa paginii proprii, daca are una. */
  slug: string;
  eticheta: string;
  /** La ce se aplica, pe scurt. */
  seAplicaLa: string;
  /** Daca mai e in vigoare azi. */
  inVigoare: boolean;
  /** Cand a inceput si, daca s-a incheiat, cand. */
  perioada: string;
};

export const COTE: Cota[] = [
  {
    procent: 21,
    slug: '21-la-suta',
    eticheta: 'Cota standard, 21%',
    seAplicaLa:
      'tot ce nu e trecut expres pe lista cotei reduse: electronice, îmbrăcăminte, combustibil, servicii profesionale, băuturi alcoolice.',
    inVigoare: true,
    perioada: 'din 1 august 2025',
  },
  {
    procent: 11,
    slug: '11-la-suta',
    eticheta: 'Cota redusă, 11%',
    seAplicaLa:
      'alimente, medicamente, apă potabilă, cărți, ziare și reviste, cazare hotelieră, restaurante și catering, transport de persoane, lemne de foc.',
    inVigoare: true,
    perioada: 'din 1 august 2025',
  },
  {
    procent: 19,
    slug: '19-la-suta',
    eticheta: 'Vechea cotă standard, 19%',
    seAplicaLa: 'facturile emise până la 31 iulie 2025, când 19% era cota generală.',
    inVigoare: false,
    perioada: 'din 2017 până la 31 iulie 2025',
  },
  {
    procent: 9,
    slug: '9-la-suta',
    eticheta: 'Vechea cotă redusă, 9%',
    seAplicaLa:
      'alimente, medicamente și cazare până la 31 iulie 2025, apoi doar locuințele care îndeplineau condițiile tranzitorii, până la 31 iulie 2026.',
    inVigoare: false,
    perioada: 'până la 31 iulie 2025, tranzitoriu pentru locuințe până la 31 iulie 2026',
  },
  {
    procent: 5,
    slug: '5-la-suta',
    eticheta: 'Vechea cotă redusă, 5%',
    seAplicaLa: 'cărți, manuale, acces la muzee și evenimente, până la 31 iulie 2025.',
    inVigoare: false,
    perioada: 'până la 31 iulie 2025',
  },
];

export const COTA_STANDARD = COTE[0];
export const COTE_IN_VIGOARE = COTE.filter((c) => c.inVigoare);

export function cotaDupaSlug(slug?: string): Cota | undefined {
  return COTE.find((c) => c.slug === slug);
}

export type RezultatTva = {
  procent: number;
  faraTva: number;
  tva: number;
  cuTva: number;
};

/** Pretul fara TVA, plus taxa. */
export function adaugaTva(faraTva: number, procent: number): RezultatTva {
  const baza = Math.max(0, faraTva);
  const tva = (baza * procent) / 100;
  return { procent, faraTva: baza, tva, cuTva: baza + tva };
}

/**
 * Taxa dintr-un pret care o contine deja.
 *
 * Greseala uzuala e sa se scada procentul din total — 21% din 121 nu e TVA-ul
 * din 121. Taxa e cota raportata la baza, deci se extrage cu 21/121, nu cu
 * 21/100. Diferenta la o suta de lei e de peste patru lei.
 */
export function extrageTva(cuTva: number, procent: number): RezultatTva {
  const total = Math.max(0, cuTva);
  const tva = (total * procent) / (100 + procent);
  return { procent, faraTva: total - tva, tva, cuTva: total };
}
