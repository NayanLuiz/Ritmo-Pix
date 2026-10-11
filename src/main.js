import './style.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

import { chargeState } from './lib/charges.js';
import { buildMessage, formatMoney, whatsappUrl } from './lib/messages.js';
import { generatePixCopiaECola } from './lib/pix.js';
import { monthOf, todayISO } from './lib/dates.js';
import * as store from './lib/store.js';
import { supabase } from './lib/supabase.js';
import { clear, h, icon } from './ui/dom.js';
import { createDashboard } from './ui/dashboard.js';
import { createHistory } from './ui/history.js';
import { renderLogin } from './ui/login.js';
import { closeModal, openClientModal, openConfigModal, openQrCodeModal } from './ui/modals.js';
import { toast } from './ui/toast.js';

const root = document.getElementById('app');
const BASE_TITLE = 'RitmoPix • Cobranças mensais';

const state = {
  session: null,
  settings: { ...store.DEFAULT_SETTINGS },
  clients: [],
  charges: [],
  today: '',
  month: '',
  tab: 'cobrancas',
};

let shell = null; // referências da tela principal
let refreshing = null;
let lastRefreshAt = 0;
let timers = [];

// ---------- Fluxo de sessão ----------
function showLogin(isRecovery = false) {
  timers.forEach(clearInterval);
  timers = [];
  closeModal();
  shell = null;
  document.title = BASE_TITLE;
  clear(root).append(
    renderLogin({
      isRecovery,
      async onSubmit(email, password) {
        state.session = await store.signIn(email, password);
        await startApp();
      },
      async onResetPassword(email) {
        await store.resetPassword(email);
      },
      async onSetNewPassword(newPassword) {
        await store.updatePassword(newPassword);
        toast('Senha atualizada com sucesso!', 'ok');
        await startApp();
      },
    })
  );
}

async function startApp() {
  mountShell();
  await refreshAll();
  timers.push(
    setInterval(() => {
      if (todayISO() !== state.today) refreshAll(); // virou o dia
    }, 60000)
  );
}

window.addEventListener('focus', () => {
  if (shell && Date.now() - lastRefreshAt > 10000) refreshAll();
});

supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') showLogin();
  else if (event === 'PASSWORD_RECOVERY') showLogin(true);
});

// ---------- Tela principal ----------
function mountShell() {
  const dashboard = createDashboard({
    onCharge: (c) => sendWhatsApp(c, 'charge'),
    onQrCode: (c) => showQrCode(c),
    onReceipt: (c) => sendWhatsApp(c, 'receipt'),
    onToggle: toggleCharge,
    onEdit: (c) => openClientModal({ client: state.clients.find((x) => x.id === c.client_id), onSave: saveClient }),
    onArchive: archiveClient,
  });
  const history = createHistory();

  const bell = h('button', { id: 'bellBtn', type: 'button', class: 'p-2.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-sm transition', onclick: enableNotifications });
  const tabs = {};
  const tabBar = h(
    'nav',
    { class: 'flex p-1 bg-slate-900/90 border border-slate-800/80 rounded-xl mb-6 self-start', 'aria-label': 'Seções' },
    [['cobrancas', 'Cobranças', 'fa-solid fa-list-check'], ['historico', 'Histórico', 'fa-solid fa-chart-column']].map(([id, label, ic]) => {
      const b = h('button', { type: 'button', id: `tab-${id}`, onclick: () => setTab(id) }, icon(`${ic} text-[11px] mr-2`), label);
      tabs[id] = b;
      return b;
    })
  );

  const app = h(
    'main',
    { id: 'mainApp', class: 'flex-1 max-w-3xl w-full mx-auto px-4 py-6 sm:py-8 flex flex-col' },
    h(
      'header',
      { class: 'flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-800/60' },
      h(
        'div',
        { class: 'flex items-center gap-3.5' },
        h('div', { class: 'w-11 h-11 bg-slate-900 border border-emerald-500/30 rounded-2xl flex items-center justify-center shrink-0 shadow-inner' }, h('img', { src: '/ritmopix-logo.png', alt: '', class: 'w-10 h-10 object-contain' })),
        h(
          'div',
          {},
          h('div', { class: 'flex items-center gap-2' },
            h('h1', { class: 'text-base font-bold text-white tracking-tight' }, 'Ritmo', h('span', { class: 'text-emerald-400' }, 'Pix')),
            h('span', { id: 'syncBadge', class: 'text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' }, 'Nuvem')),
          h('p', { class: 'text-xs text-slate-400 font-medium' }, 'Controle mensal • Pix e WhatsApp')
        )
      ),
      h(
        'div',
        { class: 'flex items-center gap-2' },
        bell,
        h('button', { id: 'configBtn', type: 'button', title: 'Configurações', 'aria-label': 'Configurações', class: 'p-2.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-sm transition', onclick: openConfig }, icon('fa-solid fa-sliders')),
        h('button', { id: 'newClientBtn', type: 'button', class: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-500/15 active:scale-95', onclick: () => openClientModal({ onSave: saveClient }) }, icon('fa-solid fa-plus text-[11px]'), h('span', {}, 'Novo Aluno/Cliente'))
      )
    ),
    tabBar,
    dashboard.el,
    history.el
  );

  clear(root).append(
    h('div', { class: 'fixed top-0 left-1/2 -translate-x-1/2 w-[700px] max-w-full h-[280px] bg-gradient-to-b from-emerald-500/15 via-emerald-600/5 to-transparent blur-3xl pointer-events-none -z-10', 'aria-hidden': 'true' }),
    app
  );
  shell = { dashboard, history, bell, tabs };
  setTab(state.tab);
  paintBell();
}

function setTab(tab) {
  state.tab = tab;
  if (!shell) return;
  for (const [id, b] of Object.entries(shell.tabs)) {
    b.className =
      id === tab
        ? 'px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 text-slate-950 transition'
        : 'px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition';
    b.setAttribute('aria-current', id === tab ? 'page' : 'false');
  }
  shell.dashboard.el.hidden = tab !== 'cobrancas';
  shell.history.el.hidden = tab !== 'historico';
  if (tab === 'historico') refreshHistory();
}

function forecast() {
  const active = state.clients.filter((c) => c.active);
  return { count: active.length, sum: active.reduce((s, c) => s + Number(c.amount), 0) };
}

function refreshHistory() {
  return shell?.history.refresh({ today: state.today, currentMonth: state.month, forecast: forecast() });
}

// ---------- Carga de dados ----------
function refreshAll() {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      state.today = todayISO();
      state.month = monthOf(state.today);
      await store.ensureMonth(state.month);
      const [settings, clients, charges] = await Promise.all([
        store.loadSettings(),
        store.listClients(),
        store.listOpenCharges(state.month, state.today),
      ]);
      state.settings = settings;
      state.clients = clients;
      state.charges = charges;
      lastRefreshAt = Date.now();
      if (!shell) return;
      const summary = shell.dashboard.update({ charges, today: state.today, month: state.month });
      updateAlerts(summary);
      if (state.tab === 'historico') refreshHistory();
    } catch (err) {
      toast(`Não foi possível carregar os dados: ${err.message}`, 'error');
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

// Executa uma ação e recarrega; mostra erro sem derrubar a tela.
async function act(fn, okMessage) {
  try {
    await fn();
    await refreshAll();
    if (okMessage) toast(okMessage, 'ok');
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ---------- Ações ----------
const toggleCharge = (c) => act(() => store.setChargePaid(c.id, c.status !== 'pago'));

async function saveClient(data) {
  await store.saveClient(data, state.month);
  await refreshAll();
}

function archiveClient(c) {
  const name = c.clients?.name || 'este cliente';
  if (!confirm(`Arquivar ${name}? Ele deixa de ser cobrado nos próximos meses, mas o histórico fica guardado.`)) return;
  act(() => store.setClientActive(c.client_id, false, state.today), `${name} arquivado.`);
}

function sendWhatsApp(charge, type) {
  const client = charge.clients;
  if (!client) return;
  const s = state.settings;
  let pixCode = '';
  if (type === 'charge') {
    pixCode = generatePixCopiaECola(s.pix_key, s.pix_key_type, s.merchant_name, s.merchant_city, charge.amount);
    if (!pixCode) {
      toast('Configure uma Chave Pix válida antes de cobrar. Celular precisa de +55, DDD e número.', 'error');
      return openConfig();
    }
  }
  const text = buildMessage({ type, name: client.name, amount: charge.amount, dueDate: charge.due_date, today: state.today, pixCode, pixKey: s.pix_key });
  // window.open precisa acontecer direto no clique, senão o navegador bloqueia.
  const win = window.open(whatsappUrl(client.phone, text), '_blank');
  if (!win) return toast('O navegador bloqueou a abertura do WhatsApp. Permita pop-ups e tente novamente.', 'error');
  win.opener = null;
  act(() => store.logMessage(charge.id, type));
}

function showQrCode(charge) {
  const client = charge.clients;
  const s = state.settings;
  const pixCode = generatePixCopiaECola(s.pix_key, s.pix_key_type, s.merchant_name, s.merchant_city, charge.amount);
  if (!pixCode) {
    toast('Configure uma Chave Pix válida antes de gerar o QR Code.', 'error');
    return openConfig();
  }
  openQrCodeModal({
    clientName: client?.name || 'Cliente',
    amountFormatted: formatMoney(charge.amount),
    pixCode,
    pixKey: s.pix_key,
  });
}

function openConfig() {
  openConfigModal({
    settings: state.settings,
    email: state.session?.user?.email || '',
    archived: state.clients.filter((c) => !c.active),
    handlers: {
      onSave: async (values) => {
        await store.saveSettings(state.session.user.id, values);
        state.settings = { ...state.settings, ...values };
      },
      onReactivate: async (c) => {
        await store.setClientActive(c.id, true, state.today);
        await refreshAll();
      },
      validateBackup: store.validateBackup,
      onImport: async (data) => {
        await store.importAll(state.session.user.id, data);
        await refreshAll();
      },
      onExport: async () => {
        const data = await store.exportAll();
        const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
        const a = h('a', { href: url, download: `backup-ritmopix-${state.today}.json` });
        a.click();
        URL.revokeObjectURL(url);
      },
      onLogout: () => store.signOut(),
    },
  });
}

// ---------- Avisos (título da aba + notificação do navegador) ----------
const notificationsSupported = () => 'Notification' in window;

function paintBell() {
  if (!shell) return;
  const perm = notificationsSupported() ? Notification.permission : 'unsupported';
  const map = {
    granted: ['fa-solid fa-bell text-emerald-400', 'Avisos ativados'],
    denied: ['fa-solid fa-bell-slash text-slate-600', 'Avisos bloqueados no navegador'],
    default: ['fa-regular fa-bell', 'Ativar avisos de vencimento'],
    unsupported: ['fa-regular fa-bell-slash text-slate-600', 'Este navegador não suporta avisos'],
  };
  const [cls, label] = map[perm];
  clear(shell.bell).append(icon(cls));
  shell.bell.title = label;
  shell.bell.setAttribute('aria-label', label);
}

async function enableNotifications() {
  if (!notificationsSupported()) return toast('Este navegador não suporta avisos.', 'error');
  if (Notification.permission === 'denied') return toast('Os avisos estão bloqueados. Libere nas permissões do navegador.', 'error');
  if (Notification.permission === 'granted') return toast('Os avisos já estão ativados.', 'ok');
  await Notification.requestPermission();
  paintBell();
  if (Notification.permission === 'granted') {
    toast('Avisos ativados. Você será avisado ao abrir o app.', 'ok');
    notifyDue(true);
  }
}

let lastSummary = null;
function updateAlerts(summary) {
  lastSummary = summary;
  const n = summary.overdue.count + summary.today.count;
  document.title = n ? `(${n}) ${BASE_TITLE}` : BASE_TITLE;
  notifyDue(false);
}

async function notifyDue(force) {
  if (!lastSummary || !notificationsSupported() || Notification.permission !== 'granted') return;
  const { overdue, today } = lastSummary;
  const n = overdue.count + today.count;
  if (!n) return;
  // Evita repetir o mesmo aviso no mesmo dia (só um marcador de interface, não são dados do app).
  const mark = `${state.today}:${overdue.count}:${today.count}`;
  if (!force && localStorage.getItem('ritmopix_notified') === mark) return;
  localStorage.setItem('ritmopix_notified', mark);

  const parts = [];
  if (today.count) parts.push(`${today.count} vence${today.count > 1 ? 'm' : ''} hoje`);
  if (overdue.count) parts.push(`${overdue.count} atrasada${overdue.count > 1 ? 's' : ''}`);
  const options = { body: parts.join(' • '), icon: '/ritmopix-logo.png', tag: 'ritmopix-daily' };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) reg.showNotification('RitmoPix • Cobranças', options);
    else new Notification('RitmoPix • Cobranças', options);
  } catch {
    /* sem permissão efetiva: ignora */
  }
}

// ---------- Início ----------
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}

(async function init() {
  state.session = await store.getSession();
  if (state.session) await startApp();
  else showLogin();
})();
