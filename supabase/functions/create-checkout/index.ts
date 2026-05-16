import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createStripeClient, type StripeEnv } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Verify the caller's JWT and derive userId/email server-side.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;
    const userEmail = userData.user.email;

    const { priceId, returnUrl } = await req.json();
    if (!priceId || typeof priceId !== "string" || !/^[a-zA-Z0-9_-]+$/.test(priceId)) {
      return new Response(JSON.stringify({ error: "Invalid priceId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Server-side allowlist for return URLs to prevent open-redirect abuse.
    // Never trust client-supplied returnUrl or the Origin header.
    const ALLOWED_RETURN_ORIGINS = new Set<string>([
      "https://gifspark.lovable.app",
      "https://id-preview--5f66f100-340b-4e24-8685-8eadea090d4c.lovable.app",
      "http://localhost:5173",
      "http://localhost:8080",
      "http://localhost:3000",
    ]);
    const RETURN_PATH = "/payment-success?session_id={CHECKOUT_SESSION_ID}";

    let safeReturnUrl = `https://gifspark.lovable.app${RETURN_PATH}`;
    if (typeof returnUrl === "string" && returnUrl.length > 0) {
      try {
        const parsed = new URL(returnUrl);
        if (
          ALLOWED_RETURN_ORIGINS.has(parsed.origin) &&
          parsed.pathname === "/payment-success"
        ) {
          safeReturnUrl = `${parsed.origin}${RETURN_PATH}`;
        }
      } catch {
        // ignore; fall back to default
      }
    }

    // Environment is determined server-side only. Never trust the client.
    const activeEnv = (Deno.env.get("STRIPE_ACTIVE_ENV") || "sandbox").toLowerCase();
    const env = (activeEnv === "live" ? "live" : "sandbox") as StripeEnv;
    const stripe = createStripeClient(env);

    const prices = await stripe.prices.list({ lookup_keys: [priceId] });
    if (!prices.data.length) {
      return new Response(JSON.stringify({ error: "Price not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const stripePrice = prices.data[0];

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: stripePrice.id, quantity: 1 }],
      mode: "payment",
      ui_mode: "embedded",
      return_url: safeReturnUrl,
      ...(userEmail && { customer_email: userEmail }),
      metadata: { userId, priceId },
      payment_intent_data: { metadata: { userId, priceId } },
    });

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("create-checkout error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
