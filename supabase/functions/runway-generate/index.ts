import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MOTION_PROMPTS: Record<string, string> = {
  wave: "Animate only the person(s) in the image. Each person raises one hand to head/shoulder height in front of the body and clearly waves it side to side (left-right, back and forth) 2-3 times — a recognizable waving gesture. Add a soft closed-mouth smile. Mouth must stay closed and still: NO talking, NO speaking, NO lip movement. If multiple people are present, EVERY person waves independently at the same time — none stay still. Do not add new people, faces, or background. Do not change framing, zoom, camera angle, or extend beyond the original image. Preserve identity, proportions, and composition exactly. No extra limbs, no distortion. Motion stays inside the original frame and looks stable and believable.",

  smile: "Animate only the person(s) in the image with a subtle natural closed-mouth smile and minimal facial movement. Mouth must NOT open to talk: NO speaking, NO lip movement forming words. If multiple people are present, EVERY person smiles independently at the same time — none stay neutral. Do not add new people or change the background. Do not change framing or camera. Preserve identity, proportions, and layout exactly. No morphing or face blending. Motion must be minimal, stable, and realistic within the original frame.",

  nod: "Animate only the person(s) in the image with a gentle friendly head nod (small up-and-down head movement) and a slight closed-mouth smile. Mouth stays closed and still: NO talking, NO speaking, NO lip movement, no words being formed. If multiple people are present, EVERY person nods independently at the same time — none stay still. Do not add new people or elements. Do not move or crop the camera. Preserve identity and composition exactly. No distortion or exaggerated movement. Motion stays subtle and contained within the original image.",
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
