import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};


const MOTION_PROMPTS: Record<string, string> = {
  wave: "A natural, gentle birthday greeting motion. The person smiles softly and gives a small realistic hand wave toward the camera. Motion should be subtle, warm, stable, and believable. Keep the face consistent, preserve identity, avoid exaggerated body motion, avoid camera movement, avoid extra limbs or distorted hands.",
  smile: "The person makes a subtle natural smile and slight friendly head movement. Motion should be minimal, warm, realistic, and stable. Preserve identity and avoid distortion.",
  nod: "The person gives a gentle friendly nod with a soft smile. Motion should be subtle, realistic, and stable. Preserve identity and avoid distortion.",
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

    const { imageUrl, motionStyle } = await req.json();

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "imageUrl is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = MOTION_PROMPTS[motionStyle || "wave"] || MOTION_PROMPTS.wave;

    const response = await fetch("https://api.dev.runwayml.com/v1/image_to_video", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RUNWAY_API_KEY}`,
        "Content-Type": "application/json",
        "X-Runway-Version": "2024-11-06",
      },
      body: JSON.stringify({
        model: "gen4_turbo",
        promptImage: imageUrl,
        promptText: prompt,
        duration: 5,
        ratio: "16:9",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Runway API error:", response.status, errorText);

      const lowered = errorText.toLowerCase();
      const userMessage = lowered.includes("credit")
        ? "Video generation requires Runway credits. Please add credits or try again later."
        : `Runway API error: ${response.status}`;

      return new Response(
        JSON.stringify({ error: userMessage, details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    return new Response(
      JSON.stringify({ jobId: data.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in runway-generate:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
