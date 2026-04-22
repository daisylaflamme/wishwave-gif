import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROMPT_BASE =
  "Animate ONLY the person(s) present in the uploaded image. Keep facial identity, features, skin tone, hair, and clothing exactly as in the original — no morphing, no distortion, no face swap. Camera must remain perfectly stable: no zoom, no pan, no crop, no reframing. Preserve original composition, proportions, and background unchanged. DO NOT add new people, faces, objects, or background elements. DO NOT extend the image beyond its original boundaries. Motion must be subtle, realistic, and physically believable, contained within the original frame. Produce a smooth 5-second clip that loops seamlessly (start and end states should match closely). If MULTIPLE people are present, EVERY person must perform the action independently and simultaneously — none stay still — without merging or syncing unnaturally.";

const MOUTH_CLOSED =
  "CRITICAL: The mouth MUST stay closed and still — the person is NOT talking, NOT speaking, lips do not move as if forming words.";

const MOTION_PROMPTS: Record<string, string> = {
  wave: `${PROMPT_BASE} ACTION — WAVE: The person raises one hand to head/shoulder height in front of the body and clearly moves the hand side to side (right and left, back and forth) like a real waving gesture, repeating the side-to-side motion 2–3 times across the 5 seconds. Add a soft natural closed-mouth smile. ${MOUTH_CLOSED}`,
  smile: `${PROMPT_BASE} ACTION — SMILE: Apply a subtle, natural, warm smile with minimal facial movement. Only a gentle closed-mouth or softly parted smile that grows slightly and holds. ${MOUTH_CLOSED}`,
  dance: `${PROMPT_BASE} ACTION — DANCE: The person performs a small, playful dance in place — gentle shoulder sway and subtle side-to-side hip/torso movement to a cheerful rhythm, with relaxed arm motion. Keep feet roughly planted; no large displacement. Add a light closed-mouth smile. Movement should feel joyful but contained. ${MOUTH_CLOSED}`,
  thumbs_up: `${PROMPT_BASE} ACTION — THUMBS UP: The person raises one hand into frame at chest height and gives a clear, confident thumbs-up gesture, holding it briefly, with a friendly closed-mouth smile. The thumbs-up must be clearly visible and recognizable. ${MOUTH_CLOSED}`,
  celebrate: `${PROMPT_BASE} ACTION — CELEBRATE: The person performs a cheerful celebration — both arms raised upward or outward in a joyful gesture (like a small "yay"), with a happy expression and a closed-mouth or softly smiling face. Slight head tilt is okay. Keep movement smooth and contained within the frame. ${MOUTH_CLOSED}`,
  laugh: `${PROMPT_BASE} ACTION — LAUGH: The person gives a genuine, happy laugh — natural smile that widens, light shoulder shake, subtle head movement. Mouth may open slightly as in real laughter, but the person is NOT speaking and forms NO words; lips do not shape syllables. Expression must look authentic and warm.`,
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
