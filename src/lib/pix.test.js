import { describe, expect, it } from 'vitest';
import { crc16, generatePixCopiaECola, inferPixKeyType, normalizePhone, sanitizePixKey } from './pix.js';

describe('crc16', () => {
  it('bate com o vetor de teste padrão CRC-16/CCITT-FALSE', () => {
    expect(crc16('123456789')).toBe('29B1');
  });
});

describe('sanitizePixKey', () => {
  it('aceita CPF com máscara', () => {
    expect(sanitizePixKey('123.456.789-09', 'cpf')).toBe('12345678909');
  });
  it('exige +55 no celular', () => {
    expect(sanitizePixKey('84999887766', 'phone')).toBe('');
    expect(sanitizePixKey('+5584999887766', 'phone')).toBe('+5584999887766');
  });
  it('rejeita tipo incompatível com a chave', () => {
    expect(sanitizePixKey('a@b.com', 'cpf')).toBe('');
    expect(sanitizePixKey('', 'email')).toBe('');
  });
  it('aceita e-mail e chave aleatória', () => {
    expect(sanitizePixKey('a@b.com', 'email')).toBe('a@b.com');
    expect(sanitizePixKey('123e4567-e89b-12d3-a456-426614174000', 'random')).toBe('123e4567-e89b-12d3-a456-426614174000');
  });
});

describe('inferPixKeyType', () => {
  it('não adivinha CPF/celular com 11 dígitos', () => {
    expect(inferPixKeyType('12345678909')).toBe('');
  });
  it('reconhece celular com +55 e e-mail', () => {
    expect(inferPixKeyType('+5584999887766')).toBe('phone');
    expect(inferPixKeyType('a@b.com')).toBe('email');
  });
});

describe('generatePixCopiaECola', () => {
  const code = generatePixCopiaECola('+5584999887766', 'phone', 'Nayan Luiz', 'Natal', 150);

  it('retorna vazio para chave inválida', () => {
    expect(generatePixCopiaECola('xx', 'cpf', 'A', 'B', 10)).toBe('');
  });
  it('contém o valor, o nome sem acento e a cidade', () => {
    expect(code).toContain('5406150.00');
    expect(code).toContain('NAYAN LUIZ');
    expect(code).toContain('NATAL');
  });
  it('termina com um CRC válido sobre o restante do payload', () => {
    const body = code.slice(0, -4);
    expect(body.endsWith('6304')).toBe(true);
    expect(code.slice(-4)).toBe(crc16(body));
  });
});

describe('normalizePhone', () => {
  it('remove máscara e o 55', () => {
    expect(normalizePhone('+55 (84) 99988-7766')).toBe('84999887766');
  });
  it('rejeita números curtos', () => {
    expect(normalizePhone('12345')).toBe('');
  });
});
