import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Runway caps `promptText` at 1000 characters — keep all prompts well under that.
const RUNWAY_PROMPT_MAX = 1000;

// Shared identity/camera/scene constraints prepended to every prompt.
const PROMPT_BASE =
  "Animate ONLY the person(s) in the image. Preserve facial identity, features, skin, hair, clothing exactly — no morphing or face swap. Camera fully stable: no zoom, pan, crop, or reframing. Keep composition, proportions, and background unchanged. Do NOT add people, objects, or extend the frame. Hands and limbs must stay anatomically correct (no extra fingers, no warping). Subtle, smooth, social-media-friendly motion contained in the original frame. Smooth 5-second seamless loop.";

const MOUTH_CLOSED = "Mouth stays closed and still — NOT talking, no lip movement forming words.";

// All-people rule appended for motions that should apply to everyone in frame.
const ALL_PEOPLE = "If multiple people are present, EVERY person performs the action simultaneously and naturally.";
// For wink: only the primary face winks if multiple faces are detected.
const PRIMARY_FACE_ONLY = "If multiple faces are present, ONLY the primary (largest, most centered) face performs the wink; others keep a calm, slightly smiling expression.";

// Motion config — easy to extend. `action` is the most important text and is preserved during trimming.
type MotionConfig = { action: string; multi: string; mouthClosed: boolean };
const MOTION_CONFIG: Record<string, MotionConfig> = {
  wave: {
    action: "ACTION: Person raises one hand to head/shoulder height and clearly waves it side to side 2–3 times. Soft closed-mouth smile.",
    multi: ALL_PEOPLE,
    mouthClosed: true,
  },
  smile: {
    action: "ACTION: Subtle, natural, warm smile with minimal facial movement — gentle closed-mouth smile that grows slightly and holds.",
    multi: ALL_PEOPLE,
    mouthClosed: true,
  },
  dance: {
    action: "ACTION: Small playful full-body dance in place to a cheerful rhythm. Hands and arms move naturally and rhythmically (relaxed gestures, light arm sway), AND legs/hips/torso also move — gentle knee bounce, subtle weight shift foot to foot, side-to-side hip sway. Feet stay roughly planted. Light closed-mouth smile.",
    multi: ALL_PEOPLE,
    mouthClosed: true,
  },
  thumbs_up: {
    action: "ACTION: Person raises one hand to chest height and gives a clear, confident thumbs-up gesture, holding it briefly. Friendly closed-mouth smile. The thumbs-up must be clearly visible.",
    multi: ALL_PEOPLE,
    mouthClosed: true,
  },
  celebrate: {
    action: "ACTION: Cheerful celebration — both arms raised upward or outward in a joyful \"yay\" gesture with a happy expression. Smooth and contained within the frame.",
    multi: ALL_PEOPLE,
    mouthClosed: true,
  },
  laugh: {
    action: "ACTION: Genuine happy laugh — natural smile that widens, light shoulder shake, subtle head movement. Mouth may open slightly as in real laughter, but person is NOT speaking and forms NO words.",
    multi: ALL_PEOPLE,
    mouthClosed: false,
  },
  wink: {
    action: "ACTION: The person gives a quick natural wink with one eye only, while the other eye remains open, with a soft smile. Only ONE eye closes briefly and reopens — the other eye MUST stay fully open the entire time. This is NOT a blink and NOT both eyes closing. Pair with a soft warm closed-mouth smile and a tiny head tilt.",
    multi: PRIMARY_FACE_ONLY,
    mouthClosed: true,
  },
  clap: {
    action: "ACTION: Both hands raised in front of chest performing a small, realistic clap — palms meet smoothly 2–3 times across the 5 seconds. Hands anatomically correct, gentle and contained, friendly closed-mouth smile.",
    multi: ALL_PEOPLE,
    mouthClosed: true,
  },
  nod: {
    action: "ACTION: Gentle friendly head nod — head tilts down then back up smoothly 2 times across the 5 seconds, paired with a soft closed-mouth smile. Rest of the body stays still and relaxed.",
    multi: ALL_PEOPLE,
    mouthClosed: true,
  },
};

/**
 * Build a Runway prompt guaranteed to fit under RUNWAY_PROMPT_MAX.
 * Priority (most → least important): ACTION, mouth-closed rule, multi-people rule, base scene rules.
 * Drops lowest-priority sentences first; never cuts mid-sentence.
 */
function buildPrompt(motion: string): string {
  const cfg = MOTION_CONFIG[motion] ?? MOTION_CONFIG.wave;
  const parts: string[] = [cfg.action];
  if (cfg.mouthClosed) parts.push(MOUTH_CLOSED);
  parts.push(cfg.multi);
  parts.push(PROMPT_BASE);

  for (let count = parts.length; count >= 1; count--) {
    const candidate = parts.slice(0, count).join(" ").trim();
    if (candidate.length <= RUNWAY_PROMPT_MAX) return candidate;
  }
  // Fallback: hard-truncate the action at the last sentence boundary under the limit.
  const action = parts[0];
  const sliced = action.slice(0, RUNWAY_PROMPT_MAX);
  const lastStop = Math.max(sliced.lastIndexOf("."), sliced.lastIndexOf("!"), sliced.lastIndexOf("?"));
  return (lastStop > 0 ? sliced.slice(0, lastStop + 1) : sliced).trim();
}

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

    const selectedMotion = typeof motionStyle === "string" && MOTION_CONFIG[motionStyle] ? motionStyle : "wave";
    const prompt = buildPrompt(selectedMotion);
    console.log(`runway-generate: motionStyle=${motionStyle} → using=${selectedMotion} promptLen=${prompt.length}`);

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

      // Refund the credit since generation didn't actually happen
      const { error: refundErr } = await serviceClient.rpc("refund_credit", { _user_id: userId });
      if (refundErr) console.error("refund_credit error:", refundErr);

      const lowered = errorText.toLowerCase();
      const isProviderOutOfCredits = lowered.includes("credit");
      const userMessage = isProviderOutOfCredits
        ? "Our animation service is temporarily unavailable. Your credit has been refunded — please try again shortly."
        : "Video generation failed. Your credit has been refunded — please try again with a different photo.";

      // Return 200 with structured error so the frontend doesn't treat it as a runtime crash
      return new Response(
        JSON.stringify({ error: userMessage, refunded: true, providerUnavailable: isProviderOutOfCredits }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
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
