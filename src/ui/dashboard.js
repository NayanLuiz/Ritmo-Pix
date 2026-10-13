import { append, clear, h, icon } from './dom.js';
import { stateBadge } from './badges.js';
import { chargeState, lastChargeMessage, summarize } from '../lib/charges.js';
import { dayOf, formatDateBR, formatDateTimeBR } from '../lib/dates.js';
import { formatMoney } from '../lib/messages.js';

const iconBtn =
  'p-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs transition active:scale-95';

function metricCard({ label, tone, id }) {
  const tones = {
    rose: ['text-rose-400', 'bg-rose-500/10 text-rose-400 border-rose-500/20'],
    amber: ['text-amber-400', 'bg-amber-500/10 text-amber-400 border-amber-500/20'],
    emerald: ['text-emerald-400', 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'],
  }[tone];
  const count = h('span', { id: `${id}Count`, class: `text-xs font-bold px-2 py-0.5 rounded-md border ${tones[1]}` }, '0');
  const total = h('p', { id: `${id}Total`, class: `text-lg sm:text-2xl font-bold ${tones[0]} font-mono tracking-tight` }, formatMoney(0));
  const el = h(
    'div',
    { class: 'bg-gradient-to-b from-slate-900/70 to-slate-950 border border-slate-800/80 rounded-2xl p-4 sm:p-5 transition hover:border-slate-700' },
    h('div', { class: 'flex justify-between items-center mb-2' }, h('span', { class: 'text-[11px] font-semibold uppercase tracking-wider text-slate-400' }, label), count),
    total
  );
  return { el, set: (c) => ((count.textContent = c.count), (total.textContent = formatMoney(c.sum))) };
}

// Painel "Cobranças": métricas, alerta do dia, busca, filtros e lista.
export function createDashboard(actions) {
  let data = { charges: [], today: '', month: '' };
  let filter = 'todos';

  const overdue = metricCard({ label: 'Atrasados', tone: 'rose', id: 'overdue' });
  const today = metricCard({ label: 'Vencem Hoje', tone: 'amber', id: 'today' });
  const paid = metricCard({ label: 'Recebido (Mês)', tone: 'emerald', id: 'paid' });

  const planBanner = h('div', { id: 'planBanner', class: 'hidden' });
  const alertBar = h('div', { id: 'alertBar', class: 'hidden' });
  const search = h('input', {
    id: 'searchInput',
    type: 'search',
    placeholder: 'Buscar contato...',
    'aria-label': 'Buscar contato',
    class: 'w-full bg-slate-900/80 border border-slate-800/80 focus:border-emerald-500/80 rounded-xl pl-9 pr-4 py-2.5 text-base sm:text-xs text-white placeholder-slate-500 focus:outline-none transition',
    oninput: () => renderList(),
  });

  const filterButtons = {};
  const filterBar = h(
    'div',
    { class: 'grid grid-cols-3 sm:flex p-1 bg-slate-900/90 border border-slate-800/80 rounded-xl w-full sm:w-auto shrink-0 gap-1', role: 'group', 'aria-label': 'Filtrar cobranças' },
    ['todos', 'pendentes', 'pagos'].map((f) => {
      const b = h(
        'button',
        {
          id: `filter-${f}`,
          type: 'button',
          class:
            f === 'todos'
              ? 'px-3.5 py-2 sm:py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 text-slate-950 transition cursor-pointer text-center flex items-center justify-center'
              : 'px-3.5 py-2 sm:py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer text-center flex items-center justify-center',
          onclick: () => setFilter(f),
        },
        f[0].toUpperCase() + f.slice(1)
      );
      filterButtons[f] = b;
      return b;
    })
  );

  const list = h('div', { id: 'clientsList', class: 'divide-y divide-slate-800/50 overflow-y-auto custom-scroll flex-1' });
  const empty = h(
    'div',
    { id: 'emptyState', class: 'p-16 text-center text-slate-500 text-sm hidden my-auto' },
    h('div', { class: 'w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-600' }, icon('fa-solid fa-users text-xl')),
    h('p', { class: 'font-medium text-slate-400' }, 'Nenhum cliente encontrado.'),
    h('p', { class: 'text-xs text-slate-600 mt-1' }, 'Cadastre seus alunos ou clientes pelo botão acima.')
  );

  const el = h(
    'section',
    { id: 'panel-cobrancas', class: 'flex flex-col flex-1' },
    planBanner,
    alertBar,
    h('div', { class: 'grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6' }, overdue.el, today.el, paid.el),
    h(
      'div',
      { class: 'flex flex-col sm:flex-row gap-3 mb-4' },
      h('div', { class: 'relative flex-1' }, icon('fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs'), search),
      filterBar
    ),
    h('div', { class: 'flex-1 bg-slate-900/40 border border-slate-800/80 rounded-3xl overflow-hidden flex flex-col shadow-xl' }, list, empty)
  );

  function setFilter(f) {
    filter = f;
    renderList();
  }

  function paintFilters() {
    for (const [f, b] of Object.entries(filterButtons)) {
      b.className =
        f === filter
          ? 'px-3.5 py-2 sm:py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 text-slate-950 transition cursor-pointer text-center flex items-center justify-center'
          : 'px-3.5 py-2 sm:py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer text-center flex items-center justify-center';
      b.setAttribute('aria-pressed', String(f === filter));
    }
  }

  function renderPlanBanner(planDetails, onUpgrade) {
    clear(planBanner);
    if (!planDetails || planDetails.isPro) {
      planBanner.classList.add('hidden');
      return;
    }

    if (planDetails.isExpired) {
      planBanner.className =
        'fade-up mb-5 bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 border border-rose-500/40 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl';
      planBanner.append(
        h(
          'div',
          { class: 'space-y-1' },
          h(
            'div',
            { class: 'flex items-center gap-2' },
            h(
              'span',
              { class: 'text-[10px] uppercase font-mono tracking-wider font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30' },
              'DEGUSTAÇÃO DE 5 DIAS EXPIRADA'
            )
          ),
          h('h3', { class: 'text-base font-bold text-white' }, 'Controle de Mensalidades Pausado'),
          h(
            'p',
            { class: 'text-xs text-slate-300 max-w-xl' },
            'Seu período de teste de 5 dias foi concluído. Seus clientes e histórico continuam salvos na nuvem. Para cadastrar novos clientes e disparar cobranças no WhatsApp, ative o Plano PRO por R$ 29,90/mês.'
          )
        ),
        h(
          'button',
          {
            type: 'button',
            class:
              'flex items-center justify-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 text-slate-950 transition cursor-pointer shadow-lg shadow-emerald-500/20 shrink-0 self-start md:self-auto',
            onclick: onUpgrade,
          },
          icon('fa-solid fa-bolt text-xs'),
          h('span', {}, 'Ativar Plano PRO (R$ 29,90)')
        )
      );
      planBanner.classList.remove('hidden');
      return;
    }

    if (planDetails.isTrial) {
      planBanner.className =
        'fade-up mb-5 bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md';
      planBanner.append(
        h(
          'div',
          { class: 'flex items-center gap-3' },
          h('div', { class: 'w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0' }, icon('fa-regular fa-clock')),
          h(
            'div',
            { class: 'text-xs text-slate-300' },
            h('span', { class: 'font-bold text-amber-400' }, 'Degustação Gratuita: '),
            `restam `,
            h('strong', { class: 'text-white font-mono' }, `${planDetails.daysRemaining} ${planDetails.daysRemaining === 1 ? 'dia' : 'dias'}`),
            ` de teste. Garanta a continuidade das suas cobranças ativando o Plano PRO por R$ 29,90/mês.`
          )
        ),
        h(
          'button',
          {
            type: 'button',
            class: 'flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition shrink-0 cursor-pointer self-start sm:self-auto',
            onclick: onUpgrade,
          },
          icon('fa-solid fa-bolt text-xs'),
          h('span', {}, 'Assinar PRO')
        )
      );
      planBanner.classList.remove('hidden');
      return;
    }

    planBanner.classList.add('hidden');
  }

  function renderAlert(summary) {
    clear(alertBar);
    const parts = [];
    if (summary.overdue.count) parts.push(`${summary.overdue.count} atrasada${summary.overdue.count > 1 ? 's' : ''}`);
    if (summary.today.count) parts.push(`${summary.today.count} vence${summary.today.count > 1 ? 'm' : ''} hoje`);
    if (!parts.length) return alertBar.classList.add('hidden');
    alertBar.className = 'fade-up mb-5 flex items-center gap-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl px-4 py-3';
    alertBar.append(
      icon('fa-solid fa-bell text-amber-400'),
      h('p', { class: 'text-xs font-semibold text-amber-200' }, 'Atenção: ', parts.join(' • '))
    );
  }

  function renderList() {
    paintFilters();
    clear(list);
    const term = search.value.toLowerCase().trim();
    const rows = data.charges.filter((c) => {
      if (!(c.clients?.name || '').toLowerCase().includes(term)) return false;
      if (filter === 'pendentes') return c.status !== 'pago';
      if (filter === 'pagos') return c.status === 'pago';
      return true;
    });
    empty.classList.toggle('hidden', rows.length > 0);
    rows.forEach((c) => list.append(renderRow(c)));
  }

  function renderRow(c) {
    const state = chargeState(c, data.today);
    const paidRow = state === 'pago';
    const name = c.clients?.name || 'Cliente';
    const initials = name.split(' ').map((n) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
    const last = lastChargeMessage(c);
    const sameMonth = c.reference_month === data.month;
    const dueText = sameMonth ? `Vence dia ${dayOf(c.due_date)}` : `Venceu em ${formatDateBR(c.due_date)}`;

    let lastText = null;
    if (last) {
      const { date, time } = formatDateTimeBR(last);
      lastText = `WhatsApp aberto em ${date} às ${time}`;
    }

    const action = (id, label, classes, iconClass, handler, text) =>
      h('button', { type: 'button', 'data-action': id, 'aria-label': label, title: label, class: classes, onclick: handler }, icon(iconClass), text);

    return h(
      'div',
      { class: 'p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 hover:bg-slate-800/20 transition' },
      h(
        'div',
        { class: 'flex items-center gap-3 sm:gap-3.5 min-w-0' },
        h('div', { class: `w-10 h-10 rounded-2xl bg-gradient-to-tr ${paidRow ? 'from-emerald-950 to-slate-900 text-emerald-400 border-emerald-500/20' : 'from-slate-800 to-slate-900 text-slate-300 border-slate-700/50'} border flex items-center justify-center font-bold text-xs shrink-0 shadow-sm` }, initials),
        h(
          'div',
          { class: 'min-w-0 flex-1' },
          h('div', { class: 'flex items-center gap-2 mb-1 flex-wrap' }, h('p', { class: 'font-semibold text-white text-sm truncate tracking-tight' }, name), stateBadge(state, c, data.today, data.month)),
          h(
            'div',
            { class: 'flex items-center gap-1.5 sm:gap-2 flex-wrap' },
            h('span', { class: 'text-xs font-semibold text-slate-300 font-mono' }, formatMoney(c.amount)),
            h('span', { class: 'text-slate-700 text-xs' }, '•'),
            h('span', { class: 'text-xs text-slate-400' }, dueText),
            lastText && [h('span', { class: 'text-slate-700 text-xs' }, '•'), h('span', { class: 'text-[10px] text-slate-500 font-medium' }, lastText)]
          )
        )
      ),
      h(
        'div',
        { class: 'flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t border-slate-800/50 sm:border-t-0' },
        paidRow
          ? action('receipt', 'Enviar recibo pelo WhatsApp', 'flex-1 sm:flex-initial justify-center bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 px-3.5 py-2.5 sm:py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 active:scale-95', 'fa-solid fa-receipt text-xs', () => actions.onReceipt(c), h('span', {}, 'Recibo'))
          : action('charge', 'Abrir cobrança no WhatsApp', 'flex-1 sm:flex-initial justify-center bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3.5 py-2.5 sm:py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-md shadow-emerald-500/15 active:scale-95', 'fa-brands fa-whatsapp text-sm', () => actions.onCharge(c), h('span', {}, 'Cobrar')),
        action(
          'toggle',
          paidRow ? 'Marcar como pendente' : 'Marcar como pago',
          `p-2.5 ${paidRow ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'} border hover:bg-slate-800 rounded-xl text-xs transition active:scale-95 shrink-0`,
          paidRow ? 'fa-solid fa-rotate-left' : 'fa-solid fa-check',
          () => actions.onToggle(c)
        ),
        action('edit', 'Editar cliente', `${iconBtn} shrink-0`, 'fa-solid fa-pen', () => actions.onEdit(c)),
        action('archive', 'Arquivar cliente', `${iconBtn.replace('hover:text-white', 'hover:text-amber-400')} shrink-0`, 'fa-solid fa-box-archive', () => actions.onArchive(c))
      )
    );
  }

  return {
    el,
    update(next) {
      data = next;
      const summary = summarize(data.charges, data.today, data.month);
      overdue.set(summary.overdue);
      today.set(summary.today);
      paid.set(summary.paid);
      renderPlanBanner(data.planDetails, data.onUpgrade);
      renderAlert(summary);
      renderList();
      return summary;
    },
  };
}
