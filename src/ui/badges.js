import { h } from './dom.js';
import { dayOf, diffDays, shortMonthLabel } from '../lib/dates.js';

const BASE = 'text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border whitespace-nowrap';

// Selo de estado da cobrança. `today` e `currentMonth` permitem mostrar o mês de cobranças antigas.
export function stateBadge(state, charge, today, currentMonth) {
  const old = charge.reference_month !== currentMonth ? ` · ${shortMonthLabel(charge.reference_month)}` : '';
  switch (state) {
    case 'pago':
      return h('span', { class: `${BASE} font-bold bg-emerald-500/10 text-emerald-400 border-emerald-500/20` }, 'Pago');
    case 'atrasado':
      return h('span', { class: `${BASE} font-bold bg-rose-500/10 text-rose-400 border-rose-500/20` }, `Atrasado${old}`);
    case 'hoje':
      return h('span', { class: `${BASE} font-bold bg-amber-500/10 text-amber-400 border-amber-500/20` }, 'Vence Hoje');
    case 'breve': {
      const d = diffDays(today, charge.due_date);
      return h('span', { class: `${BASE} font-semibold bg-sky-500/10 text-sky-400 border-sky-500/20` }, d === 1 ? 'Amanhã' : `Em ${d} dias`);
    }
    default:
      return h('span', { class: `${BASE} font-semibold bg-slate-800 text-slate-400 border-transparent` }, `Dia ${dayOf(charge.due_date)}`);
  }
}
