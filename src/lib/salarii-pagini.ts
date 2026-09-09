// Ce salarii primesc pagina proprie.
//
// Lista nu e „cat mai multe". Fiecare pagina trebuie sa raspunda la o intrebare
// pe care chiar o pune cineva, altfel e balast pe care Google il trateaza ca
// atare. Trei surse pentru valorile de mai jos:
//
// 1. Grila din o suta in o suta pana la 10.000. Asa isi rotunjeste lumea
//    salariul cand il cauta, si asa apare in sugestiile Google: „5000 brut",
//    „7000 brut". Peste 10.000 pasul se mareste, fiindca si intervalul dintre
//    doua salarii reale se mareste.
//
// 2. Pragurile legale. Salariul minim din fiecare regim recent nu cade pe grila,
//    dar e cel mai cautat salariu din tara.
//
// 3. Plafonul deducerii personale, unde raspunsul se schimba calitativ, nu doar
//    cantitativ.

/** Salariile minime din ultimii ani. Se cauta si dupa ce nu mai sunt in vigoare. */
export const MINIME = [2550, 3000, 3300, 3700, 4050, 4325];

export function valoriBrut(): number[] {
  const valori = new Set<number>();

  for (let v = 1000; v <= 10000; v += 100) valori.add(v);
  for (let v = 10500; v <= 20000; v += 500) valori.add(v);
  for (let v = 21000; v <= 30000; v += 1000) valori.add(v);
  for (const v of [32500, 35000, 40000, 45000, 50000]) valori.add(v);
  for (const v of MINIME) valori.add(v);
  // Plafonul deducerii in regimul curent: ultimul leu la care se mai acorda ceva.
  valori.add(6325);

  return [...valori].sort((a, b) => a - b);
}

/** Vecinii unei valori din lista, pentru navigarea intre pagini. */
export function vecini(brut: number): { anterior?: number; urmator?: number } {
  const toate = valoriBrut();
  const i = toate.indexOf(brut);
  return { anterior: toate[i - 1], urmator: toate[i + 1] };
}

/**
 * Cateva salarii apropiate, pentru legaturi laterale. Alegem la distante
 * crescatoare, ca lista sa acopere si vecinatatea imediata si ordinul de marime.
 */
export function inrudite(brut: number, cate = 6): number[] {
  const toate = valoriBrut().filter((v) => v !== brut);
  return toate
    .map((v) => ({ v, d: Math.abs(Math.log(v / brut)) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, cate)
    .map((x) => x.v)
    .sort((a, b) => a - b);
}
