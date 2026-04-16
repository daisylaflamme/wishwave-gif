import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MOTION_PROMPTS: Record<string, string> = {
  wave: "Animate ONLY the person(s) present in the uploaded image. If the image is a headshot or portrait: show a natural hand wave in front of the body (visible in frame if possible), keep motion subtle, friendly, and realistic, add a soft natural smile. If multiple people are present: each person independently performs a small natural wave, do NOT merge people or synchronize unnaturally. STRICT RULES: DO NOT add new people, faces, or background elements. DO NOT change framing, zoom, or camera angle. DO NOT extend the image beyond original boundaries. Preserve original composition, proportions, and identity exactly. No extra limbs, no distortion. Motion must stay within the original image frame and look stable and believable.",

  smile: "Animate ONLY the person(s) present in the uploaded image. If headshot: apply a subtle natural smile with minimal facial movement. If multiple people: each person smiles independently and naturally. STRICT RULES: DO NOT add new people or modify background. DO NOT change framing or camera. Preserve identity, proportions, and exact layout. No morphing or blending of faces. Motion must be minimal, stable, and realistic within the original frame.",

  nod: "Animate ONLY the person(s) present in the uploaded image. If headshot: apply a gentle, friendly nod with a slight smile. If multiple people: each person nods independently. STRICT RULES: DO NOT generate new people or elements. DO NOT move or crop the camera. Preserve exact identity and composition. Avoid distortion or exaggerated movement. Motion must remain subtle and contained within the original image.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const RUNWAY_API_KEY = Deno.env.get("RUNWAY_API_KEY");
    if (!RUNWAY_API_KEY) {
      return new Response(JSON.stringify({ error: "RUNWAY_API_KEY is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { imageUrl, motionStyle } = await req.json();

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "imageUrl is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = MOTION_PROMPTS[motionStyle || "wave"] || MOTION_PROMPTS.wave;

    const response = await fetch("https://api.dev.runwayml.com/v1/image_to_video", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RUNWAY_API_KEY}`,
        "Content-Type": "application/json",
        "X-Runway-Version": "2024-11-06",
      },
      body: JSON.stringify({
        model: "gen4_turbo",
        promptImage: imageUrl,
        promptText: prompt,
        duration: 5,
        ratio: "1280:720",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Runway API error:", response.status, errorText);

      const lowered = errorText.toLowerCase();
      const userMessage = lowered.includes("credit")
        ? "Video generation requires Runway credits. Please add credits or try again later."
        : `Runway API error: ${response.status}`;

      return new Response(JSON.stringify({ error: userMessage, details: errorText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();

    return new Response(JSON.stringify({ jobId: data.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in runway-generate:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
