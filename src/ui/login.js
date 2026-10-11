import { clear, h, icon } from './dom.js';

const input =
  'w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition';

export function renderLogin({ onSubmit, onResetPassword, onSetNewPassword, isRecovery = false }) {
  let mode = isRecovery ? 'new-password' : 'login'; // 'login' | 'forgot' | 'new-password'

  const container = h('div', { class: 'w-full' });
  const formBox = h('div', { class: 'space-y-4' });

  function renderView() {
    clear(formBox);

    if (mode === 'login') {
      const email = h('input', { id: 'loginEmail', type: 'email', required: true, autocomplete: 'username', placeholder: 'voce@email.com', class: input });
      const password = h('input', { id: 'loginPassword', type: 'password', required: true, autocomplete: 'current-password', placeholder: '••••••••', class: input });
      const error = h('p', { id: 'loginError', role: 'alert', class: 'text-xs text-rose-400 font-medium min-h-4' });
      const button = h(
        'button',
        { type: 'submit', id: 'loginSubmit', class: 'w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-emerald-500/15 active:scale-[0.98]' },
        'Entrar'
      );

      const forgotLink = h(
        'button',
        {
          type: 'button',
          class: 'text-[11px] text-slate-400 hover:text-emerald-400 transition inline-block',
          onclick: () => {
            mode = 'forgot';
            renderView();
          },
        },
        'Esqueceu a senha?'
      );

      const form = h(
        'form',
        {
          class: 'space-y-4',
          onsubmit: async (e) => {
            e.preventDefault();
            error.textContent = '';
            button.disabled = true;
            button.textContent = 'Entrando…';
            try {
              await onSubmit(email.value.trim(), password.value);
            } catch (err) {
              error.textContent = err.message;
              button.disabled = false;
              button.textContent = 'Entrar';
            }
          },
        },
        h('div', {}, h('label', { for: 'loginEmail', class: 'block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5' }, 'E-mail'), email),
        h(
          'div',
          {},
          h('div', { class: 'flex items-center justify-between mb-1.5' },
            h('label', { for: 'loginPassword', class: 'block text-[11px] font-semibold uppercase tracking-wider text-slate-400' }, 'Senha'),
            forgotLink
          ),
          password
        ),
        error,
        button
      );
      formBox.append(form);
    } else if (mode === 'forgot') {
      const email = h('input', { id: 'resetEmail', type: 'email', required: true, placeholder: 'voce@email.com', class: input });
      const message = h('p', { id: 'resetMsg', class: 'text-xs font-medium min-h-4' });
      const button = h(
        'button',
        { type: 'submit', class: 'w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-emerald-500/15 active:scale-[0.98]' },
        'Enviar link de recuperação'
      );

      const backLink = h(
        'button',
        {
          type: 'button',
          class: 'text-xs text-slate-400 hover:text-white transition flex items-center justify-center gap-1.5 w-full pt-1',
          onclick: () => {
            mode = 'login';
            renderView();
          },
        },
        icon('fa-solid fa-arrow-left text-[10px]'),
        'Voltar para o login'
      );

      const form = h(
        'form',
        {
          class: 'space-y-4',
          onsubmit: async (e) => {
            e.preventDefault();
            message.textContent = '';
            message.className = 'text-xs font-medium min-h-4 text-slate-400';
            button.disabled = true;
            button.textContent = 'Enviando…';
            try {
              if (onResetPassword) await onResetPassword(email.value.trim());
              message.textContent = 'Link enviado! Verifique sua caixa de entrada e spam.';
              message.className = 'text-xs font-medium min-h-4 text-emerald-400';
              button.textContent = 'E-mail enviado';
            } catch (err) {
              message.textContent = err.message;
              message.className = 'text-xs font-medium min-h-4 text-rose-400';
              button.disabled = false;
              button.textContent = 'Enviar link de recuperação';
            }
          },
        },
        h('div', {},
          h('label', { for: 'resetEmail', class: 'block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5' }, 'Seu E-mail cadastrado'),
          email,
          h('p', { class: 'text-[11px] text-slate-500 mt-1.5' }, 'Enviaremos um link seguro para você redefinir sua senha.')
        ),
        message,
        button,
        backLink
      );
      formBox.append(form);
    } else if (mode === 'new-password') {
      const password = h('input', { id: 'newPassword', type: 'password', required: true, minlength: '6', placeholder: 'Nova senha (mínimo 6 dígitos)', class: input });
      const error = h('p', { id: 'newPasswordError', role: 'alert', class: 'text-xs text-rose-400 font-medium min-h-4' });
      const button = h(
        'button',
        { type: 'submit', class: 'w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-emerald-500/15 active:scale-[0.98]' },
        'Salvar nova senha'
      );

      const form = h(
        'form',
        {
          class: 'space-y-4',
          onsubmit: async (e) => {
            e.preventDefault();
            error.textContent = '';
            button.disabled = true;
            button.textContent = 'Salvando…';
            try {
              if (onSetNewPassword) await onSetNewPassword(password.value);
            } catch (err) {
              error.textContent = err.message;
              button.disabled = false;
              button.textContent = 'Salvar nova senha';
            }
          },
        },
        h('div', {},
          h('label', { for: 'newPassword', class: 'block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5' }, 'Digite a nova senha'),
          password
        ),
        error,
        button
      );
      formBox.append(form);
    }
  }

  renderView();
  container.append(formBox);

  return h(
    'main',
    { class: 'min-h-screen flex items-center justify-center px-4 py-10' },
    h(
      'section',
      { class: 'fade-up w-full max-w-sm bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-7 shadow-2xl' },
      h(
        'div',
        { class: 'flex flex-col items-center text-center mb-6' },
        h('div', { class: 'w-16 h-16 bg-slate-900 border border-emerald-500/30 rounded-2xl flex items-center justify-center mb-4 shadow-inner' },
          h('img', { src: '/ritmopix-logo.png', alt: '', class: 'w-14 h-14 object-contain' })),
        h('h1', { class: 'text-xl font-bold text-white tracking-tight' }, 'Ritmo', h('span', { class: 'text-emerald-400' }, 'Pix')),
        h('p', { class: 'text-xs text-slate-400 font-medium mt-1 flex items-center gap-1.5' }, icon('fa-solid fa-lock text-[10px]'), 'Controle mensal com segurança')
      ),
      container
    )
  );
}
