import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ImageUpload } from "@/components/ImageUpload";
import { StyleSelector } from "@/components/StyleSelector";
import { ProgressOverlay } from "@/components/ProgressOverlay";
import { ResultView } from "@/components/ResultView";
import { GenerationHistory } from "@/components/GenerationHistory";
import { ConfettiBackground } from "@/components/ConfettiBackground";
import { SignInDialog } from "@/components/SignInDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MOTION_STYLES, FREE_GENERATION_LIMIT } from "@/lib/constants";
import type { MotionStyle } from "@/lib/constants";
import { useGeneration } from "@/hooks/useGeneration";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [recipientMessage, setRecipientMessage] = useState("");
  const [motionStyle, setMotionStyle] = useState<MotionStyle>("wave");
  const [signInOpen, setSignInOpen] = useState(false);
  const { status, error, result, generate, reset, setResult } = useGeneration();
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: usedCount = 0 } = useQuery({
    queryKey: ["generations", "count", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("generations")
        .select("id", { count: "exact", head: true })
        .eq("status", "ready");
      if (error) throw error;
      return count ?? 0;
    },
  });

  const limitReached = !!user && usedCount >= FREE_GENERATION_LIMIT;
  const remaining = Math.max(0, FREE_GENERATION_LIMIT - usedCount);

  const requireAuth = (): boolean => {
    if (!user) {
      setSignInOpen(true);
      return false;
    }
    return true;
  };

  const handleImageSelect = (file: File) => {
    if (!requireAuth()) return;
    if (limitReached) {
      toast({
        variant: "destructive",
        title: "Free limit reached",
        description: `You've used all ${FREE_GENERATION_LIMIT} free greetings.`,
      });
      return;
    }
    setSelectedImage(file);
  };

  const handleGenerate = () => {
    if (!requireAuth()) return;
    if (limitReached) {
      toast({
        variant: "destructive",
        title: "Free limit reached",
        description: `You've used all ${FREE_GENERATION_LIMIT} free greetings.`,
      });
      return;
    }
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
      <div className="min-h-screen relative flex flex-col">
        <ConfettiBackground />
        <div className="relative z-10 flex-1">
          <Header onRequireSignIn={() => setSignInOpen(true)} />
          <main className="container max-w-4xl mx-auto px-4 pb-16">
            <ResultView
              videoUrl={result.videoUrl}
              recipientMessage={result.recipientMessage}
              onCreateAnother={handleCreateAnother}
            />
          </main>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-gradient-soft">
      <ConfettiBackground />
      <div className="relative z-10">
        <Header onRequireSignIn={() => setSignInOpen(true)} />

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
              <p className="text-sm text-muted-foreground -mt-1">
                Turn your photo into an animated GIF greeting
              </p>
              <ImageUpload
                onImageSelect={handleImageSelect}
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
                  placeholder="Add a message (e.g., Happy Birthday!)"
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
            <div className="pt-2 space-y-3">
              <Button
                size="lg"
                className="w-full text-lg h-14 gap-2 rounded-xl"
                onClick={handleGenerate}
                disabled={status !== "idle" || (!!user && !selectedImage) || limitReached}
              >
                <Wand2 className="h-5 w-5" />
                Generate GIF
              </Button>
              {user && (
                <p className="text-xs text-center text-muted-foreground">
                  {limitReached
                    ? `You've used all ${FREE_GENERATION_LIMIT} free greetings.`
                    : `${remaining} of ${FREE_GENERATION_LIMIT} free greetings remaining`}
                </p>
              )}
            </div>

            {limitReached && (
              <div className="rounded-lg bg-muted border border-border p-4 text-sm text-foreground text-center space-y-1">
                <p className="font-medium">Free limit reached</p>
                <p className="text-muted-foreground">
                  You've used all {FREE_GENERATION_LIMIT} free greetings. Please contact us to
                  generate more.
                </p>
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive text-center">
                {error}
              </div>
            )}
          </div>

          <GenerationHistory onSelect={(gen) => setResult(gen)} />
        </main>
        <Footer />
      </div>

      {status !== "idle" && status !== "ready" && <ProgressOverlay currentStatus={status} error={error} />}

      <SignInDialog open={signInOpen} onOpenChange={setSignInOpen} />
    </div>
  );
};

export default Index;
