import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { MotionStyle } from "@/lib/constants";

import { useQueryClient } from "@tanstack/react-query";
import { addSessionGenerationId } from "@/lib/sessionGenerations";

interface GenerationState {
  status: "idle" | "uploading" | "generating_video" | "finalizing" | "ready";
  error: string | null;
  result: {
    videoUrl: string;
    recipientMessage: string | null;
  } | null;
}

export function useGeneration() {
  const [state, setState] = useState<GenerationState>({
    status: "idle",
    error: null,
    result: null,
  });
  const queryClient = useQueryClient();

  const generate = useCallback(
    async (file: File, recipientMessage: string, motionStyle: MotionStyle) => {
      setState({ status: "uploading", error: null, result: null });

      try {
        // 1. Upload image to storage
        const fileName = `${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from("wishwave-uploads").upload(fileName, file);

        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

        const { data: urlData } = supabase.storage.from("wishwave-uploads").getPublicUrl(fileName);

        const imageUrl = urlData.publicUrl;

        // 2. Create generation record
        const { data: generation, error: insertError } = await supabase
          .from("generations")
          .insert({
            image_url: imageUrl,
            recipient_name: recipientMessage || null,
            motion_style: motionStyle,
            audio_style: "static",
            status: "generating_video",
          })
          .select()
          .single();

        if (insertError || !generation) throw new Error("Failed to create generation record");

        addSessionGenerationId(generation.id);

        // 3. Start video generation
        setState((s) => ({ ...s, status: "generating_video" }));

        const videoResponse = await supabase.functions.invoke("runway-generate", {
          body: { imageUrl, motionStyle, generationId: generation.id },
        });

        if (videoResponse.error) throw new Error(`Video generation failed: ${videoResponse.error.message}`);

        const { jobId } = videoResponse.data;

        // 4. Poll for video completion
        let videoUrl: string | null = null;
        for (let i = 0; i < 60; i++) {
          await new Promise((r) => setTimeout(r, 5000));

          const pollResponse = await supabase.functions.invoke("runway-poll", {
            body: { jobId, generationId: generation.id },
          });

          if (pollResponse.error) throw new Error(`Polling failed: ${pollResponse.error.message}`);

          if (pollResponse.data.status === "SUCCEEDED") {
            videoUrl = pollResponse.data.videoUrl;
            break;
          } else if (pollResponse.data.status === "FAILED") {
            throw new Error("Video generation failed. Try with a different photo.");
          }
        }

        if (!videoUrl) throw new Error("Video generation timed out");

        // 5. Finalize — use static audio
        setState((s) => ({ ...s, status: "finalizing" }));

        // Update record to ready
        await supabase
          .from("generations")
          .update({
            status: "ready",
            video_url: videoUrl,
          })
          .eq("id", generation.id);

        queryClient.invalidateQueries({ queryKey: ["generations"] });

        setState({
          status: "ready",
          error: null,
          result: {
            videoUrl,
            recipientMessage: recipientMessage || null,
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong";
        setState((s) => ({ ...s, status: "idle", error: message }));
      }
    },
    [queryClient],
  );

  const reset = useCallback(() => {
    setState({ status: "idle", error: null, result: null });
  }, []);

  const setResult = useCallback((result: { videoUrl: string; recipientMessage: string | null }) => {
    setState({ status: "ready", error: null, result });
  }, []);

  return { ...state, generate, reset, setResult };
}
