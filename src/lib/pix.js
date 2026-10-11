// Utilitários de Pix: validação de chave e geração do "Pix Copia e Cola" (BR Code / EMV).

const PIX_TYPES = ['cpf', 'cnpj', 'phone', 'email', 'random'];
const UUID_RE = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export { PIX_TYPES };

// Chave de celular precisa do +55; 11 dígitos sozinhos são ambíguos com CPF.
export function sanitizePixKey(key, type) {
  const value = String(key || '').trim();
  const document = value.replace(/[.\-/\s]/g, '').toUpperCase();
  if (type === 'cpf' && /^[\d.\-\s]+$/.test(value) && /^\d{11}$/.test(document)) return document;
  if (type === 'cnpj' && /^[\dA-Za-z.\-/\s]+$/.test(value) && /^[A-Z0-9]{12}\d{2}$/.test(document)) return document;
  if (type === 'phone' && /^\+55\d{11}$/.test(value)) return value;
  if (type === 'email' && new TextEncoder().encode(value).length <= 77 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return value;
  if (type === 'random' && UUID_RE.test(value)) return value;
  return '';
}

export function inferPixKeyType(key) {
  if (/^\+55\d{11}$/.test(key)) return 'phone';
  if (key.includes('@')) return 'email';
  if (UUID_RE.test(key)) return 'random';
  if (/^[A-Z0-9.\-/\s]{14,18}$/i.test(key) && /^[A-Z0-9]{12}\d{2}$/.test(key.replace(/[.\-/\s]/g, '').toUpperCase())) return 'cnpj';
  return ''; // CPF e celular nacional têm ambos 11 dígitos: exigir escolha explícita.
}

// CRC16-CCITT (poly 0x1021, init 0xFFFF), exigido pelo BR Code.
export function crc16(text) {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(text)) {
    crc ^= byte << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function cleanField(value, fallback, max) {
  return (
    String(value || fallback)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, '')
      .trim()
      .substring(0, max) || fallback
  );
}

export function generatePixCopiaECola(pixKey, pixType, merchantName, merchantCity, amount) {
  const sanitizedKey = sanitizePixKey(pixKey, pixType);
  if (!sanitizedKey) return '';

  const encoder = new TextEncoder();
  const emv = (id, val) => id + String(encoder.encode(val).length).padStart(2, '0') + val;

  const merchantAccount = emv('26', emv('00', 'br.gov.bcb.pix') + emv('01', sanitizedKey));
  const payload =
    emv('00', '01') +
    merchantAccount +
    emv('52', '0000') +
    emv('53', '986') +
    emv('54', Number(amount || 0).toFixed(2)) +
    emv('58', 'BR') +
    emv('59', cleanField(merchantName, 'RECEBEDOR', 25)) +
    emv('60', cleanField(merchantCity, 'BRASIL', 15)) +
    emv('62', emv('05', '***')) +
    '6304';

  return payload + crc16(payload);
}

export function normalizePhone(phone) {
  let digits = String(phone || '').replace(/\D/g, '');
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) digits = digits.slice(2);
  return /^\d{10,11}$/.test(digits) ? digits : '';
}
