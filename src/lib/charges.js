import { diffDays } from './dates.js';

// Estado de uma cobrança em relação a "hoje".
// pago | atrasado | hoje | breve (vence em até 2 dias) | futuro
export function chargeState(charge, today) {
  if (charge.status === 'pago') return 'pago';
  const d = diffDays(today, charge.due_date);
  if (d < 0) return 'atrasado';
  if (d === 0) return 'hoje';
  if (d <= 2) return 'breve';
  return 'futuro';
}

const empty = () => ({ count: 0, sum: 0 });

// Resumo da tela principal. `month` é o mês atual (YYYY-MM).
export function summarize(charges, today, month) {
  const out = { overdue: empty(), today: empty(), paid: empty() };
  for (const c of charges) {
    const value = Number(c.amount) || 0;
    const state = chargeState(c, today);
    if (state === 'pago') {
      if (c.reference_month === month) {
        out.paid.count++;
        out.paid.sum += value;
      }
    } else if (state === 'atrasado') {
      out.overdue.count++;
      out.overdue.sum += value;
    } else if (state === 'hoje') {
      out.today.count++;
      out.today.sum += value;
    }
  }
  return out;
}

// Estatísticas de um mês para a tela de histórico.
export function monthStats(charges, today) {
  const stats = { total: 0, totalSum: 0, paid: 0, paidSum: 0, pending: 0, pendingSum: 0, overdue: 0, overdueSum: 0 };
  for (const c of charges) {
    const value = Number(c.amount) || 0;
    stats.total++;
    stats.totalSum += value;
    if (c.status === 'pago') {
      stats.paid++;
      stats.paidSum += value;
    } else {
      stats.pending++;
      stats.pendingSum += value;
      if (c.due_date < today) {
        stats.overdue++;
        stats.overdueSum += value;
      }
    }
  }
  stats.paidRate = stats.total ? Math.round((stats.paid / stats.total) * 100) : 0;
  return stats;
}

// Total recebido por mês: [{ month, paidSum, totalSum }] para os meses informados.
export function totalsByMonth(rows, months) {
  return months.map((month) => {
    let paidSum = 0;
    let totalSum = 0;
    for (const r of rows) {
      if (r.reference_month !== month) continue;
      const v = Number(r.amount) || 0;
      totalSum += v;
      if (r.status === 'pago') paidSum += v;
    }
    return { month, paidSum, totalSum };
  });
}

export function lastChargeMessage(charge) {
  const logs = (charge.message_log || []).filter((l) => l.type === 'charge');
  if (!logs.length) return null;
  return logs.reduce((a, b) => (a.sent_at > b.sent_at ? a : b)).sent_at;
}
