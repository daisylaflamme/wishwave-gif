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
  "Animate only the uploaded photo. Preserve the same people, faces, hair, clothing, bodies, background, and framing. Do not add or duplicate people, faces, hands, props, or text. No zoom, crop, pan, or extension. Keep motion subtle, stable, and realistic. Enhance faces to appear slightly more youthful and flattering, natural and consistent.";

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
};

const CUSTOM_MOTION_MAX = 100;
const CUSTOM_BLOCKED_WORDS = [
  "zoom", "cinematic", "anime", "cartoon", "background",
  "new person", "extra people", "weapon", "explode", "naked", "remove clothes",
];

function buildCustomAction(userPrompt: string): string {
  return `Subtle realistic motion only: ${userPrompt}. Preserve identity, framing, clothing, background, and facial consistency. No new people, objects, text, camera movement, or scene changes.`;
}

const FRAME_FRAGMENTS: Record<string, string> = {
  celebrate: "festive birthday-style confetti and sparkle",
  elegant: "minimal gold and soft luxury",
  soft: "pastel glow and delicate light",
  love: "soft romantic hearts and warm glow",
  retro: "playful retro film or polaroid-inspired",
  cozy: "warm rustic paper, wood, or autumn-inspired",
};

function buildFrameSentence(frameStyle?: string): string | null {
  if (!frameStyle || frameStyle === "none") return null;
  const f = FRAME_FRAGMENTS[frameStyle];
  if (!f) return null;
  return `Add a subtle decorative ${f} frame overlay only around the outer edges. Do not cover faces, bodies, hands, or important photo content. Do not add text, props, people, or background elements. Keep the original image framing unchanged.`;
}

/**
 * Build a Runway prompt guaranteed to fit under RUNWAY_PROMPT_MAX.
 * Priority (most → least important): ACTION, mouth-closed rule, multi-people rule, base scene rules, optional frame overlay.
 * Drops lowest-priority sentences first; never cuts mid-sentence.
 */
function buildPrompt(motion: string, frameStyle?: string, customAction?: string): string {
  const cfg = MOTION_CONFIG[motion] ?? MOTION_CONFIG.wave;
  const action = customAction ?? cfg.action;
  const parts: string[] = [action];
  if (motion !== "custom" && cfg.mouthClosed) parts.push(MOUTH_CLOSED);
  parts.push(ALL_PEOPLE);
  parts.push(PROMPT_BASE);
  const frame = buildFrameSentence(frameStyle);
  if (frame) parts.push(frame);

  for (let count = parts.length; count >= 1; count--) {
    const candidate = parts.slice(0, count).join(" ").trim();
    if (candidate.length <= RUNWAY_PROMPT_MAX) return candidate;
  }
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

    const RUNWAY_API_KEY = Deno.env.get("RUNWAY_API_KEY");
    if (!RUNWAY_API_KEY) {
      return new Response(JSON.stringify({ error: "RUNWAY_API_KEY is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { imageUrl, motionStyle, frameStyle, customPrompt } = await req.json();

    if (!imageUrl || typeof imageUrl !== "string") {
      return new Response(JSON.stringify({ error: "imageUrl is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate imageUrl originates from this user's own folder in wishwave-uploads.
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

    const isCustom = motionStyle === "custom";
    let customAction: string | undefined;
    if (isCustom) {
      const raw = typeof customPrompt === "string" ? customPrompt.trim() : "";
      if (!raw) {
        return new Response(JSON.stringify({ error: "Please describe the motion you want." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (raw.length > CUSTOM_MOTION_MAX) {
        return new Response(JSON.stringify({ error: `Custom motion must be under ${CUSTOM_MOTION_MAX} characters.` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const lowered = raw.toLowerCase();
      if (CUSTOM_BLOCKED_WORDS.some((w) => lowered.includes(w))) {
        return new Response(JSON.stringify({ error: "Please describe only subtle motion for the existing photo." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      customAction = buildCustomAction(raw);
    }

    const selectedMotion = isCustom
      ? "custom"
      : (typeof motionStyle === "string" && MOTION_CONFIG[motionStyle] ? motionStyle : "wave");
    const selectedFrame = typeof frameStyle === "string" ? frameStyle : "none";

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

    const prompt = buildPrompt(selectedMotion, selectedFrame, customAction);
    console.log(`runway-generate: motionStyle=${motionStyle} frameStyle=${selectedFrame} → using=${selectedMotion} promptLen=${prompt.length}`);

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
