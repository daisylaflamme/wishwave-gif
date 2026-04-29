import { lazy, Suspense, useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ImageUpload } from "@/components/ImageUpload";
import { ImageRepositionDialog } from "@/components/ImageRepositionDialog";
import { StyleSelector } from "@/components/StyleSelector";
import { ProgressOverlay } from "@/components/ProgressOverlay";
import { ResultView } from "@/components/ResultView";
import { GenerationHistory } from "@/components/GenerationHistory";
import { GifInfo } from "@/components/GifInfo";
import { ConfettiBackground } from "@/components/ConfettiBackground";
import { SignInDialog } from "@/components/SignInDialog";
const PricingModal = lazy(() =>
  import("@/components/PricingModal").then((m) => ({ default: m.PricingModal }))
);
import { SupportChatButton } from "@/components/support/SupportChatButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";
import { MOTION_STYLES } from "@/lib/constants";
import type { MotionStyle } from "@/lib/constants";
import { useGeneration } from "@/hooks/useGeneration";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { uploadCache } from "@/lib/uploadCache";
import type { CropTransform } from "@/lib/imageCrop";
import { Wand2, ShoppingCart, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isNativeApp, openExternal } from "@/lib/platform";

const WEB_APP_URL = "https://gifspark.lovable.app";

const MOTION_STORAGE_KEY = "wishwave:motionStyle";
const RECIPIENT_STORAGE_KEY = "wishwave:recipientMessage";

const Index = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(() => uploadCache.get().file);
  const [originalImage, setOriginalImage] = useState<File | null>(() => uploadCache.get().original);
  const [savedTransform, setSavedTransform] = useState<CropTransform | null>(() => uploadCache.get().transform);
  const [repositionOpen, setRepositionOpen] = useState(false);
  const [isFirstCrop, setIsFirstCrop] = useState(false);
  const [recipientMessage, setRecipientMessage] = useState(
    () => (typeof window !== "undefined" && sessionStorage.getItem(RECIPIENT_STORAGE_KEY)) || "",
  );
  const [motionStyle, setMotionStyle] = useState<MotionStyle>(() => {
    if (typeof window === "undefined") return "wave";
    const stored = sessionStorage.getItem(MOTION_STORAGE_KEY) as MotionStyle | null;
    return stored && MOTION_STYLES.some((m) => m.id === stored) ? stored : "wave";
  });
  const [signInOpen, setSignInOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [consent, setConsent] = useState(false);

  // Persist motion + message across navigation (e.g. visiting /legal)
  useEffect(() => {
    sessionStorage.setItem(MOTION_STORAGE_KEY, motionStyle);
  }, [motionStyle]);
  useEffect(() => {
    sessionStorage.setItem(RECIPIENT_STORAGE_KEY, recipientMessage);
  }, [recipientMessage]);
  const { status, error, result, generate, reset, setResult } = useGeneration();
  const { user } = useAuth();
  const { credits, loading: creditsLoading } = useCredits();
  const { toast } = useToast();
  const native = isNativeApp();

  const noCredits = !!user && !creditsLoading && credits <= 0;

  // Auto-open paywall when user lands with 0 credits and tries to interact (web only).
  // Suppress while a generation is in flight so the modal doesn't pop over the loading state.
  const isGenerating =
    status === "uploading" || status === "generating_video" || status === "finalizing";
  useEffect(() => {
    if (!native && noCredits && selectedImage && !isGenerating) {
      setPricingOpen(true);
    }
  }, [native, noCredits, selectedImage, isGenerating]);

  const requireAuth = (): boolean => {
    if (!user) {
      setSignInOpen(true);
      return false;
    }
    return true;
  };

  const handleOutOfCredits = () => {
    if (native) {
      toast({
        title: "You're out of credits",
        description: "Manage your account on gifspark.app",
      });
    } else {
      setPricingOpen(true);
    }
  };

  const handleImageSelect = (file: File) => {
    if (!requireAuth()) return;
    if (noCredits) {
      handleOutOfCredits();
      return;
    }
    // Stash the original; don't set the cropped `selectedImage` until the user confirms framing.
    setOriginalImage(file);
    setSavedTransform(null);
    uploadCache.setOriginal(file, null);
    setIsFirstCrop(true);
    setRepositionOpen(true);
  };

  const handleAdjustFraming = () => {
    if (!originalImage) return;
    setIsFirstCrop(false);
    setRepositionOpen(true);
  };

  const handleRepositionConfirm = (croppedFile: File, transform: CropTransform) => {
    setSelectedImage(croppedFile);
    setSavedTransform(transform);
    const previewUrl = URL.createObjectURL(croppedFile);
    uploadCache.set(croppedFile, previewUrl);
    uploadCache.setOriginal(originalImage, transform);
    setRepositionOpen(false);
    setIsFirstCrop(false);
  };

  const handleRepositionCancel = () => {
    setRepositionOpen(false);
    if (isFirstCrop) {
      // No previous crop existed — drop everything back to the upload state.
      setOriginalImage(null);
      setSavedTransform(null);
      setSelectedImage(null);
      uploadCache.clear();
    }
    setIsFirstCrop(false);
  };

  const handleClearImage = () => {
    setSelectedImage(null);
    setOriginalImage(null);
    setSavedTransform(null);
    uploadCache.clear();
  };

  const handleGenerate = () => {
    if (!requireAuth()) return;
    if (noCredits) {
      handleOutOfCredits();
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
    setOriginalImage(null);
    setSavedTransform(null);
    setRecipientMessage("");
    setMotionStyle("wave");
    setConsent(false);
    uploadCache.clear();
    sessionStorage.removeItem(MOTION_STORAGE_KEY);
    sessionStorage.removeItem(RECIPIENT_STORAGE_KEY);
    reset();
  };

  if (result) {
    return (
      <div className="min-h-screen relative flex flex-col">
        <ConfettiBackground />
        <div className="relative z-10 flex-1">
          <Header
            onRequireSignIn={() => setSignInOpen(true)}
            onBuyCredits={native ? undefined : () => setPricingOpen(true)}
          />
          <main className="container max-w-4xl mx-auto px-4 sm:px-6 pb-16">
            <ResultView
              videoUrl={result.videoUrl}
              recipientMessage={result.recipientMessage}
              onCreateAnother={handleCreateAnother}
            />
          </main>
        </div>
        {!native && pricingOpen && (
          <Suspense fallback={null}>
            <PricingModal open={pricingOpen} onOpenChange={setPricingOpen} />
          </Suspense>
        )}
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
          onBuyCredits={native ? undefined : () => setPricingOpen(true)}
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
                <span>One portrait → an animated photo (short looping video) in seconds.</span>
                <span className="text-muted-foreground/50">·</span>
                <GifInfo />
              </p>
              <ImageUpload
                onImageSelect={handleImageSelect}
                selectedImage={selectedImage}
                onClear={handleClearImage}
                onAdjust={originalImage ? handleAdjustFraming : undefined}
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

              <div className="space-y-1.5 max-w-xs">
                <label className="text-sm font-medium text-foreground flex items-center justify-between gap-2">
                  <span>
                    Short Message <span className="text-muted-foreground">(optional)</span>
                  </span>
                  <span
                    className={`text-[11px] tabular-nums ${
                      recipientMessage.length > 60
                        ? recipientMessage.length >= 80
                          ? "text-destructive"
                          : "text-amber-600 dark:text-amber-400"
                        : "text-muted-foreground"
                    }`}
                  >
                    {recipientMessage.length}/80
                  </span>
                </label>
                <Input
                  placeholder="Add a message (e.g., Happy Birthday!)"
                  value={recipientMessage}
                  onChange={(e) => setRecipientMessage(e.target.value.slice(0, 80))}
                  maxLength={80}
                  aria-describedby="message-help"
                />
                <p id="message-help" className="text-[11px] text-muted-foreground">
                  {recipientMessage.length >= 80
                    ? "Maximum 80 characters reached."
                    : "Keep it short — appears as an overlay on your animation (max 80 chars)."}
                </p>
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
                Animate Photo
              </Button>
              {user && (
                <p className="text-xs text-center text-muted-foreground">
                  {noCredits
                    ? "You're out of animation credits."
                    : `${credits} ${credits === 1 ? "animation" : "animations"} remaining (1 credit per animated photo)`}
                </p>
              )}
            </div>

            {noCredits && (
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 text-sm text-foreground text-center space-y-2">
                <p className="font-medium">You're out of credits</p>
                {native ? (
                  <>
                    <p className="text-muted-foreground text-xs">
                      Manage your account on the GifSpark website.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openExternal(WEB_APP_URL)}
                      className="gap-1.5"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Manage on gifspark.app
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground text-xs">
                      Buy more to keep creating animated photos and short videos.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => setPricingOpen(true)}
                      className="gap-1.5"
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                      Buy credits
                    </Button>
                  </>
                )}
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

      {status !== "idle" && status !== "ready" && (
        <ProgressOverlay currentStatus={status} error={error} />
      )}

      <SignInDialog open={signInOpen} onOpenChange={setSignInOpen} />
      {!native && pricingOpen && (
        <Suspense fallback={null}>
          <PricingModal open={pricingOpen} onOpenChange={setPricingOpen} />
        </Suspense>
      )}
      <ImageRepositionDialog
        open={repositionOpen}
        sourceFile={originalImage}
        initialTransform={savedTransform ?? undefined}
        onConfirm={handleRepositionConfirm}
        onCancel={handleRepositionCancel}
      />
      <SupportChatButton hidden={status !== "idle" && status !== "ready"} />
    </div>
  );
};

export default Index;
