import { clear, h, icon } from './dom.js';
import { stateBadge } from './badges.js';
import { chargeState, monthStats, totalsByMonth } from '../lib/charges.js';
import { formatDateBR, monthLabel, shiftMonth, shortMonthLabel } from '../lib/dates.js';
import { formatMoney } from '../lib/messages.js';
import { listChargesRange, listMonthCharges } from '../lib/store.js';
import { toast } from './toast.js';

const CHART_MONTHS = 6;

function statCard({ label, value, hint, tone }) {
  const tones = { emerald: 'text-emerald-400', amber: 'text-amber-400', sky: 'text-sky-400' };
  return h(
    'div',
    { class: 'bg-gradient-to-b from-slate-900/70 to-slate-950 border border-slate-800/80 rounded-2xl p-3.5 sm:p-5' },
    h('p', { class: 'text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2' }, label),
    h('p', { class: `text-lg sm:text-2xl font-bold font-mono tracking-tight ${tones[tone]}` }, value),
    h('p', { class: 'text-[11px] text-slate-500 mt-1' }, hint)
  );
}

// Aba "Histórico": navegação por mês, estatísticas, gráfico e previsão do próximo mês.
export function createHistory() {
  let ctx = { today: '', currentMonth: '', forecast: { count: 0, sum: 0 } };
  let month = '';
  let token = 0; // descarta respostas antigas quando o usuário troca de mês rápido

  const body = h('div', { class: 'space-y-5' });
  const el = h('section', { id: 'panel-historico', class: 'flex-1', hidden: true }, body);

  async function load() {
    const mine = ++token;
    clear(body);
    body.append(h('div', { class: 'flex justify-center py-16' }, h('div', { class: 'spinner', role: 'status', 'aria-label': 'Carregando' })));
    try {
      const months = Array.from({ length: CHART_MONTHS }, (_, i) => shiftMonth(ctx.currentMonth, i - (CHART_MONTHS - 1)));
      const [charges, range] = await Promise.all([listMonthCharges(month), listChargesRange(months[0], ctx.currentMonth)]);
      if (mine !== token) return;
      draw(charges, totalsByMonth(range, months));
    } catch (err) {
      if (mine !== token) return;
      clear(body);
      body.append(h('p', { class: 'text-center text-sm text-rose-400 py-12' }, 'Não foi possível carregar o histórico.'));
      toast(err.message, 'error');
    }
  }

  function draw(charges, totals) {
    clear(body);
    const stats = monthStats(charges, ctx.today);

    const nav = h(
      'div',
      { class: 'flex items-center justify-between bg-slate-900/60 border border-slate-800/80 rounded-2xl px-3 py-2' },
      h('button', { type: 'button', 'aria-label': 'Mês anterior', class: 'p-2.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition', onclick: () => go(-1) }, icon('fa-solid fa-chevron-left')),
      h('h2', { class: 'text-sm font-bold text-white capitalize' }, monthLabel(month)),
      h('button', { type: 'button', 'aria-label': 'Próximo mês', disabled: month >= ctx.currentMonth, class: 'p-2.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition disabled:opacity-30 disabled:pointer-events-none', onclick: () => go(1) }, icon('fa-solid fa-chevron-right'))
    );

    const cards = h(
      'div',
      { class: 'grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4' },
      statCard({ label: 'Recebido', value: formatMoney(stats.paidSum), hint: `${stats.paid} de ${stats.total} cobranças`, tone: 'emerald' }),
      statCard({ label: 'Pendente', value: formatMoney(stats.pendingSum), hint: stats.overdue ? `${formatMoney(stats.overdueSum)} em atraso` : 'Nada em atraso', tone: 'amber' }),
      statCard({ label: 'Taxa de pagamento', value: `${stats.paidRate}%`, hint: stats.total ? 'das cobranças do mês' : 'Sem cobranças neste mês', tone: 'sky' })
    );

    body.append(nav, cards, chart(totals), forecast(), listCharges(charges));
  }

  function chart(totals) {
    const max = Math.max(...totals.map((t) => t.totalSum), 1);
    const bars = totals.map((t) => {
      const selected = t.month === month;
      const paidH = Math.round((t.paidSum / max) * 100);
      const totalH = Math.round((t.totalSum / max) * 100);
      return h(
        'button',
        {
          type: 'button',
          'aria-label': `${monthLabel(t.month)}: recebido ${formatMoney(t.paidSum)} de ${formatMoney(t.totalSum)}`,
          'aria-pressed': String(selected),
          class: `group flex-1 flex flex-col items-center gap-2 min-w-0 rounded-xl p-1 transition ${selected ? 'bg-slate-800/50' : 'hover:bg-slate-800/30'}`,
          onclick: () => {
            month = t.month;
            load();
          },
        },
        h('span', { class: 'text-[10px] font-mono text-slate-400 truncate max-w-full' }, t.paidSum ? formatMoney(t.paidSum).replace(/\s/g, '') : '–'),
        h(
          'div',
          { class: 'relative w-full max-w-9 h-28 flex items-end' },
          h('div', { class: 'absolute bottom-0 inset-x-0 rounded-lg bg-slate-800/80 bar-fill', style: `height:${Math.max(totalH, t.totalSum ? 4 : 0)}%` }),
          h('div', { class: 'absolute bottom-0 inset-x-0 rounded-lg bg-gradient-to-t from-emerald-600 to-emerald-400 bar-fill', style: `height:${Math.max(paidH, t.paidSum ? 4 : 0)}%` })
        ),
        h('span', { class: `text-[11px] font-semibold capitalize ${selected ? 'text-emerald-400' : 'text-slate-500'}` }, shortMonthLabel(t.month))
      );
    });
    return h(
      'div',
      { class: 'bg-slate-900/40 border border-slate-800/80 rounded-3xl p-4 sm:p-5' },
      h('div', { class: 'flex items-center justify-between mb-3' },
        h('h3', { class: 'text-[11px] font-semibold uppercase tracking-wider text-slate-400' }, `Últimos ${CHART_MONTHS} meses`),
        h('div', { class: 'flex items-center gap-3 text-[10px] text-slate-500' },
          h('span', { class: 'flex items-center gap-1.5' }, h('i', { class: 'w-2 h-2 rounded-sm bg-emerald-400 inline-block' }), 'Recebido'),
          h('span', { class: 'flex items-center gap-1.5' }, h('i', { class: 'w-2 h-2 rounded-sm bg-slate-700 inline-block' }), 'Previsto'))),
      h('div', { class: 'flex items-end gap-1 sm:gap-2' }, bars)
    );
  }

  function forecast() {
    const next = shiftMonth(ctx.currentMonth, 1);
    return h(
      'div',
      { class: 'flex items-center gap-4 bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-2xl p-4' },
      h('div', { class: 'w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0' }, icon('fa-solid fa-chart-line')),
      h('div', {},
        h('p', { class: 'text-[11px] font-semibold uppercase tracking-wider text-slate-400' }, `Previsão para ${monthLabel(next)}`),
        h('p', { class: 'text-base font-bold text-emerald-400 font-mono' }, formatMoney(ctx.forecast.sum)),
        h('p', { class: 'text-[11px] text-slate-500' }, `${ctx.forecast.count} cliente${ctx.forecast.count === 1 ? '' : 's'} ativo${ctx.forecast.count === 1 ? '' : 's'}`))
    );
  }

  function listCharges(charges) {
    const box = h('div', { class: 'bg-slate-900/40 border border-slate-800/80 rounded-3xl overflow-hidden' });
    if (!charges.length) {
      box.append(h('p', { class: 'p-10 text-center text-sm text-slate-500' }, 'Nenhuma cobrança neste mês.'));
      return box;
    }
    const rows = h('div', { class: 'divide-y divide-slate-800/50' });
    charges.forEach((c) => {
      const state = chargeState(c, ctx.today);
      const detail =
        c.status === 'pago' && c.paid_at
          ? `Pago em ${new Date(c.paid_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })}`
          : `Vence em ${formatDateBR(c.due_date)}`;
      rows.append(
        h('div', { class: 'p-4 flex items-center justify-between gap-3' },
          h('div', { class: 'min-w-0' },
            h('div', { class: 'flex items-center gap-2 flex-wrap mb-0.5' }, h('p', { class: 'text-sm font-semibold text-white truncate' }, c.clients?.name || 'Cliente'), stateBadge(state, c, ctx.today, month)),
            h('p', { class: 'text-[11px] text-slate-500' }, detail)),
          h('span', { class: 'text-sm font-semibold text-slate-200 font-mono shrink-0' }, formatMoney(c.amount)))
      );
    });
    box.append(rows);
    return box;
  }

  function go(delta) {
    const next = shiftMonth(month, delta);
    if (next > ctx.currentMonth) return;
    month = next;
    load();
  }

  return {
    el,
    // Chamada pela tela principal sempre que a aba abre ou os dados mudam.
    refresh(next) {
      ctx = next;
      if (!month || month > ctx.currentMonth) month = ctx.currentMonth;
      return load();
    },
  };
}
