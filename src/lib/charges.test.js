import { describe, expect, it } from 'vitest';
import { chargeState, lastChargeMessage, monthStats, summarize, totalsByMonth } from './charges.js';
import { buildMessage } from './messages.js';
import { validateBackup } from './store.js';

const mk = (over) => ({ amount: 100, status: 'pendente', reference_month: '2026-10', due_date: '2026-10-10', ...over });
const TODAY = '2026-10-10';

describe('chargeState', () => {
  it('classifica pelo vencimento', () => {
    expect(chargeState(mk({ status: 'pago' }), TODAY)).toBe('pago');
    expect(chargeState(mk({ due_date: '2026-10-09' }), TODAY)).toBe('atrasado');
    expect(chargeState(mk({ due_date: '2026-10-10' }), TODAY)).toBe('hoje');
    expect(chargeState(mk({ due_date: '2026-10-12' }), TODAY)).toBe('breve');
    expect(chargeState(mk({ due_date: '2026-10-13' }), TODAY)).toBe('futuro');
  });
  it('cobrança atrasada de mês anterior continua atrasada', () => {
    expect(chargeState(mk({ reference_month: '2026-08', due_date: '2026-08-15' }), TODAY)).toBe('atrasado');
  });
});

describe('summarize', () => {
  it('soma atrasados, hoje e recebido do mês', () => {
    const list = [
      mk({ due_date: '2026-10-01' }),
      mk({ due_date: '2026-08-20', reference_month: '2026-08', amount: 50 }),
      mk({ due_date: '2026-10-10', amount: 30 }),
      mk({ status: 'pago', amount: 200 }),
      mk({ status: 'pago', amount: 999, reference_month: '2026-09', due_date: '2026-09-10' }),
    ];
    const s = summarize(list, TODAY, '2026-10');
    expect(s.overdue).toEqual({ count: 2, sum: 150 });
    expect(s.today).toEqual({ count: 1, sum: 30 });
    expect(s.paid).toEqual({ count: 1, sum: 200 });
  });
});

describe('monthStats / totalsByMonth', () => {
  const list = [mk({ status: 'pago' }), mk({ due_date: '2026-10-02' }), mk({ due_date: '2026-10-28', amount: 50 })];
  it('calcula taxa e inadimplência', () => {
    const s = monthStats(list, TODAY);
    expect(s).toMatchObject({ total: 3, paid: 1, paidSum: 100, pending: 2, pendingSum: 150, overdue: 1, overdueSum: 100, paidRate: 33 });
  });
  it('agrupa por mês, inclusive meses vazios', () => {
    const t = totalsByMonth([mk({ status: 'pago' }), mk({ amount: 40 })], ['2026-09', '2026-10']);
    expect(t).toEqual([
      { month: '2026-09', paidSum: 0, totalSum: 0 },
      { month: '2026-10', paidSum: 100, totalSum: 140 },
    ]);
  });
});

describe('lastChargeMessage', () => {
  it('ignora recibos e pega o mais recente', () => {
    const c = { message_log: [
      { type: 'charge', sent_at: '2026-10-01T10:00:00Z' },
      { type: 'receipt', sent_at: '2026-10-09T10:00:00Z' },
      { type: 'charge', sent_at: '2026-10-05T10:00:00Z' },
    ] };
    expect(lastChargeMessage(c)).toBe('2026-10-05T10:00:00Z');
    expect(lastChargeMessage({ message_log: [] })).toBeNull();
  });
});

describe('buildMessage', () => {
  const base = { name: 'Ana', amount: 150, pixCode: 'PIXCODE', pixKey: '+5584999887766', today: TODAY };
  it('mensagem de atraso cita o mês quando é de mês anterior', () => {
    const m = buildMessage({ ...base, type: 'charge', dueDate: '2026-08-15' });
    expect(m).toContain('mensalidade de agosto de 2026 do dia 15');
    expect(m).toContain('R$ 150,00');
  });
  it('mensagem de hoje e de aviso prévio', () => {
    expect(buildMessage({ ...base, type: 'charge', dueDate: TODAY })).toContain('Hoje é o dia do vencimento');
    expect(buildMessage({ ...base, type: 'charge', dueDate: '2026-10-20' })).toContain('vencimento dia 20');
  });
  it('recibo não inclui Pix', () => {
    const m = buildMessage({ ...base, type: 'receipt', dueDate: TODAY });
    expect(m).toContain('quitada');
    expect(m).not.toContain('PIXCODE');
  });
});

describe('validateBackup', () => {
  const id = (n) => `00000000-0000-4000-8000-00000000000${n}`;
  const good = () => ({
    version: 2,
    settings: [],
    clients: [{ id: id(1), name: 'Ana', phone: '84999887766', amount: 10, due_day: 5 }],
    charges: [{ id: id(2), client_id: id(1), reference_month: '2026-10', due_date: '2026-10-05', amount: 10, status: 'pendente' }],
    messageLog: [{ id: id(3), charge_id: id(2), type: 'charge' }],
  });
  it('aceita backup consistente', () => {
    expect(() => validateBackup(good())).not.toThrow();
  });
  it('rejeita cobrança de cliente inexistente', () => {
    const d = good();
    d.charges[0].client_id = id(9);
    expect(() => validateBackup(d)).toThrow();
  });
  it('rejeita versão antiga e lixo', () => {
    expect(() => validateBackup({ config: {}, clients: [] })).toThrow();
    expect(() => validateBackup(null)).toThrow();
  });
});
