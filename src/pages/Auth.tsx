import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function Auth() {
  const { session, loading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    document.title = "Sign in — WishWave";
  }, []);

  if (loading) return null;
  if (session) return <Navigate to="/" replace />;

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-soft px-4">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-lg border p-8 text-center space-y-6">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            WishWave
          </h1>
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Sign in to continue</h2>
          <p className="text-sm text-muted-foreground">
            Sign in to create animated GIF greetings from your photos.
          </p>
        </div>
        <Button size="lg" className="w-full h-12 rounded-xl" onClick={handleGoogle}>
          Continue with Google
        </Button>
      </div>
    </div>
  );
}
