import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { verifyWebhook, createStripeClient, type StripeEnv } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Map price IDs -> credits + display name
const CREDIT_PACKAGES: Record<string, { credits: number; name: string }> = {
  credits_1_onetime: { credits: 1, name: "1 GIF Credit" },
  credits_3_onetime: { credits: 3, name: "3 GIF Credits" },
  credits_10_onetime: { credits: 10, name: "10 GIF Credits" },
};

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const activeEnv = (Deno.env.get("STRIPE_ACTIVE_ENV") || "sandbox").toLowerCase();
  const env = (activeEnv === "live" ? "live" : "sandbox") as StripeEnv;

  let event: { id: string; type: string; data: { object: any } };
  try {
    event = await verifyWebhook(req, env);
  } catch (e) {
    console.error("Webhook verification failed:", e);
    return new Response("Webhook error", { status: 400 });
  }

  console.log("Webhook event:", event.type, "id:", event.id, "env:", env);

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      if (session.payment_status !== "paid") {
        console.log("Skipping unpaid session", session.id);
        return ok();
      }

      // Resolve priceId — prefer metadata, fall back to expanded line_items
      let priceId: string | undefined = session.metadata?.priceId;
      if (!priceId) {
        const stripe = createStripeClient(env);
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
        const lookupKey = lineItems.data[0]?.price?.lookup_key;
        priceId = lookupKey ?? undefined;
      }
      const userId = session.metadata?.userId;

      if (!userId || !priceId) {
        console.error("Missing userId or priceId in session", session.id, { userId, priceId });
        return ok();
      }

      const pkg = CREDIT_PACKAGES[priceId];
      if (!pkg) {
        console.error("Unknown package for price:", priceId);
        return ok();
      }

      const { data: applied, error } = await supabase.rpc("add_credits_from_purchase", {
        _user_id: userId,
        _stripe_session_id: session.id,
        _stripe_event_id: event.id,
        _price_id: priceId,
        _product_id: priceId.replace("_onetime", ""),
        _package_name: pkg.name,
        _credits_added: pkg.credits,
        _amount_cents: session.amount_total ?? 0,
        _currency: session.currency ?? "usd",
        _environment: env,
      });

      if (error) {
        console.error("add_credits_from_purchase failed:", error);
        return new Response("DB error", { status: 500 });
      }
      console.log("Credits added:", { userId, credits: pkg.credits, applied });
    } else {
      console.log("Unhandled event:", event.type);
    }

    return ok();
  } catch (e) {
    console.error("Webhook handler error:", e);
    return new Response("Handler error", { status: 500 });
  }
});

function ok() {
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
