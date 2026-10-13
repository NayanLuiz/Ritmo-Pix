import { describe, it, expect } from 'vitest';
import { getPlanDetails, canOperate, TRIAL_DURATION_DAYS } from './subscription.js';

describe('subscription logic', () => {
  it('reconhece superadmin pelo e-mail nayanlima27@gmail.com', () => {
    const details = getPlanDetails({}, { email: 'nayanlima27@gmail.com' });
    expect(details.isSuperAdmin).toBe(true);
    expect(details.isPro).toBe(true);
    expect(details.isTrial).toBe(false);
    expect(details.isExpired).toBe(false);
    expect(canOperate({}, { email: 'nayanlima27@gmail.com' })).toBe(true);
  });

  it('reconhece usuário com plano PRO ativo', () => {
    const details = getPlanDetails({ plan_status: 'pro' }, { email: 'cliente@exemplo.com' });
    expect(details.isPro).toBe(true);
    expect(details.isExpired).toBe(false);
    expect(details.statusLabel).toBe('Plano PRO Ativo');
    expect(canOperate({ plan_status: 'pro' }, { email: 'cliente@exemplo.com' })).toBe(true);
  });

  it('permite acesso durante a degustação de 5 dias', () => {
    const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const details = getPlanDetails({ plan_status: 'free', trial_ends_at: futureDate }, { email: 'novo@exemplo.com' });
    expect(details.isPro).toBe(false);
    expect(details.isTrial).toBe(true);
    expect(details.isExpired).toBe(false);
    expect(details.daysRemaining).toBe(3);
    expect(canOperate({ plan_status: 'free', trial_ends_at: futureDate }, { email: 'novo@exemplo.com' })).toBe(true);
  });

  it('bloqueia acesso se a degustação expirou e o plano for free', () => {
    const pastDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
    const details = getPlanDetails({ plan_status: 'free', trial_ends_at: pastDate }, { email: 'expirado@exemplo.com' });
    expect(details.isPro).toBe(false);
    expect(details.isTrial).toBe(false);
    expect(details.isExpired).toBe(true);
    expect(details.daysRemaining).toBe(0);
    expect(details.statusLabel).toBe('Degustação Expirada');
    expect(canOperate({ plan_status: 'free', trial_ends_at: pastDate }, { email: 'expirado@exemplo.com' })).toBe(false);
  });
});
