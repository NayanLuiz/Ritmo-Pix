// supabase/functions/admin-manage-user/index.ts
// Permite que o superadmin nayanlima27@gmail.com gerencie contas com privilégios service_role
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const SUPERADMIN_EMAIL = "nayanlima27@gmail.com";

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
    const { requesterEmail, action, userId, planStatus, trialDays } = await req.json();

    if (!requesterEmail || requesterEmail.toLowerCase() !== SUPERADMIN_EMAIL) {
      return new Response(
        JSON.stringify({ error: "Acesso negado: apenas o superadmin nayanlima27@gmail.com pode executar esta ação" }),
        { status: 403, headers }
      );
    }

    if (action === "update_plan") {
      if (!userId || !planStatus) {
        return new Response(
          JSON.stringify({ error: "userId e planStatus são obrigatórios" }),
          { status: 400, headers }
        );
      }

      const updateData: Record<string, any> = { plan_status: planStatus };
      if (planStatus === "free") {
        const days = typeof trialDays === "number" ? trialDays : 5;
        updateData.trial_ends_at = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      }

      const { data, error } = await supabase
        .from("settings")
        .update(updateData)
        .eq("user_id", userId)
        .select();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers,
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Plano do usuário atualizado para ${planStatus}`,
          user: data?.[0],
        }),
        { status: 200, headers }
      );
    }

    return new Response(JSON.stringify({ error: "Ação não suportada" }), {
      status: 400,
      headers,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers,
    });
  }
});
