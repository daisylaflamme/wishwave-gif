import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { lovable } from "@/integrations/lovable/index";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

interface SignInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SignInDialog({ open, onOpenChange }: SignInDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  // Auto-close immediately after successful sign-in
  useEffect(() => {
    if (open && user) onOpenChange(false);
  }, [open, user, onOpenChange]);

  const handleGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast({
        variant: "destructive",
        title: "Sign in failed",
        description: result.error.message ?? "Please try again.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="items-center text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle>Sign in to continue</DialogTitle>
          <DialogDescription>
            Sign in with Google to upload a photo and generate your animated GIF greeting.
          </DialogDescription>
        </DialogHeader>
        <Button size="lg" className="w-full h-12 rounded-xl mt-2" onClick={handleGoogle}>
          Continue with Google
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-3 leading-relaxed">
          By continuing, you agree to our{" "}
          <Link to="/legal#terms" className="underline hover:text-foreground" target="_blank">
            Terms
          </Link>
          ,{" "}
          <Link to="/legal#privacy" className="underline hover:text-foreground" target="_blank">
            Privacy Policy
          </Link>
          , and{" "}
          <Link to="/legal#content" className="underline hover:text-foreground" target="_blank">
            Content Policy
          </Link>
          . You confirm you own the rights to any photo you upload and consent to its
          processing. AI-generated content may be imperfect or inaccurate.
        </p>
      </DialogContent>
    </Dialog>
  );
}
