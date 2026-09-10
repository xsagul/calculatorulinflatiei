// Ce luni primesc pagina proprie.
//
// Trei locuri au nevoie de acelasi raspuns — ruta care genereaza paginile,
// pagina anului care le leaga, si sitemap-ul care le declara. Daca fiecare si-ar
// tine propria socoteala, ar exista pagini generate si nedeclarate, sau legaturi
// catre pagini care nu se construiesc. De aceea raspunsul sta intr-un singur loc.
import { ULTIMA_LUNA, PRIMA_LUNA, numeLuna, type Luna } from './inflatie';

/**
 * Cate luni in urma primesc pagina proprie.
 *
 * Patru ani acopera valul de inflatie de dupa 2021 si tot ce cauta lumea. Nimeni
 * nu cauta „inflatia in martie 1997"; lunile mai vechi raman acoperite de pagina
 * anului lor, unde stau oricum toate intr-un tabel.
 */
export const LUNI_CU_PAGINA = 48;

const rang = (l: Luna) => l.an * 12 + (l.luna - 1);
const dinRang = (r: number): Luna => ({ an: Math.floor(r / 12), luna: (r % 12) + 1 });

/** De la cea mai recenta catre trecut. */
export function luniCuPagina(): Luna[] {
  const luni: Luna[] = [];
  const ultim = rang(ULTIMA_LUNA);
  const prim = rang(PRIMA_LUNA);
  for (let i = 0; i < LUNI_CU_PAGINA; i++) {
    const r = ultim - i;
    if (r < prim) break;
    luni.push(dinRang(r));
  }
  return luni;
}

export function areLunaPagina(l: Luna): boolean {
  const r = rang(l);
  return r <= rang(ULTIMA_LUNA) && r > rang(ULTIMA_LUNA) - LUNI_CU_PAGINA && r >= rang(PRIMA_LUNA);
}

export const caleLuna = (l: Luna) => `/rata-inflatiei/${l.an}/${numeLuna(l.luna)}/`;
