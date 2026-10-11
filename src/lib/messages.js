import { dayOf, diffDays, monthLabel, monthOf } from './dates.js';

export function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Mensagem de WhatsApp. type: 'charge' | 'receipt'.
export function buildMessage({ type, name, amount, dueDate, today, pixCode, pixKey }) {
  const valor = Number(amount).toFixed(2).replace('.', ',');
  const dueDay = dayOf(dueDate);
  const ref = monthLabel(monthOf(dueDate));

  if (type === 'receipt') {
    return (
      `Olá, *${name}*! Tudo bem?\n\n` +
      `Confirmando que seu pagamento de *R$ ${valor}* foi recebido com sucesso! 🎉\n\n` +
      `Sua mensalidade referente a ${ref} está quitada. Muito obrigado pela parceria!`
    );
  }

  const diff = diffDays(today, dueDate);
  const pix =
    `💰 *Valor:* R$ ${valor}\n\n` +
    `🔑 *Pix Copia e Cola${diff === 0 ? ' (basta copiar e colar no app do seu banco)' : ''}:*\n${pixCode}\n\n` +
    `${diff > 0 ? 'Chave Pix direta' : 'Ou chave Pix direta'}: *${pixKey}*\n\n`;

  if (diff < 0) {
    const mesAtrasado = monthOf(dueDate) === monthOf(today) ? '' : ` de ${ref}`;
    return (
      `Olá, *${name}*! Tudo bem por aí?\n\n` +
      `Passando só para te avisar que a mensalidade${mesAtrasado} do dia ${dueDay} ainda consta em aberto no meu controle.\n\n` +
      pix +
      `Aconteceu algum imprevisto? Se já pagou, só me enviar o comprovante por aqui. Obrigado!`
    );
  }
  if (diff === 0) {
    return (
      `Bom dia, *${name}*! Tudo joia?\n\n` +
      `Hoje é o dia do vencimento da sua mensalidade referente a este mês.\n\n` +
      pix +
      `Assim que transferir, é só me mandar o comprovante por aqui. Valeu!`
    );
  }
  return (
    `Olá, *${name}*! Tudo certo?\n\n` +
    `Passando para alinhar nossa agenda e já deixar à mão as informações da mensalidade (vencimento dia ${dueDay}):\n\n` +
    pix +
    `Qualquer dúvida ou ajuste nos horários, só me avisar!`
  );
}

export function whatsappUrl(phone, text) {
  return 'https://wa.me/55' + phone + '?text=' + encodeURIComponent(text);
}
