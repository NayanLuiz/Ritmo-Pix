// supabase/functions/create-asaas-pix/index.ts
// Gera cobrança Pix avulsa no Asaas e retorna QR Code e Copia e Cola para o RitmoPix
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY") || "";

const ASAAS_API_URL = "https://api.asaas.com/v3";
const PLAN_PRICE = 29.90;

serve(async (req) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers,
    });
  }

  try {
    const { studioId, studioName, email, whatsapp, cpfCnpj } = await req.json();

    const userId = studioId;
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Parâmetro userId / studioId é obrigatório" }),
        { status: 400, headers }
      );
    }

    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanEmail) {
      return new Response(
        JSON.stringify({ error: "Parâmetro email é obrigatório" }),
        { status: 400, headers }
      );
    }

    const cleanCpfCnpj = (cpfCnpj || "").replace(/\D/g, "");
    if (!cleanCpfCnpj || (cleanCpfCnpj.length !== 11 && cleanCpfCnpj.length !== 14)) {
      return new Response(
        JSON.stringify({
          error: "CPF (11 dígitos) ou CNPJ (14 dígitos) inválido. Por favor, informe um documento válido.",
        }),
        { status: 400, headers }
      );
    }

    const cleanPhone = whatsapp ? whatsapp.replace(/\D/g, "") : "";

    // 1. Verificar se o cliente já existe no Asaas por e-mail ou CPF
    let customerId = "";
    const searchRes = await fetch(
      `${ASAAS_API_URL}/customers?email=${encodeURIComponent(cleanEmail)}`,
      {
        headers: { access_token: ASAAS_API_KEY },
      }
    );
    const searchData = await searchRes.json();

    if (searchData.data && searchData.data.length > 0) {
      customerId = searchData.data[0].id;
      if (searchData.data[0].cpfCnpj !== cleanCpfCnpj) {
        await fetch(`${ASAAS_API_URL}/customers/${customerId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            access_token: ASAAS_API_KEY,
          },
          body: JSON.stringify({
            cpfCnpj: cleanCpfCnpj,
            mobilePhone: cleanPhone.length >= 10 ? cleanPhone : undefined,
          }),
        });
      }
    } else {
      const searchCpfRes = await fetch(
        `${ASAAS_API_URL}/customers?cpfCnpj=${cleanCpfCnpj}`,
        {
          headers: { access_token: ASAAS_API_KEY },
        }
      );
      const searchCpfData = await searchCpfRes.json();

      if (searchCpfData.data && searchCpfData.data.length > 0) {
        customerId = searchCpfData.data[0].id;
      } else {
        const createCustomerRes = await fetch(`${ASAAS_API_URL}/customers`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            access_token: ASAAS_API_KEY,
          },
          body: JSON.stringify({
            name: studioName || "Usuário RitmoPix",
            email: cleanEmail,
            mobilePhone: cleanPhone.length >= 10 ? cleanPhone : undefined,
            cpfCnpj: cleanCpfCnpj,
            notificationDisabled: true,
          }),
        });

        const newCustomer = await createCustomerRes.json();
        if (!newCustomer.id) {
          throw new Error(newCustomer.errors?.[0]?.description || "Falha ao registrar cliente no Asaas");
        }
        customerId = newCustomer.id;
      }
    }

    // 2. Verificar se já existe uma cobrança PENDENTE para este usuário (externalReference)
    let paymentId = "";
    let paymentValue = PLAN_PRICE;

    const pendingPaymentsRes = await fetch(
      `${ASAAS_API_URL}/payments?externalReference=${encodeURIComponent(userId)}&status=PENDING`,
      {
        headers: { access_token: ASAAS_API_KEY },
      }
    );
    const pendingData = await pendingPaymentsRes.json();

    if (pendingData.data && pendingData.data.length > 0) {
      paymentId = pendingData.data[0].id;
      paymentValue = pendingData.data[0].value || PLAN_PRICE;
    } else {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 3);
      const dueDateStr = dueDate.toISOString().split("T")[0];

      // 3. Criar cobrança Pix oficial
      const paymentRes = await fetch(`${ASAAS_API_URL}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          access_token: ASAAS_API_KEY,
        },
        body: JSON.stringify({
          customer: customerId,
          billingType: "PIX",
          value: PLAN_PRICE,
          dueDate: dueDateStr,
          description: `Assinatura Mensal RitmoPix PRO • ${studioName || 'Usuário'}`,
          externalReference: userId,
        }),
      });

      const paymentData = await paymentRes.json();
      if (!paymentData.id) {
        throw new Error(paymentData.errors?.[0]?.description || "Falha ao gerar cobrança no Asaas");
      }
      paymentId = paymentData.id;
      paymentValue = paymentData.value || PLAN_PRICE;
    }

    // 4. Buscar QR Code Pix e Copia e Cola da cobrança
    const qrRes = await fetch(`${ASAAS_API_URL}/payments/${paymentId}/pixQrCode`, {
      headers: { access_token: ASAAS_API_KEY },
    });
    const qrData = await qrRes.json();

    return new Response(
      JSON.stringify({
        success: true,
        paymentId,
        encodedImage: qrData.encodedImage,
        payload: qrData.payload,
        expirationDate: qrData.expirationDate,
        value: paymentValue,
      }),
      { status: 200, headers }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Erro interno" }), {
      status: 500,
      headers,
    });
  }
});
