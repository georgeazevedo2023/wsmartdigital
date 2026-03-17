import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userSupabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userSupabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;
    const { chatid, phone, instanceId } = await req.json();

    if (!chatid || !phone) {
      return new Response(
        JSON.stringify({ error: "chatid and phone are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user has access to the supplied instanceId
    if (instanceId) {
      const { data: access } = await userSupabase
        .from('user_instance_access')
        .select('id')
        .eq('user_id', userId)
        .eq('instance_id', instanceId)
        .maybeSingle();

      if (!access) {
        // Also check if user is super_admin (they have access to all instances)
        const serviceSupabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        const { data: roleData } = await serviceSupabase
          .from('user_roles')
          .select('id')
          .eq('user_id', userId)
          .eq('role', 'super_admin')
          .maybeSingle();

        if (!roleData) {
          return new Response(
            JSON.stringify({ error: "Forbidden: no access to this instance" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    const webhookUrl = Deno.env.get("FLUX_WEBHOOK_URL") || "https://fluxwebhook.wsmart.com.br/webhook/receb_out_neo";

    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status_ia: "ligada",
        chatid,
        phone,
        instanceId,
      }),
    });

    const responseText = await webhookResponse.text();
    console.log("activate-ia response:", webhookResponse.status, responseText.substring(0, 200));

    return new Response(
      JSON.stringify({ success: true, status: webhookResponse.status }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("activate-ia error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
