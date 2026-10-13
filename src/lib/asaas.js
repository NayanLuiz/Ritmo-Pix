// src/lib/asaas.js
// Integração de pagamento Pix Asaas com fallback dinâmico e QR Code

import QRCode from 'qrcode';
import { supabase } from './supabase.js';
import { generatePixCopiaECola } from './pix.js';
import {
  ASAAS_PIX_KEY,
  ASAAS_RECEIVER_NAME,
  ASAAS_RECEIVER_CITY,
  PLAN_PRO_PRICE,
} from './subscription.js';

/**
 * @typedef {Object} PixChargeResult
 * @property {boolean} success
 * @property {string} [paymentId]
 * @property {string} [encodedImage]
 * @property {string} [payload]
 * @property {string} [expirationDate]
 * @property {number} value
 * @property {boolean} [isDynamicAsaas]
 * @property {string} [error]
 */

/**
 * Solicita cobrança Pix no Asaas via Edge Function ou gera BR Code direto com QRCode
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.email
 * @param {string} [params.merchantName]
 * @param {string} [params.whatsapp]
 * @param {string} params.cpfCnpj
 * @returns {Promise<PixChargeResult>}
 */
export async function generateRitmoPixCharge({
  userId,
  email,
  merchantName = 'Usuário RitmoPix',
  whatsapp = '',
  cpfCnpj = '',
}) {
  const cleanCpfCnpj = String(cpfCnpj || '').replace(/\D/g, '');

  // 1. Tentar gerar via Edge Function do Supabase (se configurada e ativa)
  if (supabase) {
    try {
      const { data, error } = await supabase.functions.invoke('create-asaas-pix', {
        body: {
          studioId: userId,
          studioName: merchantName,
          email,
          whatsapp,
          cpfCnpj: cleanCpfCnpj,
        },
      });

      if (!error && data?.success && data?.payload) {
        let qrImage = data.encodedImage
          ? `data:image/png;base64,${data.encodedImage}`
          : await QRCode.toDataURL(data.payload, { margin: 2, width: 256 });

        return {
          success: true,
          paymentId: data.paymentId,
          encodedImage: qrImage,
          payload: data.payload,
          expirationDate: data.expirationDate,
          value: data.value || PLAN_PRO_PRICE,
          isDynamicAsaas: true,
        };
      }
    } catch (err) {
      console.warn('Aviso ao invocar Edge Function create-asaas-pix:', err?.message || err);
    }
  }

  // 2. Fallback robusto instantâneo com BR Code oficial direto para a conta Asaas
  try {
    const fallbackPayload = generatePixCopiaECola(
      ASAAS_PIX_KEY,
      'email',
      ASAAS_RECEIVER_NAME,
      ASAAS_RECEIVER_CITY,
      PLAN_PRO_PRICE
    );

    if (!fallbackPayload) {
      throw new Error('Falha ao calcular código Pix BR Code.');
    }

    const qrImage = await QRCode.toDataURL(fallbackPayload, {
      margin: 2,
      width: 256,
      color: { dark: '#000000', light: '#ffffff' },
    });

    return {
      success: true,
      payload: fallbackPayload,
      encodedImage: qrImage,
      value: PLAN_PRO_PRICE,
      isDynamicAsaas: false,
    };
  } catch (err) {
    return {
      success: false,
      value: PLAN_PRO_PRICE,
      error: err?.message || 'Não foi possível gerar o código Pix no momento.',
    };
  }
}
