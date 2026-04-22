import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Runway caps `promptText` at 1000 characters — keep all prompts well under that.
const PROMPT_BASE =
  "Animate ONLY the person(s) in the image. Preserve facial identity, features, skin, hair, clothing exactly — no morphing or face swap. Camera fully stable: no zoom, pan, crop, or reframing. Keep composition, proportions, and background unchanged. Do NOT add people, objects, or extend the frame. Subtle, realistic motion contained in the original frame. Smooth 5-second seamless loop. If multiple people are present, EVERY person performs the action simultaneously.";

const MOUTH_CLOSED = "Mouth stays closed and still — NOT talking, no lip movement forming words.";

const MOTION_PROMPTS: Record<string, string> = {
  wave: `${PROMPT_BASE} ACTION: Person raises one hand to head/shoulder height and clearly waves it side to side 2–3 times. Soft closed-mouth smile. ${MOUTH_CLOSED}`,
  smile: `${PROMPT_BASE} ACTION: Subtle, natural, warm smile with minimal facial movement — gentle closed-mouth smile that grows slightly and holds. ${MOUTH_CLOSED}`,
  dance: `${PROMPT_BASE} ACTION: Small playful dance in place — gentle shoulder sway and subtle side-to-side hip/torso movement, relaxed arm motion. Feet roughly planted. Light closed-mouth smile. ${MOUTH_CLOSED}`,
  thumbs_up: `${PROMPT_BASE} ACTION: Person raises one hand to chest height and gives a clear, confident thumbs-up gesture, holding it briefly. Friendly closed-mouth smile. The thumbs-up must be clearly visible. ${MOUTH_CLOSED}`,
  celebrate: `${PROMPT_BASE} ACTION: Cheerful celebration — both arms raised upward or outward in a joyful "yay" gesture with a happy expression. Smooth and contained within the frame. ${MOUTH_CLOSED}`,
  laugh: `${PROMPT_BASE} ACTION: Genuine happy laugh — natural smile that widens, light shoulder shake, subtle head movement. Mouth may open slightly as in real laughter, but person is NOT speaking and forms NO words.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // --- Authenticate caller ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // --- Consume one credit (atomic, server-side) ---
    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: consumed, error: consumeErr } = await serviceClient.rpc("consume_credit", {
      _user_id: userId,
    });
    if (consumeErr) {
      console.error("consume_credit error:", consumeErr);
      return new Response(JSON.stringify({ error: "Could not check credits" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!consumed) {
      return new Response(
        JSON.stringify({ error: "You're out of GIF credits. Please buy more to continue." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const RUNWAY_API_KEY = Deno.env.get("RUNWAY_API_KEY");
    if (!RUNWAY_API_KEY) {
      return new Response(JSON.stringify({ error: "RUNWAY_API_KEY is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { imageUrl, motionStyle } = await req.json();

    if (!imageUrl || typeof imageUrl !== "string") {
      return new Response(JSON.stringify({ error: "imageUrl is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate imageUrl originates from this user's own folder in wishwave-uploads.
    // Accept either public URLs or signed URLs (since the bucket is private).
    const baseUrl = supabaseUrl.replace(/\/$/, "");
    const publicPrefix = `${baseUrl}/storage/v1/object/public/wishwave-uploads/${userId}/`;
    const signedPrefix = `${baseUrl}/storage/v1/object/sign/wishwave-uploads/${userId}/`;
    if (!imageUrl.startsWith(publicPrefix) && !imageUrl.startsWith(signedPrefix)) {
      console.error("runway-generate: rejected imageUrl from disallowed origin:", imageUrl);
      return new Response(JSON.stringify({ error: "imageUrl must be a photo you uploaded in this app" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const selectedMotion = typeof motionStyle === "string" && MOTION_PROMPTS[motionStyle] ? motionStyle : "wave";
    const prompt = MOTION_PROMPTS[selectedMotion];
    console.log("runway-generate: motionStyle received =", motionStyle, "→ using:", selectedMotion);

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
        : "Video generation failed. Please try again with a different photo.";

      return new Response(JSON.stringify({ error: userMessage }), {
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
