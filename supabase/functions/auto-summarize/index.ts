import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const serviceSupabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function summarizeConversation(conversationId: string): Promise<void> {
  // Fetch messages
  const { data: messages, error: msgError } = await serviceSupabase
    .from("conversation_messages")
    .select("direction, content, media_type, created_at, transcription")
    .eq("conversation_id", conversationId)
    .neq("direction", "private_note")
    .order("created_at", { ascending: true });

  if (msgError || !messages || messages.length < 2) {
    console.log(`[auto-summarize] Skipping ${conversationId}: not enough messages`);
    return;
  }

  // Format conversation history
  const conversationText = messages
    .map((msg) => {
      const role = msg.direction === "incoming" ? "[Cliente]" : "[Atendente]";
      let text = "";
      if (msg.content) {
        text = msg.content;
      } else if (msg.transcription) {
        text = `[Áudio transcrito]: ${msg.transcription}`;
      } else if (msg.media_type === "image") {
        text = "[Imagem]";
      } else if (msg.media_type === "video") {
        text = "[Vídeo]";
      } else if (msg.media_type === "audio") {
        text = "[Áudio]";
      } else if (msg.media_type === "document") {
        text = "[Documento]";
      } else if (msg.media_type === "contact") {
        text = "[Contato compartilhado]";
      } else {
        text = "[Mídia]";
      }
      return `${role}: ${text}`;
    })
    .join("\n");

  const systemPrompt = `Você é um assistente de atendimento ao cliente. Analise esta conversa de WhatsApp e gere um resumo estruturado.

Responda APENAS com um JSON válido, sem markdown, sem blocos de código, sem texto extra. O JSON deve ter exatamente estas chaves:
- "reason": motivo principal do contato em 1 frase curta
- "summary": resumo da conversa em 2-3 frases
- "resolution": como foi resolvido ou qual o próximo passo (ou "Em aberto" se não resolvido)`;

  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Conversa:\n${conversationText}` },
      ],
      temperature: 0.3,
    }),
  });

  if (!aiResponse.ok) {
    console.error(`[auto-summarize] AI error for ${conversationId}:`, aiResponse.status);
    return;
  }

  const aiData = await aiResponse.json();
  const rawContent = aiData.choices?.[0]?.message?.content || "";

  let parsedSummary: Record<string, string>;
  try {
    const cleaned = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    parsedSummary = JSON.parse(cleaned);
  } catch (e) {
    console.error(`[auto-summarize] Failed to parse AI response for ${conversationId}:`, rawContent);
    return;
  }

  const summaryData = {
    ...parsedSummary,
    generated_at: new Date().toISOString(),
    message_count: messages.length,
  };

  // Save summary with 60-day expiry
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 60);

  const { error: updateError } = await serviceSupabase
    .from("conversations")
    .update({
      ai_summary: summaryData,
      ai_summary_expires_at: expiresAt.toISOString(),
    })
    .eq("id", conversationId);

  if (updateError) {
    console.error(`[auto-summarize] Failed to save summary for ${conversationId}:`, updateError);
  } else {
    console.log(`[auto-summarize] Summary saved for ${conversationId}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { conversation_id, mode } = body;

    // Mode: single conversation (triggered by status change trigger)
    if (conversation_id) {
      // Verify conversation exists and doesn't already have a fresh summary
      const { data: conv } = await serviceSupabase
        .from("conversations")
        .select("id, ai_summary, ai_summary_expires_at")
        .eq("id", conversation_id)
        .single();

      if (!conv) {
        return new Response(JSON.stringify({ error: "Conversation not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Skip if fresh summary exists (less than 5 min old)
      if (conv.ai_summary) {
        const summary = conv.ai_summary as any;
        if (summary.generated_at) {
          const generatedAt = new Date(summary.generated_at);
          const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
          if (generatedAt > fiveMinAgo) {
            console.log(`[auto-summarize] Skipping ${conversation_id}: fresh summary exists`);
            return new Response(JSON.stringify({ skipped: true }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      }

      await summarizeConversation(conversation_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mode: inactive conversations (triggered by hourly cron)
    if (mode === "inactive") {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      // Find conversations with no activity for 1+ hour, no summary yet, and at least some messages
      const { data: inactiveConvs, error } = await serviceSupabase
        .from("conversations")
        .select("id")
        .lt("last_message_at", oneHourAgo)
        .is("ai_summary", null)
        .neq("status", "resolvida") // resolvida already triggers on status change
        .limit(20); // process max 20 per hour to avoid overload

      if (error) {
        console.error("[auto-summarize] Error fetching inactive conversations:", error);
        return new Response(JSON.stringify({ error: "Failed to fetch conversations" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!inactiveConvs || inactiveConvs.length === 0) {
        console.log("[auto-summarize] No inactive conversations to summarize");
        return new Response(JSON.stringify({ processed: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`[auto-summarize] Processing ${inactiveConvs.length} inactive conversations`);

      // Process sequentially to avoid rate limits
      let processed = 0;
      for (const conv of inactiveConvs) {
        try {
          await summarizeConversation(conv.id);
          processed++;
          // Small delay to avoid AI rate limits
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) {
          console.error(`[auto-summarize] Error processing ${conv.id}:`, err);
        }
      }

      return new Response(JSON.stringify({ processed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid request: provide conversation_id or mode=inactive" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[auto-summarize] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
