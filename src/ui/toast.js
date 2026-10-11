import { h } from './dom.js';

export function toast(message, kind = 'info') {
  const host = document.getElementById('toasts');
  if (!host) return;
  const colors = {
    info: 'border-slate-700 text-slate-100',
    ok: 'border-emerald-500/40 text-emerald-300',
    error: 'border-rose-500/40 text-rose-300',
  };
  const el = h(
    'div',
    {
      role: kind === 'error' ? 'alert' : 'status',
      class: `toast-in pointer-events-auto bg-slate-900/95 backdrop-blur border ${colors[kind] || colors.info} rounded-xl px-4 py-3 text-xs font-semibold shadow-xl max-w-sm`,
    },
    message
  );
  host.append(el);
  setTimeout(() => el.remove(), kind === 'error' ? 6000 : 3500);
}
