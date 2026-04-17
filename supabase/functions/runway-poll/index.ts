import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const RUNWAY_API_KEY = Deno.env.get("RUNWAY_API_KEY");
    if (!RUNWAY_API_KEY) {
      return new Response(
        JSON.stringify({ error: "RUNWAY_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { jobId, generationId } = await req.json();

    if (!jobId || typeof jobId !== "string") {
      return new Response(
        JSON.stringify({ error: "jobId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(`https://api.dev.runwayml.com/v1/tasks/${encodeURIComponent(jobId)}`, {
      headers: {
        "Authorization": `Bearer ${RUNWAY_API_KEY}`,
        "X-Runway-Version": "2024-11-06",
      },
    });

    if (!response.ok) {
      console.error("Runway poll error:", response.status);
      return new Response(
        JSON.stringify({ error: `Runway poll error: ${response.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const videoUrl = data.output?.[0] || null;

    // Server-side update of the generation row using the service role.
    // Clients no longer have UPDATE permission on the generations table.
    if (generationId && typeof generationId === "string") {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
      const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (SUPABASE_URL && SERVICE_ROLE) {
        const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
        const patch: Record<string, unknown> = { runway_job_id: jobId };
        if (data.status === "SUCCEEDED" && videoUrl) {
          patch.status = "ready";
          patch.video_url = videoUrl;
        } else if (data.status === "FAILED") {
          patch.status = "failed";
        }
        const { error: updateError } = await admin
          .from("generations")
          .update(patch)
          .eq("id", generationId);
        if (updateError) {
          console.error("runway-poll: failed to update generation:", updateError.message);
        }
      }
    }

    return new Response(
      JSON.stringify({
        status: data.status,
        videoUrl,
        progress: data.progress || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in runway-poll:", error);
    return new Response(
      JSON.stringify({ error: "Polling failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
