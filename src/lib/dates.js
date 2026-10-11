// Datas sempre no fuso de São Paulo, independente do relógio/fuso do dispositivo.
// Datas são trocadas como strings ISO (YYYY-MM-DD) e meses como YYYY-MM.

export const TZ = 'America/Sao_Paulo';

const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function todayISO(now = new Date()) {
  return dayFormatter.format(now);
}

export function monthOf(iso) {
  return iso.slice(0, 7);
}

export function daysInMonth(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

// Dia 31 em mês de 30 dias (ou fevereiro) vence no último dia do mês.
export function effectiveDueDay(day, month) {
  return Math.min(day, daysInMonth(month));
}

export function dueDateFor(month, day) {
  return `${month}-${String(effectiveDueDay(day, month)).padStart(2, '0')}`;
}

export function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function toUTC(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

// Quantos dias de `fromISO` até `toISO` (negativo se `toISO` já passou).
export function diffDays(fromISO, toISO) {
  return Math.round((toUTC(toISO) - toUTC(fromISO)) / 86400000);
}

export function dayOf(iso) {
  return Number(iso.slice(8, 10));
}

export function monthLabel(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function shortMonthLabel(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1))
    .toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' })
    .replace('.', '');
}

export function formatDateBR(iso) {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

export function formatDateTimeBR(isoTimestamp) {
  const d = new Date(isoTimestamp);
  const date = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: TZ });
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
  return { date, time };
}
