// Aceleasi date, pentru cine le consuma dintr-un program.
import type { APIRoute } from 'astro';
import date from '@/data/ipc-lunar.json';

export const GET: APIRoute = () =>
  new Response(JSON.stringify(date, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
