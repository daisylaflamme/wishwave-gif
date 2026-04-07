import { useState } from "react";
import { Header } from "@/components/Header";
import { ImageUpload } from "@/components/ImageUpload";
import { StyleSelector } from "@/components/StyleSelector";
import { ProgressOverlay } from "@/components/ProgressOverlay";
import { ResultView } from "@/components/ResultView";
import { GenerationHistory } from "@/components/GenerationHistory";
import { ConfettiBackground } from "@/components/ConfettiBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MOTION_STYLES } from "@/lib/constants";
import type { MotionStyle } from "@/lib/constants";
import { useGeneration } from "@/hooks/useGeneration";
import { Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [recipientMessage, setRecipientMessage] = useState("");
  const [motionStyle, setMotionStyle] = useState<MotionStyle>("wave");
  const { status, error, result, generate, reset, setResult } = useGeneration();
  const { toast } = useToast();

  const handleGenerate = () => {
    if (!selectedImage) {
      toast({
        variant: "destructive",
        title: "No photo selected",
        description: "Please upload a photo first.",
      });
      return;
    }
    generate(selectedImage, recipientMessage, motionStyle);
  };

  const handleCreateAnother = () => {
    setSelectedImage(null);
    setRecipientMessage("");
    setMotionStyle("wave");
    reset();
  };

  if (result) {
    return (
      <div className="min-h-screen relative">
        <ConfettiBackground />
        <div className="relative z-10">
          <Header />
          <main className="container max-w-4xl mx-auto px-4 pb-16">
            <ResultView
              videoUrl={result.videoUrl}
              audioUrl={result.audioUrl}
              recipientMessage={result.recipientMessage}
              onCreateAnother={handleCreateAnother}
            />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative" style={{ background: "var(--gradient-soft)" }}>
      <ConfettiBackground />
      <div className="relative z-10">
        <Header />

        <main className="container max-w-2xl mx-auto px-4 pb-16">
          <div className="bg-card rounded-2xl shadow-lg border p-6 md:p-8 space-y-8">
            {/* Step 1: Upload */}
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <span className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  1
                </span>
                Upload a Photo
              </h2>
              <ImageUpload
                onImageSelect={setSelectedImage}
                selectedImage={selectedImage}
                onClear={() => setSelectedImage(null)}
              />
            </div>

            {/* Step 2: Customize */}
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <span className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  2
                </span>
                Customize
              </h2>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Short Message <span className="text-muted-foreground">(optional)</span>
                </label>
                <Input
                  placeholder="e.g. Happy Birthday!"
                  value={recipientMessage}
                  onChange={(e) => setRecipientMessage(e.target.value)}
                  className="max-w-xs"
                />
              </div>

              <StyleSelector
                label="Motion Style"
                options={MOTION_STYLES}
                value={motionStyle}
                onChange={(v) => setMotionStyle(v as MotionStyle)}
              />
            </div>

            {/* Step 3: Generate */}
            <div className="pt-2">
              <Button
                size="lg"
                className="w-full text-lg h-14 gap-2 rounded-xl"
                onClick={handleGenerate}
                disabled={!selectedImage || status !== "idle"}
              >
                <Wand2 className="h-5 w-5" />
                Create Greeting
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Videos are optimized to 5 seconds for fast generation
              </p>
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive text-center">
                {error}
              </div>
            )}
          </div>

          <GenerationHistory onSelect={(gen) => setResult(gen)} />
        </main>
      </div>

      {status !== "idle" && status !== "ready" && <ProgressOverlay currentStatus={status} error={error} />}
    </div>
  );
};

export default Index;
