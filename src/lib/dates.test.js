import { describe, expect, it } from 'vitest';
import { daysInMonth, diffDays, dueDateFor, effectiveDueDay, monthLabel, shiftMonth, todayISO } from './dates.js';

describe('todayISO (fuso de São Paulo)', () => {
  it('usa o dia local, não o UTC', () => {
    // 01:30 UTC de 11/10 ainda é 22:30 de 10/10 em São Paulo (UTC-3).
    expect(todayISO(new Date('2026-10-11T01:30:00Z'))).toBe('2026-10-10');
    expect(todayISO(new Date('2026-10-11T03:30:00Z'))).toBe('2026-10-11');
  });
});

describe('vencimento no fim do mês', () => {
  it('dia 31 vira o último dia em meses curtos', () => {
    expect(dueDateFor('2026-11', 31)).toBe('2026-11-30');
    expect(dueDateFor('2027-02', 31)).toBe('2027-02-28');
    expect(dueDateFor('2028-02', 31)).toBe('2028-02-29');
    expect(dueDateFor('2026-12', 31)).toBe('2026-12-31');
  });
  it('não altera dias que existem no mês', () => {
    expect(effectiveDueDay(10, '2027-02')).toBe(10);
    expect(dueDateFor('2026-10', 5)).toBe('2026-10-05');
  });
  it('conta dias do mês, inclusive ano bissexto', () => {
    expect(daysInMonth('2028-02')).toBe(29);
    expect(daysInMonth('2027-02')).toBe(28);
  });
});

describe('shiftMonth / diffDays', () => {
  it('atravessa virada de ano', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-10', -5)).toBe('2026-05');
  });
  it('calcula diferença em dias', () => {
    expect(diffDays('2026-10-10', '2026-10-12')).toBe(2);
    expect(diffDays('2026-10-10', '2026-10-09')).toBe(-1);
    expect(diffDays('2026-02-27', '2026-03-01')).toBe(2);
  });
});

describe('monthLabel', () => {
  it('escreve o mês em português', () => {
    expect(monthLabel('2026-10')).toBe('outubro de 2026');
  });
});
