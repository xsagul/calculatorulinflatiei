// Testele calculului salarial. Aceeasi regula ca la inflatie: cifra gresita nu e
// un bug de interfata, e produsul stricat. In plus, aici greseala e verificabila
// de oricine are un fluturas de salariu in mana, deci se si vede.
import assert from 'node:assert/strict';
import {
  calculeazaSalariu, deducerePersonala, brutDinNet, regimDupaCheie, regimLa,
  REGIM_CURENT, REGIMURI,
} from '../src/lib/salariu.ts';

const h1 = regimDupaCheie('2026-h1'); // salariul minim 4.050, neimpozabil 300
const h2 = regimDupaCheie('2026-h2'); // salariul minim 4.325, neimpozabil 200

// ─── Regimurile ─────────────────────────────────────────────────────────────
assert.equal(REGIM_CURENT.cheie, '2026-h2', 'implicit trebuie sa fie regimul curent');
assert.equal(h2.salariulMinim, 4325);
assert.equal(h1.salariulMinim, 4050);
assert.equal(regimLa(2026, 6).cheie, '2026-h1', 'iunie 2026 e inca pe minimul vechi');
assert.equal(regimLa(2026, 7).cheie, '2026-h2', 'iulie 2026 trece pe 4.325');
assert.equal(regimLa(2025, 3).cheie, '2025');
// Regimurile trebuie sa fie in ordine descrescatoare, altfel regimLa alege gresit.
for (let i = 1; i < REGIMURI.length; i++) {
  assert.ok(REGIMURI[i - 1].de > REGIMURI[i].de, 'regimurile stau de la cel mai nou la cel mai vechi');
}

// ─── Deducerea personala: scara, punct cu punct ─────────────────────────────
// Cele patru valori de mai jos sunt luate din tabelul publicat pentru iulie–
// decembrie 2026 si reproduse aici de formula. Daca formula si tabelul nu mai
// spun acelasi lucru, ori s-a schimbat legea, ori am gresit noi.
assert.equal(deducerePersonala(4325, h2).deBaza, 865, 'la fix salariul minim, 20% din el');
assert.equal(deducerePersonala(4500, h2).deBaza, 779, '175 lei peste minim: patru transe, 18%');
assert.equal(deducerePersonala(5000, h2).deBaza, 562, '13%');
assert.equal(deducerePersonala(5500, h2).deBaza, 346, '8%');
assert.equal(deducerePersonala(6000, h2).deBaza, 130, '3%');

// Persoanele in intretinere ridica procentul de pornire cu cinci puncte fiecare.
assert.equal(deducerePersonala(4325, h2, { persoane: 4 }).deBaza, 1946, '45% din minim');
assert.equal(deducerePersonala(4500, h2, { persoane: 1 }).deBaza, 995, '23%');
assert.equal(deducerePersonala(5000, h2, { persoane: 4 }).deBaza, 1644, '38%');
assert.equal(
  deducerePersonala(4325, h2, { persoane: 9 }).deBaza,
  deducerePersonala(4325, h2, { persoane: 4 }).deBaza,
  'peste 4 persoane scara nu mai urca',
);

// Plafonul: la minim + 2.000 fix, cine n-are pe nimeni in intretinere ajunge la
// zero, dar cine are inca mai primeste. Un leu mai sus, nimeni nu mai primeste.
assert.equal(deducerePersonala(6325, h2).deBaza, 0);
assert.equal(deducerePersonala(6325, h2, { persoane: 1 }).deBaza, 216);
assert.equal(deducerePersonala(6326, h2, { persoane: 4 }).total, 0, 'peste plafon se stinge tot');
assert.equal(deducerePersonala(6326, h2, { sub26: true }).total, 0, 'inclusiv suplimentarele');

// Suplimentarele se adauga peste cea de baza, nu o inlocuiesc.
const tanar = deducerePersonala(4325, h2, { sub26: true, copii: 2 });
assert.equal(tanar.sub26, 649, '15% din salariul minim');
assert.equal(tanar.copii, 200, 'cate 100 lei de copil scolarizat');
assert.equal(tanar.total, 865 + 649 + 200);

// ─── Ancora: salariul minim net ─────────────────────────────────────────────
// Doua cifre publicate peste tot in presa si de firmele de payroll. Daca nu ies
// exact, modelul e gresit undeva, si atunci e gresit peste tot.
const minim2026h1 = calculeazaSalariu({ brut: 4050 }, h1);
assert.equal(minim2026h1.neimpozabil, 300, 'facilitatea se aplica la fix salariul minim');
assert.equal(minim2026h1.bazaContributii, 3750);
assert.equal(minim2026h1.cas, 938);
assert.equal(minim2026h1.cass, 375);
assert.equal(minim2026h1.deducere.deBaza, 810);
assert.equal(minim2026h1.impozit, 163);
assert.equal(minim2026h1.net, 2574, 'salariul minim net pana in iunie 2026');

const minim2026h2 = calculeazaSalariu({ brut: 4325 }, h2);
assert.equal(minim2026h2.neimpozabil, 200);
assert.equal(minim2026h2.bazaContributii, 4125);
assert.equal(minim2026h2.cas, 1031);
assert.equal(minim2026h2.cass, 413, 'cifra citata public pentru CASS la minimul din iulie 2026');
assert.equal(minim2026h2.impozit, 182);
assert.equal(minim2026h2.net, 2699, 'salariul minim net din iulie 2026');

// Cresterea minimului chiar mareste netul — pare evident, dar in 2026 suma
// neimpozabila a scazut in acelasi timp, deci merita verificat ca nu se anuleaza.
assert.ok(minim2026h2.net > minim2026h1.net, 'minimul din iulie lasa mai mult in mana');

// ─── Facilitatea se aplica doar la minim ────────────────────────────────────
assert.equal(calculeazaSalariu({ brut: 4326 }, h2).neimpozabil, 0, 'un leu peste minim o pierde');
assert.equal(calculeazaSalariu({ brut: 4325 }, h1).neimpozabil, 0, 'nu si in regimul vechi');
// Un leu in plus la brut poate insemna mai putin in mana, fiindca se pierde
// facilitatea. E contraintuitiv, e real, si e exact genul de lucru pe care un
// calculator trebuie sa il arate corect.
assert.ok(
  calculeazaSalariu({ brut: 4326 }, h2).net < minim2026h2.net,
  'pierderea facilitatii taie netul chiar daca brutul creste',
);
// Cu marcaj explicit se poate cere si invers, pentru cine are spor peste minim.
assert.equal(calculeazaSalariu({ brut: 4425, laSalariulMinim: true }, h2).neimpozabil, 200);

// ─── Un salariu obisnuit, verificat pe bucati ───────────────────────────────
const mediu = calculeazaSalariu({ brut: 5000 }, h2);
assert.equal(mediu.neimpozabil, 0);
assert.equal(mediu.cas, 1250);
assert.equal(mediu.cass, 500);
assert.equal(mediu.deducere.total, 562);
assert.equal(mediu.bazaImpozit, 5000 - 1250 - 500 - 562);
assert.equal(mediu.impozit, 269);
assert.equal(mediu.net, 2981);
assert.equal(mediu.cam, 113, '2,25% din brut');
assert.equal(mediu.costAngajator, 5113);
assert.equal(mediu.totalTaxe, 1250 + 500 + 269 + 113);
// Suma partilor trebuie sa dea intregul, altfel undeva se pierd bani.
assert.equal(mediu.net + mediu.totalTaxe, mediu.costAngajator);

// ─── Salarii mari: fara deducere, proportii stabile ─────────────────────────
const mare = calculeazaSalariu({ brut: 20000 }, h2);
assert.equal(mare.deducere.total, 0);
assert.equal(mare.cas, 5000);
assert.equal(mare.cass, 2000);
assert.equal(mare.impozit, 1300, '10% din 20.000 - 5.000 - 2.000');
assert.equal(mare.net, 11700);
// Peste plafonul deducerii, netul e exact 58,5% din brut, orice ar fi brutul.
for (const brut of [7000, 12345, 50000]) {
  const r = calculeazaSalariu({ brut }, h2);
  assert.ok(Math.abs(r.net / brut - 0.585) < 0.0005, `netul e 58,5% din ${brut}`);
}

// ─── Tichetele de masa ──────────────────────────────────────────────────────
// Intra in CASS si in impozit, nu si in CAS, nu si in CAM. Deci costul
// angajatorului creste exact cu valoarea lor, iar salariatul primeste valoarea
// intreaga in tichete, dar plateste taxele din bani.
const cuTichete = calculeazaSalariu({ brut: 5000, tichete: 800 }, h2);
assert.equal(cuTichete.cas, mediu.cas, 'tichetele nu intra in CAS');
assert.equal(cuTichete.cam, mediu.cam, 'nici in CAM');
assert.equal(cuTichete.cassTichete, 80);
assert.equal(cuTichete.costAngajator, mediu.costAngajator + 800);
assert.ok(cuTichete.net < mediu.net, 'taxele pe tichete se retin din bani');
assert.ok(cuTichete.totalPrimit > mediu.totalPrimit, 'dar per total ramane mai mult');
assert.equal(cuTichete.net + cuTichete.totalTaxe + 800, cuTichete.costAngajator);

// ─── Drumul invers ──────────────────────────────────────────────────────────
// Proprietatea care conteaza: brutul returnat chiar produce netul cerut, si e
// cel mai mic care il produce.
for (const net of [2699, 3000, 3500, 5000, 11700]) {
  const brut = brutDinNet(net, h2);
  assert.ok(calculeazaSalariu({ brut }, h2).net >= net, `${brut} brut da cel putin ${net} net`);
  assert.ok(
    brut === 0 || calculeazaSalariu({ brut: brut - 1 }, h2).net < net,
    `${brut} e cel mai mic brut care da ${net} net`,
  );
}
assert.equal(brutDinNet(11700, h2), 20000, 'drumul invers al unui caz cunoscut');
assert.equal(brutDinNet(0, h2), 0);

// ─── Pragurile in care un leu in plus te lasa cu mai putin ──────────────────
//
// Netul NU creste peste tot odata cu brutul, si asta nu e o eroare de model, e
// legea. Deducerea personala scade in trepte de 50 de lei, iar o treapta
// inseamna 0,5% din salariul minim, adica 21,6 lei mai putina deducere pentru un
// leu in plus la brut. Impozitul creste cu 2,16 lei, brutul cu 1: raman cu ~1,5
// lei mai putin in mana.
//
// Fixam numarul exact — 40, cate transe de 50 de lei incap in cei 2.000 de lei
// de scara — fiindca daca apare a 41-a, ceva s-a stricat in formula.
const praguri: number[] = [];
for (let brut = 1000; brut <= 12000; brut += 1) {
  if (calculeazaSalariu({ brut }, h2).net < calculeazaSalariu({ brut: brut - 1 }, h2).net) {
    praguri.push(brut);
  }
}
assert.equal(praguri.length, 40, 'cate o scadere pentru fiecare transa a deducerii');
assert.equal(praguri[0], h2.salariulMinim + 1, 'prima e chiar la un leu peste salariul minim');
assert.equal(praguri[39], h2.salariulMinim + 1951, 'ultima, inainte ca deducerea sa se stinga');
// Prima e cea mai adanca: acolo se pierde si suma neimpozabila, nu doar o transa.
const caderePrima = minim2026h2.net - calculeazaSalariu({ brut: praguri[0] }, h2).net;
const catereUrmatoare = calculeazaSalariu({ brut: praguri[1] - 1 }, h2).net
  - calculeazaSalariu({ brut: praguri[1] }, h2).net;
assert.ok(caderePrima > catereUrmatoare * 10, 'pragul de la salariul minim e de alt ordin');
// Dincolo de scara deducerii nu mai exista praguri: netul nu scade niciodata.
// Poate insa sa stea pe loc un leu-doi, fiindca fiecare contributie se rotunjeste
// la leu si pasii nu cad la aceleasi valori ale brutului.
for (let brut = 6400; brut <= 40000; brut += 1) {
  assert.ok(
    calculeazaSalariu({ brut }, h2).net >= calculeazaSalariu({ brut: brut - 1 }, h2).net,
    `peste plafonul deducerii netul nu mai scade (${brut})`,
  );
}

console.log('salariu: toate testele trec');
