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
  "Animate only the original uploaded photo. Preserve the same person or people, face identity, hair, clothing, body, background, and camera framing. Do not add people, faces, bodies, hands, props, text, or background characters. Do not duplicate anyone. No zoom, crop, pan, or frame extension. Keep motion subtle, realistic, stable, and contained in the original frame.";

const MOUTH_CLOSED = "Mouth stays closed. No talking, no lip-sync, no words.";

const ALL_PEOPLE = "If multiple people are visible, only those same original people perform the action naturally.";

const PRIMARY_FACE_ONLY =
  "Only the primary centered face performs the action. Other original people stay still with a calm expression.";

type MotionConfig = { action: string; multi: string; mouthClosed: boolean };

const MOTION_CONFIG: Record<string, MotionConfig> = {
  wave: {
    action:
      "ACTION: Raise one hand to shoulder height and wave side to side 2 times with a soft smile. Keep body mostly still.",
    multi: ALL_PEOPLE,
    mouthClosed: true,
  },

  smile: {
    action: "ACTION: Create a subtle warm smile that grows slightly and holds. Minimal facial movement only.",
    multi: ALL_PEOPLE,
    mouthClosed: true,
  },

  dance: {
    action:
      "ACTION: Small playful dance in place. Move arms, hands, shoulders, hips, and legs with a gentle rhythm. Add light knee bounce and side-to-side weight shift. Feet stay near original position.",
    multi: ALL_PEOPLE,
    mouthClosed: true,
  },

  thumbs_up: {
    action:
      "ACTION: Raise one hand to chest height and make a clear thumbs-up gesture. Hold briefly with a friendly smile.",
    multi: ALL_PEOPLE,
    mouthClosed: true,
  },

  celebrate: {
    action:
      "ACTION: Joyful celebration gesture. Raise both arms upward or outward in a small happy yay motion. Keep movement inside the frame.",
    multi: ALL_PEOPLE,
    mouthClosed: true,
  },

  laugh: {
    action:
      "ACTION: Natural happy laugh expression. Smile widens, shoulders move slightly, head moves subtly. No speaking or forming words.",
    multi: ALL_PEOPLE,
    mouthClosed: false,
  },

  wink: {
    action:
      "ACTION: Single-eye wink. Only ONE eyelid (left OR right) closes briefly then reopens, while the OTHER eye stays fully open the entire 5 seconds. This is NOT a blink — both eyes must NEVER close together at any frame. Do it once, slowly and clearly. Head stays perfectly still, add only a soft closed-mouth smile. Animate ONLY the existing person already in the photo. Absolutely do NOT generate, add, duplicate, or hallucinate any new people, faces, heads, bodies, or background characters. The number of people in the output MUST equal the number of people in the input.",
    multi: PRIMARY_FACE_ONLY,
    mouthClosed: true,
  },

  clap: {
    action:
      "ACTION: Real two-hand clap. Both of the person's existing hands move toward each other in front of the chest until the palms physically meet and touch with a clear contact, then separate back apart. Repeat this full meet-and-separate clap motion 2 to 3 times across the 5 seconds. The hands MUST visibly come together and touch — do NOT just raise or wave the hands without contact. Keep five fingers per hand, anatomically correct, no extra arms or hands. Soft closed-mouth smile.",
    multi: ALL_PEOPLE,
    mouthClosed: true,
  },

  nod: {
    action:
      "ACTION: Gentle friendly head nod. Head moves down then back up smoothly 2 times. Body stays relaxed and mostly still.",
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
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
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
      return new Response(JSON.stringify({ error: "You're out of GIF credits. Please buy more to continue." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
