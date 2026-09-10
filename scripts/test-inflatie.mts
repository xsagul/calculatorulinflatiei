// Testele calculului. E singurul lucru pe care site-ul il vinde, deci greseala
// aici nu e un bug de interfata, e produsul stricat.
import assert from 'node:assert/strict';
import {
  converteste, factorPreturi, moneda, inflatieAnuala, etichetaLuna,
  PRIMA_LUNA, ULTIMA_LUNA, FACTOR_DENOMINARE, aniDisponibili,
} from '../src/lib/inflatie.ts';

// ─── Seria ──────────────────────────────────────────────────────────────────
// Valoarea e fixata deliberat: daca INS revizuieste seria sau parserul se strica,
// testul cade in loc sa publicam tacut alte cifre.
assert.deepEqual(PRIMA_LUNA, { an: 1991, luna: 1, indice: 114.8 }, 'seria INS incepe in ianuarie 1991');
assert.ok(ULTIMA_LUNA.an >= 2026, 'seria trebuie sa ajunga in 2026');
assert.equal(aniDisponibili().length, ULTIMA_LUNA.an - 1991 + 1);

// ─── Moneda si granita denominarii ──────────────────────────────────────────
assert.equal(moneda({ an: 2005, luna: 6 }), 'ROL', 'iunie 2005 e inca leu vechi');
assert.equal(moneda({ an: 2005, luna: 7 }), 'RON', 'iulie 2005 e deja leu nou');
assert.equal(moneda({ an: 1991, luna: 1 }), 'ROL');
assert.equal(moneda(ULTIMA_LUNA), 'RON');

// ─── Proprietatile factorului ───────────────────────────────────────────────
const a = { an: 2000, luna: 3 }, b = { an: 2019, luna: 11 };
assert.equal(factorPreturi(a, a), 1, 'aceeasi luna nu schimba nimic');
assert.ok(Math.abs(factorPreturi(a, b) * factorPreturi(b, a) - 1) < 1e-12, 'drumul invers e inversul');
const mijloc = { an: 2010, luna: 5 };
assert.ok(
  Math.abs(factorPreturi(a, mijloc) * factorPreturi(mijloc, b) - factorPreturi(a, b)) < 1e-9,
  'lantul se compune: A->M->B da acelasi rezultat ca A->B',
);
assert.ok(factorPreturi(a, b) > 1, 'preturile au crescut intre 2000 si 2019');

// ─── Denominarea, adica bugul din site-ul vechi ─────────────────────────────
const vechi = converteste(100, { an: 1991, luna: 1 }, ULTIMA_LUNA);
assert.equal(vechi.monedaDe, 'ROL');
assert.equal(vechi.monedaLa, 'RON');
assert.ok(vechi.denominareAplicata, 'trecerea peste iulie 2005 taie patru zerouri');
assert.ok(vechi.echivalent > 10 && vechi.echivalent < 200,
  `100 lei vechi din 1991 trebuie sa dea zeci de lei noi, nu ${vechi.echivalent}`);
// Fara denominare ar iesi exact de zece mii de ori mai mult. Asta publica azi
// site-ul vechi, si asta nu are voie sa reapara.
assert.ok(vechi.echivalent * FACTOR_DENOMINARE > 100_000);

const recent = converteste(100, { an: 2010, luna: 1 }, ULTIMA_LUNA);
assert.equal(recent.denominareAplicata, false, 'dupa 2005 nu se mai taie nimic');
assert.equal(recent.monedaDe, 'RON');

// Doua luni de aceeasi parte a granitei nu declanseaza taierea.
assert.equal(converteste(100, { an: 1995, luna: 1 }, { an: 2000, luna: 1 }).denominareAplicata, false);

// Interfata lasa acum ambele capete libere, deci si drumul inapoi peste granita.
// 1.000 de lei de azi, exprimati in lei vechi din 1995: sute de mii. Taierea
// inmulteste cu 10.000, cresterea preturilor din 1995 incoace imparte cu ~50.
const inapoi = converteste(1000, { an: 2020, luna: 1 }, { an: 1995, luna: 1 });
assert.equal(inapoi.monedaLa, 'ROL');
assert.ok(inapoi.denominareAplicata, 'si drumul invers trece granita');
assert.ok(inapoi.echivalent > 100_000 && inapoi.echivalent < 500_000,
  `asteptam sute de mii de lei vechi, am primit ${inapoi.echivalent}`);
// Dus-intors readuce exact suma initiala.
const dus = converteste(1000, { an: 2020, luna: 1 }, { an: 1995, luna: 1 });
const intors = converteste(dus.echivalent, { an: 1995, luna: 1 }, { an: 2020, luna: 1 });
assert.ok(Math.abs(intors.echivalent - 1000) < 1e-6, 'dus-intors pierde suma');

// ─── Coerenta rezultatului ──────────────────────────────────────────────────
const r = converteste(1000, { an: 2015, luna: 6 }, ULTIMA_LUNA);
assert.ok(Math.abs(r.echivalent / 1000 - r.factorPreturi) < 1e-9, 'echivalentul urmeaza factorul');
assert.ok(Math.abs(r.putereRamasa - 100 / r.factorPreturi) < 1e-9);
assert.ok(Math.abs(r.inflatieCumulata - (r.factorPreturi - 1) * 100) < 1e-9);
assert.ok(r.rataMedieAnuala !== null && r.rataMedieAnuala > 0 && r.rataMedieAnuala < 20,
  'rata medie anuala pe un deceniu recent e de o cifra');

// Sub un an nu se raporteaza o rata anualizata: ar fi o extrapolare.
assert.equal(converteste(100, { an: 2026, luna: 1 }, { an: 2026, luna: 6 }).rataMedieAnuala, null);

// ─── Refuzul de a inventa ───────────────────────────────────────────────────
assert.throws(() => converteste(100, { an: 1970, luna: 1 }, ULTIMA_LUNA), /1991/,
  'inainte de seria INS raspunsul e ca nu stim, nu o estimare');
assert.throws(() => converteste(100, { an: 2030, luna: 1 }, ULTIMA_LUNA), /2026|se opreste/);

// ─── Inflatia anuala, verificata pe un an cunoscut ──────────────────────────
const i2023 = inflatieAnuala(2023, 12);
assert.ok(i2023 !== null && i2023 > 4 && i2023 < 8,
  `inflatia dec.2022 -> dec.2023 a fost de ordinul a 6-7%, am calculat ${i2023}`);
const i1993 = inflatieAnuala(1993, 12);
assert.ok(i1993 !== null && i1993 > 200, `1993 a fost an de hiperinflatie, am calculat ${i1993}`);

console.log(`OK: seria ${etichetaLuna(PRIMA_LUNA)} – ${etichetaLuna(ULTIMA_LUNA)}, denominare, compunerea lantului, simetrie si refuzul extrapolarii.`);

// ─── Lunile venite din comunicatul INS, nu din TEMPO ────────────────────────
//
// Sunt singurele cifre din site care nu vin dintr-o descarcare automata, deci
// singurele care pot fi gresite prin copiere. Testul le reconstruieste: din
// lantul propriu plus indicele adaugat trebuie sa iasa exact rata anuala si cea
// de la inceputul anului asa cum le-a publicat INS in acelasi comunicat.
//
// Doua cifre independente care se potrivesc amandoua inseamna ca indicele e
// bun. Daca cineva scrie 100,85 in loc de 100,58, testul cade aici, nu ajunge
// pe pagina principala.
import completare from '../src/data/ipc-completare.json' with { type: 'json' };
import { LUNI_DIN_COMUNICAT, dinComunicat, lunileAnului } from '../src/lib/inflatie.ts';

for (const luna of completare.luni as {
  an: number; luna: number; indice: number;
  verificare: { rataAnuala: number; deLaInceputulAnului: number; toleranta: number };
}[]) {
  // Doar lunile care chiar sunt folosite; cele ajunse intre timp in TEMPO nu.
  if (!dinComunicat({ an: luna.an, luna: luna.luna })) continue;
  const { rataAnuala, deLaInceputulAnului, toleranta } = luna.verificare;
  const eticheta = `${luna.luna}/${luna.an}`;

  const anuala = inflatieAnuala(luna.an, luna.luna);
  assert.ok(anuala !== null, `${eticheta}: rata anuala trebuie sa fie calculabila`);
  assert.ok(
    Math.abs(anuala! - rataAnuala) <= toleranta,
    `${eticheta}: din lant iese ${anuala!.toFixed(2)}%, INS a publicat ${rataAnuala}%`,
  );

  const ytd = (factorPreturi({ an: luna.an - 1, luna: 12 }, { an: luna.an, luna: luna.luna }) - 1) * 100;
  assert.ok(
    Math.abs(ytd - deLaInceputulAnului) <= toleranta,
    `${eticheta}: de la inceputul anului iese ${ytd.toFixed(2)}%, INS a publicat ${deLaInceputulAnului}%`,
  );
}

// Unificarea celor doua surse nu are voie sa rupa lantul: fiecare an trebuie sa
// aiba exact lunile pe care le poate avea, o singura data fiecare. O luna care
// lipseste ar face gresite, tacut, toate conversiile care o traverseaza; una
// duplicata ar aplica indicele de doua ori.
for (let an = PRIMA_LUNA.an; an <= ULTIMA_LUNA.an; an++) {
  const luni = lunileAnului(an).map((l) => l.luna);
  const asteptate = an === ULTIMA_LUNA.an ? ULTIMA_LUNA.luna : 12;
  const primaDinAn = an === PRIMA_LUNA.an ? PRIMA_LUNA.luna : 1;
  assert.deepEqual(
    luni,
    Array.from({ length: asteptate - primaDinAn + 1 }, (_, i) => primaDinAn + i),
    `anul ${an} trebuie sa aiba lunile ${primaDinAn}-${asteptate}, consecutive si fara dubluri`,
  );
}
assert.ok(LUNI_DIN_COMUNICAT.length <= 3,
  'daca TEMPO ramane in urma cu peste trei luni, s-a schimbat ceva la sursa si merita verificat manual');

console.log(
  LUNI_DIN_COMUNICAT.length
    ? `completare: ${LUNI_DIN_COMUNICAT.length} luna/luni din comunicat, verificate fata de cifrele INS`
    : 'completare: TEMPO e la zi, nu se adauga nimic',
);
