import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MOTION_PROMPTS: Record<string, string> = {
  wave: "Animate ONLY the person(s) present in the uploaded image. WAVE MOTION: The person must raise one hand up to head/shoulder height in front of the body and clearly move the hand from side to side (right and left, back and forth) like a real waving gesture — repeat the side-to-side hand motion 2-3 times during the clip so it is clearly recognizable as a wave. Add a soft natural smile. CRITICAL: The mouth MUST stay closed and still — the person is NOT talking, NOT speaking, NOT moving lips. No lip movement at all. If MULTIPLE people are present in the image: EVERY single person in the image must perform the wave independently at the same time — none of them stay still, all of them wave. Do NOT merge people or synchronize unnaturally, but all must be waving. STRICT RULES: DO NOT add new people, faces, or background elements. DO NOT change framing, zoom, or camera angle. DO NOT extend the image beyond original boundaries. Preserve original composition, proportions, and identity exactly. No extra limbs, no distortion. Motion must stay within the original image frame and look stable and believable.",

  smile: "Animate ONLY the person(s) present in the uploaded image. Apply a subtle natural smile with minimal facial movement. CRITICAL: The mouth MUST NOT open to talk — the person is NOT speaking, NOT talking, lips do not move as if forming words. Only a gentle closed-mouth or softly parted smile. If MULTIPLE people are present: EVERY single person in the image must smile independently at the same time — all of them, none stay neutral. STRICT RULES: DO NOT add new people or modify background. DO NOT change framing or camera. Preserve identity, proportions, and exact layout. No morphing or blending of faces. Motion must be minimal, stable, and realistic within the original frame.",

  nod: "Animate ONLY the person(s) present in the uploaded image. Apply a gentle, friendly head nod (small up-and-down head movement) with a slight closed-mouth smile. CRITICAL: The mouth MUST stay closed and still — the person is NOT talking, NOT speaking, no lip movement, no words being formed. If MULTIPLE people are present: EVERY single person in the image must nod independently at the same time — all of them, none stay still. STRICT RULES: DO NOT generate new people or elements. DO NOT move or crop the camera. Preserve exact identity and composition. Avoid distortion or exaggerated movement. Motion must remain subtle and contained within the original image.",
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
