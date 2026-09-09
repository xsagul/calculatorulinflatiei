# calculatorulinflatiei.ro

Calculator al puterii de cumpărare a leului, pe indicele prețurilor de consum
publicat de Institutul Național de Statistică.

## Ce îl face diferit

- **Lanț lunar, nu anual.** „Ianuarie 2020" și „decembrie 2020" sunt două
  întrebări diferite. Din indici anuali nu se poate coborî la lună.
- **Denominarea din 2005 se aplică.** 10.000 lei vechi au devenit 1 leu nou.
  Indicii de preț nu conțin tăierea, pentru că e o schimbare de unitate.
  Calculatorul precedent al acestui domeniu o ignora, deci răspundea greșit de
  zece mii de ori pentru orice an dinainte de iulie 2005.
- **Nu extrapolăm.** Seria începe în ianuarie 1991, de unde o publică INS.
  Înainte de asta răspunsul e că nu știm.

## Comenzi

    npm run date:ipc   # descarcă seria din TEMPO-Online (INS)
    npm test           # testele calculului
    npm run build      # site static în dist/
    npm run preview    # servește dist/

## Date

`src/data/ipc-lunar.json` — matricea IPC102A, indici lunari față de luna
precedentă, pe total și pe trei categorii. Sursa și licența (OGL-ROU-1.0) sunt
scrise în fișier. Se republică la `/ipc-lunar.csv` și `/ipc-lunar.json`.

INS publică indicele lunii precedente în jurul datei de 12; TEMPO-Online e
actualizat mai târziu decât comunicatul de presă.
