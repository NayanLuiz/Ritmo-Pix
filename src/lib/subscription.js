// src/lib/subscription.js
// Regras de negócio de assinatura, plano PRO e período de degustação (trial)

export const TRIAL_DURATION_DAYS = 5;
export const SUPERADMIN_EMAIL = 'nayanlima27@gmail.com';
export const PLAN_PRO_PRICE = 29.90;
export const ASAAS_PIX_KEY = 'nayanlima16@gmail.com';
export const ASAAS_RECEIVER_NAME = 'NAYAN LIMA';
export const ASAAS_RECEIVER_CITY = 'SAO PAULO';
export const WHATSAPP_SUPPORT_PHONE = '5584999053828';

/**
 * @typedef {Object} PlanDetails
 * @property {boolean} isSuperAdmin
 * @property {boolean} isPro
 * @property {boolean} isTrial
 * @property {boolean} isExpired
 * @property {number} daysRemaining
 * @property {Date|null} trialEndsAt
 * @property {string} statusLabel
 */

/**
 * Avalia o status do plano e o período de degustação de 5 dias do usuário.
 * @param {Object} settings - Configurações do usuário (tabela settings)
 * @param {Object} [user] - Objeto do usuário autenticado no Supabase Auth
 * @returns {PlanDetails}
 */
export function getPlanDetails(settings, user) {
  const email = (user?.email || settings?.email || '').toLowerCase().trim();

  // Superadmin vitalício (acesso irrestrito)
  if (
    email === SUPERADMIN_EMAIL ||
    settings?.role === 'superadmin' ||
    settings?.is_superadmin === true
  ) {
    return {
      isSuperAdmin: true,
      isPro: true,
      isTrial: false,
      isExpired: false,
      daysRemaining: Infinity,
      trialEndsAt: null,
      statusLabel: 'Superadmin Vitalício',
    };
  }

  // Plano PRO confirmado
  if (settings?.plan_status === 'pro') {
    return {
      isSuperAdmin: false,
      isPro: true,
      isTrial: false,
      isExpired: false,
      daysRemaining: Infinity,
      trialEndsAt: null,
      statusLabel: 'Plano PRO Ativo',
    };
  }

  // Período de degustação de 5 dias
  let trialEndsAt;
  if (settings?.trial_ends_at) {
    trialEndsAt = new Date(settings.trial_ends_at);
  } else if (settings?.created_at || user?.created_at) {
    const created = new Date(settings?.created_at || user?.created_at);
    trialEndsAt = new Date(created.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);
  } else {
    trialEndsAt = new Date(Date.now() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);
  }

  const now = Date.now();
  const msDiff = trialEndsAt.getTime() - now;
  const isExpired = msDiff <= 0;
  const daysRemaining = isExpired ? 0 : Math.max(1, Math.ceil(msDiff / (1000 * 60 * 60 * 24)));

  return {
    isSuperAdmin: false,
    isPro: false,
    isTrial: !isExpired,
    isExpired,
    daysRemaining,
    trialEndsAt,
    statusLabel: isExpired
      ? 'Degustação Expirada'
      : `Degustação: ${daysRemaining} ${daysRemaining === 1 ? 'dia restante' : 'dias restantes'}`,
  };
}

/**
 * Retorna true se o usuário tem permissão para operar no app
 * (Plano PRO ativo ou degustação de 5 dias ativa).
 * Se expirado, retorna false (bloqueio).
 * @param {Object} settings
 * @param {Object} [user]
 * @returns {boolean}
 */
export function canOperate(settings, user) {
  const details = getPlanDetails(settings, user);
  return details.isPro || details.isTrial;
}
