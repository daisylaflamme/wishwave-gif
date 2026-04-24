import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GENERATED_BUCKET = "wishwave-generated";
// 7 days — long enough that share links work for a while; short enough to be safe.
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Download an MP4 from Runway's CDN and persist it under {userId}/{generationId}.mp4
 * in the wishwave-generated bucket. Returns a signed URL valid for SIGNED_URL_TTL_SECONDS.
 *
 * Idempotent: if the file already exists, we skip the upload and just re-sign.
 */
async function persistRunwayVideo(
  admin: ReturnType<typeof createClient>,
  runwayUrl: string,
  userId: string,
  generationId: string,
): Promise<{ signedUrl: string; storagePath: string }> {
  const storagePath = `${userId}/${generationId}.mp4`;

  // Try to re-sign first — if the file already exists from a previous poll, no need to re-download.
  const existing = await admin.storage
    .from(GENERATED_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
  if (existing.data?.signedUrl && !existing.error) {
    return { signedUrl: existing.data.signedUrl, storagePath };
  }

  const upstream = await fetch(runwayUrl);
  if (!upstream.ok) {
    throw new Error(`Failed to download Runway video: ${upstream.status}`);
  }
  const blob = await upstream.blob();

  const { error: uploadErr } = await admin.storage
    .from(GENERATED_BUCKET)
    .upload(storagePath, blob, {
      contentType: "video/mp4",
      upsert: true,
    });
  if (uploadErr) {
    throw new Error(`Failed to store video: ${uploadErr.message}`);
  }

  const { data: signed, error: signErr } = await admin.storage
    .from(GENERATED_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
  if (signErr || !signed?.signedUrl) {
    throw new Error(`Failed to sign video URL: ${signErr?.message ?? "unknown"}`);
  }
  return { signedUrl: signed.signedUrl, storagePath };
}

/** Best-effort cleanup of the user's original uploaded image once generation is finalized. */
async function deleteOriginalImage(
  admin: ReturnType<typeof createClient>,
  generationId: string,
) {
  try {
    const { data: gen } = await admin
      .from("generations")
      .select("image_url")
      .eq("id", generationId)
      .maybeSingle();
    const imageUrl: string | undefined = gen?.image_url;
    // Match both public and signed storage URL shapes for the uploads bucket.
    const markers = [
      "/storage/v1/object/public/wishwave-uploads/",
      "/storage/v1/object/sign/wishwave-uploads/",
    ];
    const marker = markers.find((m) => imageUrl?.includes(m));
    if (!imageUrl || !marker) return;
    const tail = imageUrl.split(marker)[1] ?? "";
    const path = decodeURIComponent(tail.split("?")[0]);
    if (!path) return;
    const { error: rmErr } = await admin.storage.from("wishwave-uploads").remove([path]);
    if (rmErr) console.error("runway-poll: failed to delete original image:", rmErr.message);
  } catch (e) {
    console.error("runway-poll: error deleting original image:", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // --- Authenticate caller ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const RUNWAY_API_KEY = Deno.env.get("RUNWAY_API_KEY");

    if (!RUNWAY_API_KEY) return jsonResponse({ error: "RUNWAY_API_KEY is not configured" }, 500);
    if (!SERVICE_ROLE) return jsonResponse({ error: "Server misconfigured" }, 500);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return jsonResponse({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const { jobId, generationId } = await req.json();
    if (!jobId || typeof jobId !== "string") {
      return jsonResponse({ error: "jobId is required" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Verify the generation belongs to the caller before doing anything else.
    if (!generationId || typeof generationId !== "string") {
      return jsonResponse({ error: "generationId is required" }, 400);
    }
    const { data: row, error: ownerErr } = await admin
      .from("generations")
      .select("user_id, video_url, status")
      .eq("id", generationId)
      .maybeSingle();
    if (ownerErr || !row || row.user_id !== userId) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    // Fast-path: already finalized — just return the persisted URL.
    if (row.status === "ready" && row.video_url) {
      return jsonResponse({ status: "SUCCEEDED", videoUrl: row.video_url, progress: 1 });
    }

    // --- Poll Runway ---
    const response = await fetch(
      `https://api.dev.runwayml.com/v1/tasks/${encodeURIComponent(jobId)}`,
      {
        headers: {
          Authorization: `Bearer ${RUNWAY_API_KEY}`,
          "X-Runway-Version": "2024-11-06",
        },
      },
    );
    if (!response.ok) {
      console.error("Runway poll error:", response.status);
      return jsonResponse({ error: `Runway poll error: ${response.status}` }, 502);
    }
    const data = await response.json();
    const runwayVideoUrl: string | null = data.output?.[0] || null;

    // --- On success: persist MP4 to Supabase Storage and record the signed URL ---
    if (data.status === "SUCCEEDED" && runwayVideoUrl) {
      let persistedUrl: string;
      try {
        const persisted = await persistRunwayVideo(admin, runwayVideoUrl, userId, generationId);
        persistedUrl = persisted.signedUrl;
      } catch (e) {
        console.error("runway-poll: persistence failed:", e);
        // Mark as failed so the client doesn't keep polling forever.
        await admin
          .from("generations")
          .update({ status: "failed", runway_job_id: jobId })
          .eq("id", generationId);
        return jsonResponse(
          { error: "We generated your video but couldn't save it. Please try again." },
          500,
        );
      }

      const { error: updateErr } = await admin
        .from("generations")
        .update({
          status: "ready",
          video_url: persistedUrl,
          runway_job_id: jobId,
        })
        .eq("id", generationId);
      if (updateErr) console.error("runway-poll: failed to update generation:", updateErr.message);

      // Best-effort cleanup of the user's source image.
      await deleteOriginalImage(admin, generationId);

      return jsonResponse({ status: "SUCCEEDED", videoUrl: persistedUrl, progress: 1 });
    }

    // --- On Runway failure ---
    if (data.status === "FAILED") {
      await admin
        .from("generations")
        .update({ status: "failed", runway_job_id: jobId })
        .eq("id", generationId);
      await deleteOriginalImage(admin, generationId);
      return jsonResponse({ status: "FAILED", videoUrl: null, progress: data.progress || 0 });
    }

    // --- Still in progress ---
    await admin
      .from("generations")
      .update({ runway_job_id: jobId })
      .eq("id", generationId);

    return jsonResponse({
      status: data.status,
      videoUrl: null,
      progress: data.progress || 0,
    });
  } catch (error) {
    console.error("Error in runway-poll:", error);
    return jsonResponse({ error: "Polling failed" }, 500);
  }
});
