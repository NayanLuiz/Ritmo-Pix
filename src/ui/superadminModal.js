// src/ui/superadminModal.js
// Painel Administrativo exclusivo para o Superadmin (nayanlima27@gmail.com)

import { clear, h, icon } from './dom.js';
import { closeModal } from './modals.js';
import { toast } from './toast.js';
import { listAllUsersForAdmin, updateUserPlanAsAdmin } from '../lib/store.js';
import { formatDateBR } from '../lib/dates.js';

export function openSuperadminModal({ onRefresh }) {
  closeModal();

  const overlay = h('div', {
    class: 'fixed inset-0 bg-[#030712]/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto',
    onclick: (e) => {
      if (e.target === overlay) cleanup();
    },
  });

  const box = h('div', {
    role: 'dialog',
    class: 'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-5 sm:p-7 max-w-2xl w-full shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto custom-scroll',
  });

  function cleanup() {
    document.removeEventListener('keydown', onEsc);
    overlay.remove();
  }
  function onEsc(e) {
    if (e.key === 'Escape') cleanup();
  }
  document.addEventListener('keydown', onEsc);

  let users = [];
  let loading = true;
  let searchTerm = '';

  const closeBtn = h(
    'button',
    {
      type: 'button',
      class: 'absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80 hover:bg-slate-750 transition-colors',
      onclick: cleanup,
    },
    icon('fa-solid fa-xmark text-sm')
  );

  const title = h(
    'div',
    { class: 'mb-5 pb-4 border-b border-slate-800/80' },
    h(
      'div',
      { class: 'flex items-center gap-2 mb-1' },
      h('span', { class: 'text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30' }, 'SUPERADMIN'),
      h('h3', { class: 'text-lg font-bold text-white' }, 'Gerenciador de Usuários e Planos')
    ),
    h('p', { class: 'text-xs text-slate-400' }, 'Visualize contas cadastradas e ative ou pause o Plano PRO manualmente.')
  );

  const searchInput = h('input', {
    type: 'search',
    placeholder: 'Buscar por nome ou ID...',
    class: 'w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none mb-4',
    oninput: (e) => {
      searchTerm = e.target.value.toLowerCase().trim();
      renderList();
    },
  });

  const listContainer = h('div', { class: 'space-y-2.5 max-h-[50vh] overflow-y-auto custom-scroll pr-1' });

  async function loadData() {
    loading = true;
    clear(listContainer).append(h('p', { class: 'text-xs text-slate-400 text-center py-6' }, 'Carregando usuários do sistema...'));
    try {
      users = await listAllUsersForAdmin();
    } catch (err) {
      toast(err.message || 'Erro ao carregar usuários', 'error');
    } finally {
      loading = false;
      renderList();
    }
  }

  function renderList() {
    clear(listContainer);
    if (loading) return;

    const filtered = users.filter((u) => {
      const matchName = (u.merchant_name || '').toLowerCase().includes(searchTerm);
      const matchId = (u.user_id || '').toLowerCase().includes(searchTerm);
      const matchKey = (u.pix_key || '').toLowerCase().includes(searchTerm);
      return matchName || matchId || matchKey;
    });

    if (!filtered.length) {
      listContainer.append(h('p', { class: 'text-xs text-slate-500 text-center py-8' }, 'Nenhum usuário encontrado.'));
      return;
    }

    filtered.forEach((u) => {
      const isPro = u.plan_status === 'pro';
      const trialEnd = u.trial_ends_at ? new Date(u.trial_ends_at) : null;
      const trialExpired = trialEnd && trialEnd.getTime() <= Date.now();

      const toggleBtn = h(
        'button',
        {
          type: 'button',
          class: `text-xs font-bold px-3 py-1.5 rounded-xl border transition cursor-pointer shrink-0 ${
            isPro
              ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
              : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border-emerald-500/30'
          }`,
          onclick: async () => {
            const nextStatus = isPro ? 'free' : 'pro';
            try {
              toggleBtn.disabled = true;
              toggleBtn.textContent = 'Atualizando...';
              await updateUserPlanAsAdmin(u.user_id, nextStatus);
              u.plan_status = nextStatus;
              if (nextStatus === 'free') {
                u.trial_ends_at = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
              }
              toast(`Plano alterado para ${nextStatus.toUpperCase()} com sucesso!`, 'ok');
              if (onRefresh) onRefresh();
              renderList();
            } catch (err) {
              toast(err.message || 'Erro ao atualizar plano', 'error');
              toggleBtn.disabled = false;
              renderList();
            }
          },
        },
        isPro ? 'Mudar para FREE' : 'Ativar PRO'
      );

      const row = h(
        'div',
        { class: 'p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3' },
        h(
          'div',
          { class: 'space-y-1 min-w-0' },
          h(
            'div',
            { class: 'flex items-center gap-2 flex-wrap' },
            h('p', { class: 'text-xs font-bold text-white' }, u.merchant_name || 'Sem nome fantasia'),
            h(
              'span',
              {
                class: `text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  isPro
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : trialExpired
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`,
              },
              isPro ? 'PRO' : trialExpired ? 'EXPIRADO' : 'DEGUSTAÇÃO'
            )
          ),
          h('p', { class: 'text-[11px] text-slate-400 font-mono truncate' }, `ID: ${u.user_id}`),
          h(
            'p',
            { class: 'text-[11px] text-slate-500' },
            u.pix_key ? `Pix: ${u.pix_key}` : 'Chave Pix não configurada',
            u.trial_ends_at && ` • Trial até: ${formatDateBR(u.trial_ends_at.slice(0, 10))}`
          )
        ),
        toggleBtn
      );

      listContainer.append(row);
    });
  }

  box.append(closeBtn, title, searchInput, listContainer);
  overlay.append(box);
  document.body.append(overlay);
  loadData();
}
