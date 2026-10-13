// supabase/functions/pix-webhook/index.ts
// Edge Function para processamento de webhooks Pix Asaas para o RitmoPix
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY") || "";

serve(async (req) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
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
    const webhookSecret = Deno.env.get("WEBHOOK_SECRET");
    if (webhookSecret) {
      const incomingSecret =
        req.headers.get("asaas-access-token") ||
        req.headers.get("x-webhook-token") ||
        new URL(req.url).searchParams.get("secret");

      if (incomingSecret !== webhookSecret) {
        return new Response(JSON.stringify({ error: "Unauthorized webhook token" }), {
          status: 401,
          headers,
        });
      }
    }

    const event = await req.json();

    const isPaymentConfirmed =
      event.event === "PAYMENT_RECEIVED" ||
      event.event === "PAYMENT_CONFIRMED" ||
      event.action === "payment.created" ||
      event.status === "approved" ||
      event.data?.status === "approved";

    if (!isPaymentConfirmed) {
      return new Response(JSON.stringify({ received: true, ignored: true }), {
        status: 200,
        headers,
      });
    }

    // 1. Tentar obter pelo externalReference (user_id do RitmoPix)
    const externalReference =
      event.payment?.externalReference ||
      event.externalReference;

    if (externalReference) {
      const { data: updatedSettings, error: extErr } = await supabase
        .from("settings")
        .update({ plan_status: "pro" })
        .eq("user_id", externalReference)
        .select("user_id, merchant_name");

      if (!extErr && updatedSettings && updatedSettings.length > 0) {
        return new Response(
          JSON.stringify({
            status: "success",
            message: `Plano RitmoPix atualizado para PRO com sucesso via externalReference: ${externalReference}`,
          }),
          { status: 200, headers }
        );
      }
    }

    // 2. Tentar obter pelo e-mail do pagador e localizar auth.users
    let customerEmail =
      event.payment?.customerEmail ||
      event.data?.payer?.email ||
      event.payer?.email ||
      event.customer?.email;

    if (!customerEmail && event.payment?.customer && ASAAS_API_KEY) {
      try {
        const asaasCustomerRes = await fetch(
          `https://api.asaas.com/v3/customers/${event.payment.customer}`,
          { headers: { access_token: ASAAS_API_KEY } }
        );
        const asaasCustomer = await asaasCustomerRes.json();
        if (asaasCustomer?.email) {
          customerEmail = asaasCustomer.email;
        }
      } catch (e) {
        console.warn("Aviso ao buscar cliente no Asaas:", e);
      }
    }

    if (customerEmail) {
      const cleanEmail = String(customerEmail).trim().toLowerCase();

      // Buscar user_id em auth.users via RPC ou query administrativa
      const { data: usersData, error: userSearchErr } = await supabase.auth.admin.listUsers();
      if (!userSearchErr && usersData?.users) {
        const matchingUser = usersData.users.find(
          (u) => (u.email || "").toLowerCase() === cleanEmail
        );
        if (matchingUser) {
          await supabase
            .from("settings")
            .update({ plan_status: "pro" })
            .eq("user_id", matchingUser.id);

          return new Response(
            JSON.stringify({
              status: "success",
              message: `Plano PRO do RitmoPix ativado para ${cleanEmail}`,
            }),
            { status: 200, headers }
          );
        }
      }
    }

    return new Response(
      JSON.stringify({
        status: "warning",
        message: "Pagamento recebido, mas usuário correspondente não localizado automaticamente.",
      }),
      { status: 200, headers }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers,
    });
  }
});
