import { clear, h, icon } from './dom.js';
import { normalizePhone, sanitizePixKey } from '../lib/pix.js';
import { toast } from './toast.js';

const inputCls =
  'w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition';
const labelCls = 'block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5';
const primaryBtn = 'py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-emerald-500/10 active:scale-[0.98]';
const ghostBtn = 'py-3 bg-slate-800/80 hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-300 transition';

let openModal = null;

export function closeModal() {
  if (!openModal) return;
  document.removeEventListener('keydown', openModal.onKey);
  openModal.restoreFocus?.focus?.();
  openModal.el.remove();
  openModal = null;
}

function showModal({ title, subtitle, wide, content, labelledBy }) {
  closeModal();
  const titleEl = h('h3', { id: labelledBy, class: 'text-base font-bold text-white' }, title);
  const el = h(
    'div',
    {
      class: 'fixed inset-0 bg-[#030712]/80 backdrop-blur-md flex items-center justify-center p-4 z-40',
      onclick: (e) => e.target === el && closeModal(),
    },
    h(
      'div',
      { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': labelledBy, class: `fade-up bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-7 ${wide ? 'max-w-lg' : 'max-w-md'} w-full shadow-2xl max-h-[90vh] overflow-y-auto custom-scroll` },
      h(
        'div',
        { class: 'flex justify-between items-start mb-5 pb-3 border-b border-slate-800/60' },
        h('div', {}, titleEl, subtitle && h('p', { class: 'text-xs text-slate-400' }, subtitle)),
        h('button', { type: 'button', 'aria-label': 'Fechar', class: 'text-slate-400 hover:text-white p-1', onclick: closeModal }, icon('fa-solid fa-xmark'))
      ),
      content
    )
  );
  const onKey = (e) => e.key === 'Escape' && closeModal();
  document.addEventListener('keydown', onKey);
  openModal = { el, onKey, restoreFocus: document.activeElement };
  document.body.append(el);
  el.querySelector('input, select, button[type=submit]')?.focus();
}

// ---------- Cliente ----------
export function openClientModal({ client, onSave }) {
  const name = h('input', { id: 'clientName', type: 'text', required: true, maxlength: '120', placeholder: 'ex: Juliana Souza', class: inputCls, value: client?.name || '' });
  const phone = h('input', { id: 'clientPhone', type: 'tel', inputmode: 'tel', required: true, placeholder: 'ex: 84999887766', class: inputCls, value: client?.phone || '' });
  const amount = h('input', { id: 'clientAmount', type: 'number', min: '0.01', max: '999999999', step: '0.01', required: true, placeholder: '150.00', class: inputCls, value: client ? Number(client.amount).toFixed(2) : '' });
  const dueDay = h('input', { id: 'clientDueDay', type: 'number', min: '1', max: '31', required: true, placeholder: 'ex: 10', class: inputCls, value: client?.due_day ?? '' });
  const submit = h('button', { type: 'submit', class: `w-1/2 ${primaryBtn}` }, 'Salvar Contato');

  const form = h(
    'form',
    {
      class: 'space-y-4',
      onsubmit: async (e) => {
        e.preventDefault();
        const data = {
          id: client?.id,
          name: name.value.trim(),
          phone: normalizePhone(phone.value),
          amount: Number(amount.value),
          due_day: Number(dueDay.value),
        };
        if (!data.name || !data.phone || !Number.isFinite(data.amount) || data.amount < 0.01 || data.amount > 999999999 || !Number.isInteger(data.due_day) || data.due_day < 1 || data.due_day > 31) {
          return toast('Confira nome, WhatsApp com DDD, valor positivo e dia de vencimento.', 'error');
        }
        data.amount = data.amount.toFixed(2);
        submit.disabled = true;
        try {
          await onSave(data);
          closeModal();
        } catch (err) {
          toast(err.message, 'error');
          submit.disabled = false;
        }
      },
    },
    h('div', {}, h('label', { for: 'clientName', class: labelCls }, 'Nome Completo'), name),
    h('div', {}, h('label', { for: 'clientPhone', class: labelCls }, 'WhatsApp (DDD + Número)'), phone),
    h('div', { class: 'grid grid-cols-2 gap-3' },
      h('div', {}, h('label', { for: 'clientAmount', class: labelCls }, 'Valor Mensal (R$)'), amount),
      h('div', {}, h('label', { for: 'clientDueDay', class: labelCls }, 'Dia Vencimento'), dueDay)),
    h('div', { class: 'flex gap-2.5 pt-3' }, h('button', { type: 'button', class: `w-1/2 ${ghostBtn}`, onclick: closeModal }, 'Cancelar'), submit)
  );

  showModal({ title: client ? 'Editar Cliente' : 'Adicionar Cliente', content: form, labelledBy: 'clientModalTitle' });
}

// ---------- Configurações ----------
export function openConfigModal({ settings, email, archived, handlers }) {
  const type = h(
    'select',
    { id: 'configPixType', required: true, class: inputCls },
    [['', 'Selecione'], ['cpf', 'CPF'], ['cnpj', 'CNPJ'], ['phone', 'Celular'], ['email', 'E-mail'], ['random', 'Aleatória']].map(([v, t]) => h('option', { value: v }, t))
  );
  type.value = settings.pix_key_type || '';
  const key = h('input', { id: 'configPixKey', type: 'text', required: true, placeholder: 'Celular: +5584999988888', class: `${inputCls} font-mono`, value: settings.pix_key || '' });
  const pixName = h('input', { id: 'configPixName', type: 'text', required: true, maxlength: '25', placeholder: 'ex: Nayan Luiz', class: inputCls, value: settings.merchant_name || '' });
  const city = h('input', { id: 'configPixCity', type: 'text', required: true, maxlength: '15', placeholder: 'ex: Natal', class: inputCls, value: settings.merchant_city || '' });
  const save = h('button', { type: 'submit', class: `w-full ${primaryBtn}` }, 'Salvar Ajustes');

  const form = h(
    'form',
    {
      class: 'space-y-4',
      onsubmit: async (e) => {
        e.preventDefault();
        const pix_key = sanitizePixKey(key.value, type.value);
        if (!pix_key) {
          toast('Chave Pix inválida para o tipo escolhido. Para celular, use +55, DDD e número.', 'error');
          return key.focus();
        }
        if (!pixName.value.trim() || !city.value.trim()) return toast('Informe seu nome e sua cidade para gerar o Pix.', 'error');
        save.disabled = true;
        try {
          await handlers.onSave({ pix_key, pix_key_type: type.value, merchant_name: pixName.value.trim(), merchant_city: city.value.trim() });
          closeModal();
          toast('Ajustes salvos.', 'ok');
        } catch (err) {
          toast(err.message, 'error');
          save.disabled = false;
        }
      },
    },
    h('div', {}, h('label', { for: 'configPixType', class: labelCls }, 'Tipo da Chave Pix'), type),
    h('div', {},
      h('label', { for: 'configPixKey', class: labelCls }, 'Chave Pix'), key,
      h('p', { class: 'text-[11px] text-slate-400 mt-1.5' }, 'Para celular, informe +55, DDD e número. CPF tem 11 dígitos sem +55.')),
    h('div', { class: 'grid grid-cols-2 gap-3' },
      h('div', {}, h('label', { for: 'configPixName', class: labelCls }, 'Seu Nome / Marca'), pixName),
      h('div', {}, h('label', { for: 'configPixCity', class: labelCls }, 'Sua Cidade'), city)),
    save
  );

  // Clientes arquivados
  const archivedBox = h('div', { class: 'mt-6 pt-6 border-t border-slate-800/80' });
  const renderArchived = () => {
    clear(archivedBox);
    archivedBox.append(h('h4', { class: `${labelCls} mb-2` }, 'Clientes arquivados'));
    if (!archived.length) return archivedBox.append(h('p', { class: 'text-xs text-slate-500' }, 'Nenhum cliente arquivado.'));
    archived.forEach((c) =>
      archivedBox.append(
        h('div', { class: 'flex items-center justify-between gap-2 py-1.5' },
          h('span', { class: 'text-xs text-slate-300 truncate' }, c.name),
          h('button', {
            type: 'button',
            class: 'text-[11px] font-bold text-emerald-400 hover:text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-500/30',
            onclick: async () => {
              try {
                await handlers.onReactivate(c);
                archived.splice(archived.indexOf(c), 1);
                renderArchived();
                toast(`${c.name} reativado.`, 'ok');
              } catch (err) {
                toast(err.message, 'error');
              }
            },
          }, 'Reativar'))
      )
    );
  };
  renderArchived();

  // Backup
  const file = h('input', {
    type: 'file', accept: '.json', class: 'hidden',
    onchange: (e) => {
      const f = e.target.files[0];
      e.target.value = '';
      if (!f) return;
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const data = JSON.parse(reader.result);
          handlers.validateBackup(data);
          if (!confirm('Restaurar este backup? Os dados do backup serão mesclados aos atuais.')) return;
          await handlers.onImport(data);
          closeModal();
          toast('Backup restaurado.', 'ok');
        } catch (err) {
          toast(err.message || 'Backup inválido.', 'error');
        }
      };
      reader.onerror = () => toast('Não foi possível ler o arquivo.', 'error');
      reader.readAsText(f);
    },
  });
  const backup = h('div', { class: 'mt-6 pt-6 border-t border-slate-800/80' },
    h('h4', { class: `${labelCls} mb-2` }, 'Backup extra (JSON)'),
    h('p', { class: 'text-[11px] text-slate-500 mb-3' }, 'Seus dados já ficam salvos na nuvem. O arquivo é uma cópia a mais, para guardar onde quiser.'),
    h('div', { class: 'grid grid-cols-2 gap-2' },
      h('button', { type: 'button', class: 'py-2.5 bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2', onclick: () => handlers.onExport().catch((err) => toast(err.message, 'error')) }, icon('fa-solid fa-download text-xs'), ' Exportar'),
      h('label', { class: 'py-2.5 bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer' }, icon('fa-solid fa-upload text-xs'), ' Restaurar', file))
  );

  const account = h('div', { class: 'mt-6 pt-6 border-t border-slate-800/80 flex items-center justify-between gap-3' },
    h('div', { class: 'min-w-0' }, h('p', { class: labelCls + ' mb-0.5' }, 'Conta'), h('p', { class: 'text-xs text-slate-300 truncate' }, email)),
    h('button', { type: 'button', class: 'px-4 py-2.5 bg-slate-800/80 hover:bg-rose-500/10 hover:text-rose-400 text-slate-300 border border-slate-700/60 rounded-xl text-xs font-semibold transition flex items-center gap-2', onclick: () => { closeModal(); handlers.onLogout(); } }, icon('fa-solid fa-right-from-bracket text-xs'), ' Sair'));

  showModal({ title: 'Configurações de Cobrança', subtitle: 'Seus dados para gerar o Pix Copia e Cola', wide: true, content: h('div', {}, form, archivedBox, backup, account), labelledBy: 'configModalTitle' });
}

