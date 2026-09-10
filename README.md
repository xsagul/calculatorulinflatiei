# Indicele prețurilor de consum din România, serie lunară deschisă

Seria lunară completă a indicelui prețurilor de consum publicat de Institutul
Național de Statistică — **ianuarie 1991 până astăzi, 400+ de luni** — curățată,
verificată prin teste și republicată în CSV și JSON, împreună cu un calculator
al puterii de cumpărare construit peste ea.

Site: **[calculatorulinflatiei.ro](https://calculatorulinflatiei.ro)**

## Datele

| | |
|---|---|
| Sursă | Institutul Național de Statistică, TEMPO-Online, matricea `IPC102A` |
| Acoperire | ianuarie 1991 – prezent, lunar |
| Unitate | procente față de luna precedentă (100 = prețuri neschimbate) |
| Categorii | total, mărfuri alimentare, mărfuri nealimentare, servicii |
| Licență date | [OGL-ROU-1.0](https://data.gov.ro/base/images/logoinst/OGL-ROU-1.0.pdf) |

Descărcare directă, fără cont și fără cheie:

- CSV — <https://calculatorulinflatiei.ro/ipc-lunar.csv>
- JSON — <https://calculatorulinflatiei.ro/ipc-lunar.json>
- În depozit — [`src/data/ipc-lunar.json`](src/data/ipc-lunar.json)

`npm run date:ipc` reface fișierul din TEMPO-Online.

## Trei lucruri pe care le greșesc majoritatea calculatoarelor de inflație

**1. Denominarea din 2005.** Prin Legea 348/2004, de la 1 iulie 2005 zece mii de
lei vechi (ROL) au devenit un leu nou (RON). Indicii de preț **nu** conțin
tăierea, fiindcă e o schimbare de unitate, nu de preț. Cine înlănțuie indicii
peste granița din 2005 fără să împartă la 10.000 răspunde greșit de zece mii de
ori pentru orice sumă anterioară.

**2. Lanțul lunar, nu cel anual.** „Ianuarie 2020" și „decembrie 2020" sunt două
întrebări diferite. Din indici anuali nu se poate coborî la lună, iar diferența
într-un an cu inflație mare e de câteva procente.

**3. Extrapolarea.** Seria începe în ianuarie 1991, de unde o publică INS.
Pentru orice dată anterioară răspunsul corect este că nu știm, nu o estimare care
arată la fel de precisă ca o cifră reală.

Fiecare dintre cele trei are teste care cad dacă se strică: `npm test`.

## Decalajul TEMPO

INS publică indicele în comunicatul de presă lunar, în jurul datei de 12, dar îl
încarcă în TEMPO-Online mai târziu — uneori cu două luni întârziere. Lunile
apărute în comunicat dar încă absente din TEMPO stau separat, în
[`src/data/ipc-completare.json`](src/data/ipc-completare.json), cu proveniența
lor. Fiecare e verificată de teste: din lanțul propriu plus indicele adăugat
trebuie să iasă exact rata anuală și cea de la începutul anului așa cum le-a
publicat INS. Când luna ajunge în TEMPO, versiunea din completare se ignoră
singură.

## API public

```
GET https://calculatorulinflatiei.ro/api/v1/calc?year=2017&sum=4000
```

```json
{ "result": { "currentValue": 2368.89, "adjustedValue": 6754.22, "netDevaluation": "40.78" } }
```

Fără cheie, fără limită declarată, fără garanție de disponibilitate. Pentru
volume mari, descarcă seria și calculează local — sunt patru sute de numere.

## Calculatorul, pe site-ul tău

Un iframe, fără cont și fără cookie-uri:

```html
<iframe src="https://calculatorulinflatiei.ro/widget/"
        title="Calculator inflație"
        width="100%" height="210"
        style="border:1px solid #d8dedc;border-radius:6px"
        loading="lazy"></iframe>
```

Detalii: <https://calculatorulinflatiei.ro/incorporeaza/>

## Cum e construit

Astro, static, fără JavaScript trimis implicit către browser. Calculul stă în
`src/lib/` — inflație, salariu, TVA — și e acoperit de teste care verifică
rezultatele față de cifre publicate independent, nu față de ele însele.

```
npm install
npm test            # testele calculului
npm run build       # site static in dist/
npm run date:ipc    # reimprospateaza seria din TEMPO-Online
```

## Licență

Datele INS se reutilizează conform OGL-ROU-1.0, cu indicarea sursei. Codul din
acest depozit e al proiectului; dacă îți e util, ia-l.
