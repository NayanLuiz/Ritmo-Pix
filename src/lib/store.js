// Camada de dados: toda a comunicação com o Supabase passa por aqui.
// As funções lançam erro em falhas; a interface decide como mostrar.
import { supabase } from './supabase.js';
import { dueDateFor } from './dates.js';
import { inferPixKeyType } from './pix.js';

function check({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

export const DEFAULT_SETTINGS = {
  pix_key: '',
  pix_key_type: '',
  merchant_name: '',
  merchant_city: '',
};

// ---------- Autenticação ----------
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message);
  return data.session;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });
  if (error) throw new Error(error.message);
}

export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}

// ---------- Configurações ----------
export async function loadSettings() {
  const row = check(await supabase.from('settings').select('*').maybeSingle());
  return { ...DEFAULT_SETTINGS, ...(row || {}) };
}

export async function saveSettings(userId, s) {
  check(
    await supabase.from('settings').upsert(
      {
        user_id: userId,
        pix_key: s.pix_key,
        pix_key_type: s.pix_key_type,
        merchant_name: s.merchant_name,
        merchant_city: s.merchant_city,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
  );
}

// ---------- Clientes ----------
export async function listClients() {
  return check(await supabase.from('clients').select('*').order('name'));
}

// Cria ou edita o cliente e sincroniza a cobrança pendente do mês atual.
export async function saveClient(client, month) {
  const fields = {
    name: client.name,
    phone: client.phone,
    amount: client.amount,
    due_day: client.due_day,
  };
  let id = client.id;
  if (id) {
    check(await supabase.from('clients').update(fields).eq('id', id));
    // Só mexe na cobrança ainda pendente deste mês; meses pagos/passados ficam intactos.
    check(
      await supabase
        .from('charges')
        .update({ amount: client.amount, due_date: dueDateFor(month, client.due_day) })
        .eq('client_id', id)
        .eq('reference_month', month)
        .eq('status', 'pendente')
    );
  } else {
    const row = check(await supabase.from('clients').insert(fields).select('id').single());
    id = row.id;
  }
  await ensureMonth(month);
  return id;
}

export async function setClientActive(id, active, today) {
  check(await supabase.from('clients').update({ active }).eq('id', id));
  if (!active) {
    // Para de cobrar o futuro; o que já venceu e o histórico continuam.
    check(await supabase.from('charges').delete().eq('client_id', id).eq('status', 'pendente').gte('due_date', today));
  }
}

// ---------- Cobranças ----------
export async function ensureMonth(month) {
  check(await supabase.rpc('ensure_month_charges', { ref_month: month }));
}

const CHARGE_SELECT = '*, clients(name, phone), message_log(type, sent_at)';

// Cobranças do mês atual + qualquer cobrança pendente já vencida (de meses anteriores).
export async function listOpenCharges(month, today) {
  return check(
    await supabase
      .from('charges')
      .select(CHARGE_SELECT)
      .or(`reference_month.eq.${month},and(status.eq.pendente,due_date.lt.${today})`)
      .order('due_date')
  );
}

export async function listMonthCharges(month) {
  return check(await supabase.from('charges').select(CHARGE_SELECT).eq('reference_month', month).order('due_date'));
}

export async function listChargesRange(fromMonth, toMonth) {
  return check(
    await supabase
      .from('charges')
      .select('reference_month, status, amount')
      .gte('reference_month', fromMonth)
      .lte('reference_month', toMonth)
  );
}

export async function setChargePaid(id, paid) {
  check(
    await supabase
      .from('charges')
      .update({ status: paid ? 'pago' : 'pendente', paid_at: paid ? new Date().toISOString() : null })
      .eq('id', id)
  );
}

export async function logMessage(chargeId, type) {
  check(await supabase.from('message_log').insert({ charge_id: chargeId, type }));
}

// ---------- Backup ----------
export async function exportAll() {
  const [settings, clients, charges, messageLog] = await Promise.all([
    supabase.from('settings').select('*'),
    supabase.from('clients').select('*'),
    supabase.from('charges').select('*'),
    supabase.from('message_log').select('*'),
  ]).then((all) => all.map(check));
  return { version: 2, exportedAt: new Date().toISOString(), settings, clients, charges, messageLog };
}

const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

// Valida o arquivo inteiro antes de gravar qualquer coisa.
export function validateBackup(data) {
  if (!data || typeof data !== 'object' || data.version !== 2) throw new Error('Arquivo de backup inválido ou de outra versão.');
  for (const key of ['settings', 'clients', 'charges', 'messageLog']) {
    if (!Array.isArray(data[key])) throw new Error('Estrutura do backup inválida.');
  }
  const clientIds = new Set();
  for (const c of data.clients) {
    if (!UUID.test(c.id) || typeof c.name !== 'string' || !/^\d{10,11}$/.test(c.phone) || !(Number(c.amount) >= 0.01) ||
      !Number.isInteger(c.due_day) || c.due_day < 1 || c.due_day > 31) {
      throw new Error('Cliente inválido no backup.');
    }
    clientIds.add(c.id);
  }
  const chargeIds = new Set();
  for (const c of data.charges) {
    if (!UUID.test(c.id) || !clientIds.has(c.client_id) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(c.reference_month) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(c.due_date) || !(Number(c.amount) >= 0.01) || !['pendente', 'pago'].includes(c.status)) {
      throw new Error('Cobrança inválida no backup.');
    }
    chargeIds.add(c.id);
  }
  for (const m of data.messageLog) {
    if (!UUID.test(m.id) || !chargeIds.has(m.charge_id) || !['charge', 'receipt'].includes(m.type)) {
      throw new Error('Registro de mensagem inválido no backup.');
    }
  }
  return data;
}

// Restaura por upsert (preserva ids) e sempre grava com o usuário logado.
export async function importAll(userId, data) {
  validateBackup(data);
  const own = (rows) => rows.map((r) => ({ ...r, user_id: userId }));
  if (data.settings[0]) {
    const s = data.settings[0];
    await saveSettings(userId, { ...DEFAULT_SETTINGS, ...s, pix_key_type: s.pix_key_type || inferPixKeyType(s.pix_key || '') });
  }
  if (data.clients.length) check(await supabase.from('clients').upsert(own(data.clients), { onConflict: 'id' }));
  if (data.charges.length) check(await supabase.from('charges').upsert(own(data.charges), { onConflict: 'id' }));
  if (data.messageLog.length) check(await supabase.from('message_log').upsert(own(data.messageLog), { onConflict: 'id' }));
}
