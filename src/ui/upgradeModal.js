// src/ui/upgradeModal.js
// Modal de Assinatura do Plano PRO RitmoPix (Pix Asaas com QR Code e Copia e Cola)

import { clear, h, icon } from './dom.js';
import { closeModal } from './modals.js';
import { toast } from './toast.js';
import { generateRitmoPixCharge } from '../lib/asaas.js';
import { checkPlanStatus } from '../lib/store.js';
import {
  ASAAS_PIX_KEY,
  ASAAS_RECEIVER_NAME,
  PLAN_PRO_PRICE,
  WHATSAPP_SUPPORT_PHONE,
} from '../lib/subscription.js';

function formatCpfCnpj(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

function copyToClipboard(text) {
  try {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fallback abaixo */
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return true;
  } catch {
    return false;
  }
}

/**
 * Abre o modal interativo de contratação do Plano PRO RitmoPix
 * @param {Object} options
 * @param {Object} options.user
 * @param {Object} options.settings
 * @param {Function} options.onSuccess
 */
export function openUpgradeModal({ user, settings, onSuccess }) {
  closeModal();

  let pollingInterval = null;
  let pixState = {
    payload: '',
    encodedImage: '',
    isDynamic: false,
    generating: false,
    checking: false,
    activated: false,
    showManualKey: false,
  };

  const modalOverlay = h('div', {
    class: 'fixed inset-0 bg-[#030712]/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto',
    onclick: (e) => {
      if (e.target === modalOverlay) cleanupAndClose();
    },
  });

  const modalBox = h('div', {
    role: 'dialog',
    'aria-modal': 'true',
    class: 'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-5 sm:p-7 max-w-lg w-full shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto custom-scroll animate-in fade-in',
  });

  function cleanupAndClose() {
    if (pollingInterval) clearInterval(pollingInterval);
    document.removeEventListener('keydown', handleEsc);
    modalOverlay.remove();
  }

  function handleEsc(e) {
    if (e.key === 'Escape') cleanupAndClose();
  }
  document.addEventListener('keydown', handleEsc);

  // Iniciar polling seguro
  function startPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(async () => {
      if (!user?.id || pixState.activated) return;
      try {
        const fresh = await checkPlanStatus(user.id);
        if (fresh?.plan_status === 'pro') {
          handleSuccessActivation();
        }
      } catch {
        /* silêncio */
      }
    }, 4000);
  }

  function handleSuccessActivation() {
    pixState.activated = true;
    if (pollingInterval) clearInterval(pollingInterval);
    toast('🎉 Pagamento confirmado! Plano PRO ativado com sucesso!', 'ok');
    if (onSuccess) onSuccess();
    setTimeout(() => {
      cleanupAndClose();
    }, 2000);
    renderModalContent();
  }

  // Renderizador principal da view do modal
  function renderModalContent() {
    clear(modalBox);

    // Barra de brilho superior
    const glowBar = h('div', { class: 'absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 rounded-t-3xl' });

    // Botão de fechar
    const closeBtn = h(
      'button',
      {
        type: 'button',
        class: 'absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80 hover:bg-slate-750 transition-colors',
        onclick: cleanupAndClose,
      },
      icon('fa-solid fa-xmark text-sm')
    );

    // Cabeçalho
    const header = h(
      'div',
      { class: 'text-center space-y-2 pt-2' },
      h(
        'div',
        { class: 'w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400 mb-1' },
        icon('fa-solid fa-bolt text-xl')
      ),
      h(
        'span',
        { class: 'text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 inline-block' },
        'PLANO PRO RITMOPIX'
      ),
      h('h3', { class: 'text-xl font-bold text-white' }, 'Controle Ilimitado & Cobranças no WhatsApp'),
      h('p', { class: 'text-xs text-slate-400 max-w-sm mx-auto' }, 'Automatize suas mensalidades, gere Pix Copia e Cola instantâneo e envie lembretes aos seus alunos e clientes sem travas.')
    );

    // Card de Preço
    const priceCard = h(
      'div',
      { class: 'bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-center space-y-1 mt-4' },
      h(
        'div',
        { class: 'flex items-baseline justify-center gap-1.5' },
        h('span', { class: 'text-xs text-slate-400' }, 'R$'),
        h('span', { class: 'text-3xl font-extrabold text-white tracking-tight' }, PLAN_PRO_PRICE.toFixed(2).replace('.', ',')),
        h('span', { class: 'text-xs text-slate-400' }, '/ mês')
      ),
      h('p', { class: 'text-[11px] text-emerald-400 font-medium' }, 'Sem fidelidade • Cancele quando quiser • Ativação imediata via Pix')
    );

    // Benefícios (exibe apenas se não tiver gerado o Pix ainda)
    let benefitsBox = null;
    if (!pixState.payload) {
      benefitsBox = h(
        'div',
        { class: 'space-y-2.5 text-xs text-slate-300 my-4' },
        [
          ['fa-solid fa-check text-emerald-400', 'Cobranças e clientes ilimitados sem taxa por transação'],
          ['fa-brands fa-whatsapp text-emerald-400', 'Mensagens personalizadas e lembretes em 1 clique'],
          ['fa-solid fa-qrcode text-emerald-400', 'Pix Copia e Cola e QR Code automático'],
          ['fa-solid fa-chart-line text-emerald-400', 'Histórico financeiro, inadimplência e previsão de receita'],
          ['fa-solid fa-cloud text-emerald-400', 'Sincronização em nuvem e segurança criptografada'],
        ].map(([ic, text]) =>
          h('div', { class: 'flex items-center gap-2.5' }, icon(ic + ' shrink-0 text-sm'), h('span', {}, text))
        )
      );
    }

    // ETAPA 1: Formulário para gerar cobrança
    let formStage = null;
    if (!pixState.payload) {
      const savedDoc = localStorage.getItem('ritmopix_user_cpf_cnpj') || '';
      const docInput = h('input', {
        id: 'upgradeCpfCnpj',
        type: 'text',
        required: true,
        placeholder: '000.000.000-00 ou 00.000.000/0000-00',
        value: savedDoc,
        class: 'w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition font-mono',
        oninput: (e) => {
          e.target.value = formatCpfCnpj(e.target.value);
        },
      });

      const submitBtn = h(
        'button',
        {
          type: 'submit',
          disabled: pixState.generating,
          class: 'w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 text-slate-950 font-bold py-3.5 rounded-xl transition shadow-lg shadow-emerald-500/15 text-xs cursor-pointer disabled:opacity-60',
        },
        pixState.generating
          ? [icon('fa-solid fa-spinner fa-spin text-sm'), ' Gerando QR Code Pix...']
          : [icon('fa-solid fa-bolt text-xs'), ` Gerar QR Code Pix (R$ ${PLAN_PRO_PRICE.toFixed(2).replace('.', ',')})`]
      );

      formStage = h(
        'form',
        {
          class: 'space-y-3.5 mt-4',
          onsubmit: async (e) => {
            e.preventDefault();
            const clean = docInput.value.replace(/\D/g, '');
            if (clean.length !== 11 && clean.length !== 14) {
              toast('Por favor, informe um CPF válido (11 dígitos) ou CNPJ (14 dígitos).', 'error');
              return;
            }
            localStorage.setItem('ritmopix_user_cpf_cnpj', docInput.value);
            pixState.generating = true;
            renderModalContent();

            try {
              const res = await generateRitmoPixCharge({
                userId: user.id,
                email: user.email,
                merchantName: settings.merchant_name || 'RitmoPix',
                cpfCnpj: clean,
              });

              if (res.success && res.payload) {
                pixState.payload = res.payload;
                pixState.encodedImage = res.encodedImage || '';
                pixState.isDynamic = res.isDynamicAsaas || false;
                startPolling();
              } else {
                toast(res.error || 'Erro ao gerar Pix.', 'error');
              }
            } catch (err) {
              toast(err.message || 'Erro inesperado ao gerar cobrança.', 'error');
            } finally {
              pixState.generating = false;
              renderModalContent();
            }
          },
        },
        h(
          'div',
          { class: 'space-y-1.5' },
          h('label', { for: 'upgradeCpfCnpj', class: 'block text-xs font-semibold text-slate-200' }, 'CPF ou CNPJ do Titular'),
          h(
            'div',
            { class: 'relative' },
            icon('fa-solid fa-id-card text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 text-xs'),
            docInput
          ),
          h('p', { class: 'text-[10px] text-slate-500 leading-tight' }, 'Exigência do Banco Central para baixa e liberação automática via Pix.')
        ),
        submitBtn
      );
    }

    // ETAPA 2: Exibição do QR Code e Pix Copia e Cola
    let pixDisplay = null;
    if (pixState.payload) {
      const copyBtn = h(
        'button',
        {
          type: 'button',
          class: 'w-full flex items-center justify-between bg-slate-900 hover:bg-slate-850 border border-slate-800 px-3.5 py-2.5 rounded-xl text-xs font-mono text-slate-300 transition cursor-pointer',
          onclick: () => {
            if (copyToClipboard(pixState.payload)) {
              toast('Código Pix Copia e Cola copiado com sucesso!', 'ok');
              copyBtn.querySelector('.copy-txt').textContent = 'Copiado!';
              setTimeout(() => {
                const el = copyBtn.querySelector('.copy-txt');
                if (el) el.textContent = 'Copiar';
              }, 2500);
            }
          },
        },
        h('span', { class: 'truncate pr-2 font-mono text-[11px]' }, pixState.payload),
        h('span', { class: 'copy-txt flex items-center gap-1 text-emerald-400 shrink-0 font-sans font-bold text-xs' }, icon('fa-solid fa-copy text-xs'), ' Copiar')
      );

      const checkNowBtn = h(
        'button',
        {
          type: 'button',
          disabled: pixState.checking || pixState.activated,
          class: 'w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3.5 rounded-xl transition shadow-lg shadow-emerald-500/20 text-xs cursor-pointer disabled:opacity-60',
          onclick: async () => {
            pixState.checking = true;
            renderModalContent();
            try {
              const fresh = await checkPlanStatus(user.id);
              if (fresh?.plan_status === 'pro') {
                handleSuccessActivation();
              } else {
                toast('O banco ainda está processando. Aguarde alguns segundos após concluir no app do banco.', 'info');
              }
            } catch {
              toast('Não foi possível verificar agora. Tente em alguns instantes.', 'error');
            } finally {
              pixState.checking = false;
              renderModalContent();
            }
          },
        },
        pixState.activated
          ? [icon('fa-solid fa-circle-check text-slate-950'), ' Plano PRO Confirmado!']
          : pixState.checking
          ? [icon('fa-solid fa-spinner fa-spin text-slate-950'), ' Verificando no banco...']
          : [icon('fa-solid fa-rotate text-xs'), ' Já fiz o Pix • Verificar Ativação Agora']
      );

      const whatsappBtn = h(
        'button',
        {
          type: 'button',
          class: 'w-full flex items-center justify-center gap-2 bg-slate-850 hover:bg-slate-800 text-slate-300 font-semibold py-2.5 rounded-xl transition text-xs border border-slate-700/60',
          onclick: () => {
            const msg = encodeURIComponent(
              `Olá! Sou usuário do RitmoPix (${user.email || ''}). Estou concluindo o pagamento do Plano PRO (R$ ${PLAN_PRO_PRICE.toFixed(2).replace('.', ',')}) e gostaria de suporte para ativação!`
            );
            window.open(`https://wa.me/${WHATSAPP_SUPPORT_PHONE}?text=${msg}`, '_blank');
          },
        },
        icon('fa-brands fa-whatsapp text-emerald-400 text-sm'),
        ' Precisa de ajuda? Suporte via WhatsApp'
      );

      pixDisplay = h(
        'div',
        { class: 'space-y-4 my-4 animate-in fade-in' },
        // Indicador de aguardo
        h(
          'div',
          { class: 'flex items-center justify-center gap-2 py-1.5 px-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium mx-auto max-w-fit' },
          h('span', { class: 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse' }),
          h('span', {}, 'Aguardando pagamento no banco... (Liberação instantânea)')
        ),
        // Imagem do QR Code
        pixState.encodedImage &&
          h(
            'div',
            { class: 'flex flex-col items-center justify-center p-3 bg-white rounded-2xl max-w-[200px] mx-auto shadow-inner' },
            h('img', { src: pixState.encodedImage, alt: 'QR Code Pix', class: 'w-44 h-44 object-contain rounded-lg' }),
            h('span', { class: 'text-[10px] text-slate-800 font-mono font-bold mt-1.5' }, 'Aponte a câmera do seu banco')
          ),
        copyBtn,
        h(
          'div',
          { class: 'text-center text-[10px] text-slate-500 font-mono flex items-center justify-center gap-1.5' },
          icon('fa-solid fa-shield-halved text-emerald-400 text-xs'),
          h('span', {}, `Destinatário: ${ASAAS_RECEIVER_NAME} • Conta Asaas Oficial`)
        ),
        // Ações
        h('div', { class: 'space-y-2 pt-2' }, checkNowBtn, whatsappBtn)
      );
    }

    modalBox.append(glowBar, closeBtn, header, priceCard, benefitsBox || '', formStage || '', pixDisplay || '');
  }

  renderModalContent();
  modalOverlay.append(modalBox);
  document.body.append(modalOverlay);
}
