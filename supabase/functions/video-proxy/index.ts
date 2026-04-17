import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Strict allowlist of trusted upstream hosts. Add more domains here if Runway
// rotates CDN endpoints. Anything not on this list is rejected to prevent SSRF.
const ALLOWED_HOSTS = new Set<string>([
  "dnznrvs05pmza.cloudfront.net",
  "assets.runwayml.com",
  "cdn.runwayml.com",
  "api.dev.runwayml.com",
  "api.runwayml.com",
]);

const ALLOWED_HOST_SUFFIXES = [
  ".runwayml.com",
  ".cloudfront.net",
];

function isAllowedUrl(raw: string): { ok: true; url: URL } | { ok: false; reason: string } {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, reason: "Invalid URL" };
  }
  if (parsed.protocol !== "https:") {
    return { ok: false, reason: "Only https is allowed" };
  }
  const host = parsed.hostname.toLowerCase();
  if (ALLOWED_HOSTS.has(host)) return { ok: true, url: parsed };
  if (ALLOWED_HOST_SUFFIXES.some((s) => host.endsWith(s))) return { ok: true, url: parsed };
  return { ok: false, reason: "Host not allowed" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "url is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const check = isAllowedUrl(url);
    if (!check.ok) {
      console.warn("video-proxy rejected url:", check.reason);
      return new Response(JSON.stringify({ error: "URL not allowed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const upstream = await fetch(check.url.toString());

    if (!upstream.ok) {
      console.error("video-proxy upstream error:", upstream.status);
      return new Response(JSON.stringify({ error: `Video fetch failed: ${upstream.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": upstream.headers.get("Content-Type") || "video/mp4",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("video-proxy error:", error);
    return new Response(JSON.stringify({ error: "Unable to fetch video" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
