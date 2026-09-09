// src/lib/salariu.ts
//
// Salariul brut in net, dupa Codul Fiscal, pentru un contract cu norma intreaga
// la functia de baza.
//
// DE CE EXISTA ACEST FISIER INTR-UN SITE DESPRE INFLATIE
//
// Site-ul raspunde la o singura intrebare, pusa in doua feluri. „Cat mai
// valoreaza banii mei" are un raspuns dat de preturi — inflatia — si unul dat de
// stat — taxele. Un om care isi negociaza salariul vrea sa stie amandoua: cat ii
// intra in cont, si cat mai cumpara suma aia fata de acum cinci ani. Nimeni din
// Romania nu pune cele doua cifre pe aceeasi pagina.
//
// PATRU LUCRURI PE CARE CELELALTE CALCULATOARE LE GRESESC SAU LE SAR
//
// 1. Suma neimpozabila de la salariul minim. Cine e platit exact cu salariul
//    minim nu plateste CAS, CASS si impozit pe tot brutul: 300 lei (pana in
//    iunie 2026), respectiv 200 lei (din iulie 2026) sunt scosi din baza. Un
//    calculator care ignora facilitatea da un net cu ~150 lei mai mic la cel mai
//    cautat salariu din tara.
//
// 2. Deducerea personala nu e o cifra fixa. E un procent din salariul minim,
//    care porneste de la 20% si scade cu jumatate de punct la fiecare transa de
//    50 de lei peste minim, pana se stinge la minim + 2.000. Multe calculatoare
//    o aplica trunchiat sau deloc.
//
// 3. 2026 are doua regimuri, nu unul. Salariul minim a crescut de la 4.050 la
//    4.325 lei pe 1 iulie 2026, si odata cu el s-a schimbat si suma
//    neimpozabila, si toata scara deducerii. Acelasi brut da doua neturi
//    diferite in acelasi an calendaristic.
//
// 4. Tichetele de masa se impoziteaza, dar nu la fel. Din 2024 intra in baza de
//    CASS si de impozit, insa nu si in cea de CAS si nici in CAM. Cine le trece
//    ca bonus curat supraestimeaza; cine le taxeaza integral subestimeaza.
//
// TEMEI LEGAL
// Codul Fiscal (Legea 227/2015), art. 77 pentru deducerea personala, art. 138 si
// 156 pentru cotele de CAS si CASS, art. 220^3 pentru CAM. Suma neimpozabila de
// la salariul minim e prevederea tranzitorie prelungita prin OUG 89/2025.
// Salariul minim brut: 4.050 lei pana la 30 iunie 2026, 4.325 lei de la 1 iulie
// 2026.

export const CAS = 0.25;
export const CASS = 0.1;
export const IMPOZIT = 0.1;
export const CAM = 0.0225;

/** Peste salariul minim + atat, deducerea personala nu se mai acorda deloc. */
const PRAG_DEDUCERE = 2000;
/** Deducerea scade cu 0,5 puncte la fiecare transa de atatia lei peste minim. */
const TRANSA = 50;
/** Procentul de pornire, dupa numarul de persoane in intretinere (0, 1, 2, 3, 4+). */
const PROCENTE_DE_BAZA = [20, 25, 30, 35, 45] as const;
/** Deducerea suplimentara pentru salariatii de pana in 26 de ani, ca procent din minim. */
const PROCENT_SUB_26 = 15;
/** Deducerea suplimentara, in lei, pentru fiecare copil scolarizat. */
const DEDUCERE_COPIL = 100;

export type Regim = {
  cheie: string;
  eticheta: string;
  /** Prima luna in care se aplica, ca an*12+luna-1. */
  de: number;
  salariulMinim: number;
  /** Partea din brut scoasa din baza de calcul, la salariul minim. */
  sumaNeimpozabila: number;
};

const luna = (an: number, l: number) => an * 12 + (l - 1);

// Ordinea conteaza: cel mai recent regim primul, ca sa fie implicit cel curent.
export const REGIMURI: Regim[] = [
  {
    cheie: '2026-h2',
    eticheta: 'iulie–decembrie 2026',
    de: luna(2026, 7),
    salariulMinim: 4325,
    sumaNeimpozabila: 200,
  },
  {
    cheie: '2026-h1',
    eticheta: 'ianuarie–iunie 2026',
    de: luna(2026, 1),
    salariulMinim: 4050,
    sumaNeimpozabila: 300,
  },
  {
    cheie: '2025',
    eticheta: '2025',
    de: luna(2025, 1),
    salariulMinim: 4050,
    sumaNeimpozabila: 300,
  },
];

export const REGIM_CURENT = REGIMURI[0];

export function regimDupaCheie(cheie?: string): Regim {
  return REGIMURI.find((r) => r.cheie === cheie) ?? REGIM_CURENT;
}

export type IntrareSalariu = {
  /** Salariul brut lunar, in lei. */
  brut: number;
  /** Numarul de persoane aflate in intretinere. Peste 4 se trateaza ca 4. */
  persoane?: number;
  /** Salariat de pana in 26 de ani: deducere suplimentara de 15% din minim. */
  sub26?: boolean;
  /** Copii scolarizati, pentru deducerea suplimentara de 100 lei fiecare. */
  copii?: number;
  /** Valoarea lunara totala a tichetelor de masa, in lei. */
  tichete?: number;
  /**
   * Daca salariul de baza e chiar salariul minim. Facilitatea sumei
   * neimpozabile cere ca baza sa fie fix minimul, nu doar ca brutul sa fie mic;
   * implicit o deducem din egalitatea brutului cu minimul.
   */
  laSalariulMinim?: boolean;
};

export type Deducere = {
  deBaza: number;
  sub26: number;
  copii: number;
  total: number;
  /** Procentul aplicat salariului minim pentru partea de baza. */
  procent: number;
};

export type RezultatSalariu = {
  regim: Regim;
  brut: number;
  tichete: number;
  /** Partea din brut scoasa din baza, cand se aplica facilitatea salariului minim. */
  neimpozabil: number;
  bazaContributii: number;
  cas: number;
  cass: number;
  /** CASS retinut separat pe tichetele de masa. */
  cassTichete: number;
  deducere: Deducere;
  bazaImpozit: number;
  impozit: number;
  /** Total retinut din brut. */
  retineri: number;
  /** Ce intra efectiv in cont, in bani. */
  net: number;
  /** Netul in bani plus valoarea tichetelor. */
  totalPrimit: number;
  cam: number;
  costAngajator: number;
  /** Tot ce se duce in taxe, din costul total al angajatorului. */
  totalTaxe: number;
  /** Cat la suta din costul angajatorului ajunge la salariat, in bani si tichete. */
  procentPastrat: number;
};

const leu = (n: number) => Math.round(n);

/**
 * Deducerea personala lunara.
 *
 * Scara e o singura formula, nu un tabel copiat: procentul de pornire depinde de
 * cate persoane sunt in intretinere, si scade cu jumatate de punct la fiecare
 * transa inceputa de 50 de lei peste salariul minim. La minim + 2.000 procentul
 * de pornire fara persoane in intretinere ajunge exact la zero, ceea ce e si
 * plafonul legal — potrivirea confirma ca formula si textul legii spun acelasi
 * lucru.
 */
export function deducerePersonala(
  brut: number,
  regim: Regim,
  { persoane = 0, sub26 = false, copii = 0 }: Omit<IntrareSalariu, 'brut'> = {},
): Deducere {
  const zero = { deBaza: 0, sub26: 0, copii: 0, total: 0, procent: 0 };
  if (brut > regim.salariulMinim + PRAG_DEDUCERE) return zero;

  const peste = Math.max(0, brut - regim.salariulMinim);
  const transe = Math.ceil(peste / TRANSA);
  const pornire = PROCENTE_DE_BAZA[Math.min(Math.max(persoane, 0), 4)];
  const procent = Math.max(0, pornire - 0.5 * transe);

  const deBaza = leu((procent / 100) * regim.salariulMinim);
  const bonusTinerete = sub26 ? leu((PROCENT_SUB_26 / 100) * regim.salariulMinim) : 0;
  const bonusCopii = Math.max(0, copii) * DEDUCERE_COPIL;

  return {
    deBaza,
    sub26: bonusTinerete,
    copii: bonusCopii,
    total: deBaza + bonusTinerete + bonusCopii,
    procent,
  };
}

/** Salariul net si tot ce se retine pe drum. */
export function calculeazaSalariu(intrare: IntrareSalariu, regim: Regim = REGIM_CURENT): RezultatSalariu {
  const brut = Math.max(0, intrare.brut);
  const tichete = Math.max(0, intrare.tichete ?? 0);

  // Facilitatea cere ca salariul de baza sa fie chiar minimul. Cand nu ni se
  // spune altfel, o deducem din egalitate: cine scrie exact 4.325 e platit cu
  // minimul, cine scrie 4.400 nu mai e.
  const laMinim = intrare.laSalariulMinim ?? brut === regim.salariulMinim;
  const neimpozabil = laMinim ? Math.min(regim.sumaNeimpozabila, brut) : 0;

  const bazaContributii = brut - neimpozabil;
  const cas = leu(CAS * bazaContributii);
  const cass = leu(CASS * bazaContributii);
  // Tichetele intra in CASS si in impozit, dar nu in CAS si nu in CAM.
  const cassTichete = leu(CASS * tichete);

  const deducere = deducerePersonala(brut, regim, intrare);

  const bazaImpozit = Math.max(
    0,
    bazaContributii - cas - cass - deducere.total + (tichete - cassTichete),
  );
  const impozit = leu(IMPOZIT * bazaImpozit);

  const retineri = cas + cass + cassTichete + impozit;
  const net = brut - retineri;

  const cam = leu(CAM * bazaContributii);
  const costAngajator = brut + cam + tichete;
  const totalTaxe = retineri + cam;
  const totalPrimit = net + tichete;

  return {
    regim,
    brut,
    tichete,
    neimpozabil,
    bazaContributii,
    cas,
    cass,
    cassTichete,
    deducere,
    bazaImpozit,
    impozit,
    retineri,
    net,
    totalPrimit,
    cam,
    costAngajator,
    totalTaxe,
    procentPastrat: costAngajator > 0 ? (totalPrimit / costAngajator) * 100 : 0,
  };
}

/**
 * Drumul invers: ce brut trebuie negociat ca sa ramana un anumit net.
 *
 * Nu are formula inchisa. Deducerea personala sare in trepte de 50 de lei si se
 * opreste brusc la plafon, iar rotunjirea la leu a fiecarei contributii face
 * functia sa creasca in scarite, nu lin. Cautam prin injumatatire pe intervalul
 * in care netul e sigur monoton, apoi urcam leu cu leu pana atingem tinta —
 * astfel raspunsul e cel mai mic brut care produce netul cerut, nu unul aproape
 * de el.
 */
export function brutDinNet(
  net: number,
  regim: Regim = REGIM_CURENT,
  optiuni: Omit<IntrareSalariu, 'brut'> = {},
): number {
  const tinta = Math.max(0, net);
  if (tinta === 0) return 0;

  const netLa = (brut: number) => calculeazaSalariu({ ...optiuni, brut }, regim).net;

  let jos = 0;
  let sus = Math.max(100, Math.ceil(tinta * 2.5));
  while (netLa(sus) < tinta) sus *= 2;

  while (sus - jos > 1) {
    const mij = Math.floor((jos + sus) / 2);
    if (netLa(mij) < tinta) jos = mij;
    else sus = mij;
  }
  return sus;
}

/**
 * Regimul in vigoare la o luna data. Pentru pagini care trebuie sa raspunda
 * „acum", nu „in anul X".
 */
export function regimLa(an: number, l: number): Regim {
  const r = luna(an, l);
  return REGIMURI.find((x) => r >= x.de) ?? REGIMURI[REGIMURI.length - 1];
}

/** Luna calendaristica din care se aplica un regim. */
export function inceputRegim(r: Regim): { an: number; luna: number } {
  return { an: Math.floor(r.de / 12), luna: (r.de % 12) + 1 };
}
