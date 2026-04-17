import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sparkles } from "lucide-react";
import { lovable } from "@/integrations/lovable/index";
import { useToast } from "@/hooks/use-toast";

interface SignInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SignInDialog({ open, onOpenChange }: SignInDialogProps) {
  const { toast } = useToast();

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
      </DialogContent>
    </Dialog>
  );
}
