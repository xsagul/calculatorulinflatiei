// Seria lunara, descarcabila. Un fisier care se deschide direct in Excel e
// motivul pentru care cineva pune un link catre tine: datele brute se citeaza,
// paginile se uita.
import type { APIRoute } from 'astro';
import date from '@/data/ipc-lunar.json';

export const GET: APIRoute = () => {
  const cap = 'an;luna;indice_lunar_total;indice_lunar_alimentare;indice_lunar_nealimentare;indice_lunar_servicii';
  const c = date.categorii as Record<string, { an: number; luna: number; indice: number }[]>;
  const randuri = (date.serie as { an: number; luna: number }[]).map((r, i) =>
    [r.an, r.luna,
      c['Total'][i].indice,
      c['Marfuri alimentare'][i].indice,
      c['Marfuri nealimentare'][i].indice,
      c['Servicii'][i].indice,
    ].join(';'));
  // BOM, ca Excel-ul romanesc sa nu strice diacriticele si separatorul.
  const csv = '﻿' + [cap, ...randuri].join('\r\n') + '\r\n';
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="ipc-lunar-romania.csv"',
    },
  });
};
