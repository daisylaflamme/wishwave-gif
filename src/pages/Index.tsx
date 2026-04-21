import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ImageUpload } from "@/components/ImageUpload";
import { StyleSelector } from "@/components/StyleSelector";
import { ProgressOverlay } from "@/components/ProgressOverlay";
import { ResultView } from "@/components/ResultView";
import { GenerationHistory } from "@/components/GenerationHistory";
import { GifInfo } from "@/components/GifInfo";
import { ConfettiBackground } from "@/components/ConfettiBackground";
import { SignInDialog } from "@/components/SignInDialog";
import { PricingModal } from "@/components/PricingModal";
import { SupportChatButton } from "@/components/support/SupportChatButton";
import { PurchaseHistory } from "@/components/PurchaseHistory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";
import { MOTION_STYLES } from "@/lib/constants";
import type { MotionStyle } from "@/lib/constants";
import { useGeneration } from "@/hooks/useGeneration";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { Wand2, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [recipientMessage, setRecipientMessage] = useState("");
  const [motionStyle, setMotionStyle] = useState<MotionStyle>("wave");
  const [signInOpen, setSignInOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [consent, setConsent] = useState(false);
  const { status, error, result, generate, reset, setResult } = useGeneration();
  const { user } = useAuth();
  const { credits, loading: creditsLoading } = useCredits();
  const { toast } = useToast();

  const noCredits = !!user && !creditsLoading && credits <= 0;

  // Auto-open paywall when user lands with 0 credits and tries to interact
  useEffect(() => {
    if (noCredits && selectedImage) {
      setPricingOpen(true);
    }
  }, [noCredits, selectedImage]);

  const requireAuth = (): boolean => {
    if (!user) {
      setSignInOpen(true);
      return false;
    }
    return true;
  };

  const handleImageSelect = (file: File) => {
    if (!requireAuth()) return;
    if (noCredits) {
      setPricingOpen(true);
      return;
    }
    setSelectedImage(file);
  };

  const handleGenerate = () => {
    if (!requireAuth()) return;
    if (noCredits) {
      setPricingOpen(true);
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
    if (!consent) {
      toast({
        variant: "destructive",
        title: "Please confirm consent",
        description: "You need permission from anyone in the photo before we can generate.",
      });
      return;
    }
    generate(selectedImage, recipientMessage, motionStyle);
  };

  const handleCreateAnother = () => {
    setSelectedImage(null);
    setRecipientMessage("");
    setMotionStyle("wave");
    setConsent(false);
    reset();
  };

  if (result) {
    return (
      <div className="min-h-screen relative flex flex-col">
        <ConfettiBackground />
        <div className="relative z-10 flex-1">
          <Header
            onRequireSignIn={() => setSignInOpen(true)}
            onBuyCredits={() => setPricingOpen(true)}
          />
          <main className="container max-w-4xl mx-auto px-4 sm:px-6 pb-16">
            <ResultView
              videoUrl={result.videoUrl}
              recipientMessage={result.recipientMessage}
              onCreateAnother={handleCreateAnother}
            />
          </main>
        </div>
        <PricingModal open={pricingOpen} onOpenChange={setPricingOpen} />
        <SupportChatButton />
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-gradient-soft">
      <ConfettiBackground />
      <div className="relative z-10">
        <Header
          onRequireSignIn={() => setSignInOpen(true)}
          onBuyCredits={() => setPricingOpen(true)}
        />

        <main className="container max-w-2xl mx-auto px-4 sm:px-6 pb-16">
          <div className="bg-card rounded-2xl shadow-lg border p-6 md:p-8 space-y-8">
            {/* Step 1: Upload */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <span className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  1
                </span>
                Upload a Photo
              </h2>
              <p className="text-sm text-muted-foreground -mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>Turn your photo into an animated GIF greeting</span>
                <span className="text-muted-foreground/50">·</span>
                <GifInfo />
              </p>
              <ImageUpload
                onImageSelect={handleImageSelect}
                selectedImage={selectedImage}
                onClear={() => setSelectedImage(null)}
                onRequireAuth={requireAuth}
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

            {/* Consent */}
            {selectedImage && (
              <label className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3 cursor-pointer hover:bg-muted/60 transition-colors">
                <Checkbox
                  checked={consent}
                  onCheckedChange={(v) => setConsent(v === true)}
                  className="mt-0.5"
                  aria-label="I confirm I have permission to use this image"
                />
                <span className="text-sm text-foreground/90 leading-snug">
                  I confirm I have permission to use this image, including from any
                  identifiable person in it.{" "}
                  <Link
                    to="/legal#consent"
                    className="text-primary underline underline-offset-2 hover:opacity-80"
                  >
                    Learn more
                  </Link>
                </span>
              </label>
            )}

            {/* Step 3: Generate */}
            <div className="pt-2 space-y-3">
              <Button
                size="lg"
                className="w-full text-lg h-14 gap-2 rounded-xl"
                onClick={handleGenerate}
                disabled={status !== "idle" || (!!user && !selectedImage) || noCredits || (!!selectedImage && !consent)}
              >
                <Wand2 className="h-5 w-5" />
                Generate GIF
              </Button>
              {user && (
                <p className="text-xs text-center text-muted-foreground">
                  {noCredits
                    ? "You're out of GIF credits."
                    : `${credits} ${credits === 1 ? "GIF" : "GIFs"} remaining (1 credit per GIF)`}
                </p>
              )}
            </div>

            {noCredits && (
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 text-sm text-foreground text-center space-y-2">
                <p className="font-medium">You're out of credits</p>
                <p className="text-muted-foreground text-xs">
                  Buy more to keep creating animated GIF greetings.
                </p>
                <Button
                  size="sm"
                  onClick={() => setPricingOpen(true)}
                  className="gap-1.5"
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                  Buy GIF credits
                </Button>
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive text-center">
                {error}
              </div>
            )}
          </div>

          <GenerationHistory onSelect={(gen) => setResult(gen)} />
          <PurchaseHistory />
        </main>
        <Footer />
      </div>

      {status !== "idle" && status !== "ready" && (
        <ProgressOverlay currentStatus={status} error={error} />
      )}

      <SignInDialog open={signInOpen} onOpenChange={setSignInOpen} />
      <PricingModal open={pricingOpen} onOpenChange={setPricingOpen} />
      <SupportChatButton hidden={status !== "idle" && status !== "ready"} />
    </div>
  );
};

export default Index;
