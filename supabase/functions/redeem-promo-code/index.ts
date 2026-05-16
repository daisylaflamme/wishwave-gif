import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "This promo code isn't valid.",
  expired: "This promo code has expired.",
  fully_redeemed: "This promo code has been fully redeemed.",
  already_used: "You've already redeemed this promo code.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Please sign in to redeem." }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify user identity with their JWT
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return json({ error: "Please sign in to redeem." }, 401);
    }
    const userId = userData.user.id;

    let body: { code?: unknown };
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid request." }, 400);
    }
    const rawCode = typeof body.code === "string" ? body.code : "";
    const code = rawCode.trim().toUpperCase();
    if (!code || code.length > 64) {
      return json({ error: ERROR_MESSAGES.invalid }, 400);
    }

    // Service-role client to call the SECURITY DEFINER function
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Set the auth context so auth.uid() works inside the function.
    // The function checks auth.uid() = _user_id; service role bypasses RLS,
    // but auth.uid() returns null. We pass the user JWT via headers on the rpc.
    const adminAsUser = createClient(SUPABASE_URL, SERVICE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data, error } = await adminAsUser.rpc("redeem_promo_code", {
      _user_id: userId,
      _code: code,
    });

    if (error) {
      console.error("redeem_promo_code rpc error", error);
      return json({ error: "Something went wrong. Please try again." }, 500);
    }

    const result = data as {
      ok: boolean;
      error?: string;
      credits_added?: number;
      new_balance?: number;
      code?: string;
    };

    if (!result?.ok) {
      const msg = ERROR_MESSAGES[result?.error ?? "invalid"] ?? ERROR_MESSAGES.invalid;
      return json({ error: msg }, 400);
    }

    return json({
      ok: true,
      creditsAdded: result.credits_added,
      newBalance: result.new_balance,
      code: result.code,
    });
  } catch (e) {
    console.error("redeem-promo-code unhandled error", e);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
