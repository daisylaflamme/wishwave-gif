import { Sparkles, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export function Header() {
  const { user, signOut } = useAuth();

  return (
    <header className="relative text-center py-8 px-4">
      {user && (
        <div className="absolute right-4 top-4 flex items-center gap-2">
          <span className="hidden sm:inline text-sm text-muted-foreground truncate max-w-[160px]">
            {user.email}
          </span>
          <Button variant="ghost" size="sm" onClick={signOut} className="gap-1.5">
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      )}
      <div className="flex items-center justify-center gap-2 mb-2">
        <Sparkles className="h-8 w-8 text-primary" />
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          WishWave
        </h1>
        <Sparkles className="h-8 w-8 text-accent" />
      </div>
      <p className="text-muted-foreground text-lg">
        Turn your photo into an animated GIF with a natural wave, smile, or nod
      </p>
    </header>
  );
}
