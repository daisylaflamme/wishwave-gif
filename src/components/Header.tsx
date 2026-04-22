import { Sparkles, LogOut, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { CreditsBadge } from "@/components/CreditsBadge";

interface HeaderProps {
  onRequireSignIn?: () => void;
  onBuyCredits?: () => void;
}

export function Header({ onRequireSignIn, onBuyCredits }: HeaderProps) {
  const { user, signOut } = useAuth();

  return (
    <header className="w-full px-4 sm:px-6 pt-5 pb-8 sm:pb-12">
      {/* Top bar: logo left, user controls right */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8 sm:mb-12 min-h-[2.25rem]">
        <div className="flex items-center" aria-hidden="true" />

        <div className="flex flex-wrap items-center justify-end gap-2">
          {user && onBuyCredits && <CreditsBadge onBuyClick={onBuyCredits} />}
          {user ? (
            <>
              <span className="hidden md:inline text-sm text-muted-foreground truncate max-w-[160px]">
                {user.email}
              </span>
              <Button variant="ghost" size="sm" onClick={signOut} className="gap-1.5">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </>
          ) : (
            onRequireSignIn && (
              <Button variant="ghost" size="sm" onClick={onRequireSignIn} className="gap-1.5">
                <LogIn className="h-4 w-4" />
                Sign in
              </Button>
            )
          )}
        </div>
      </div>

      {/* Hero title */}
      <div className="text-center max-w-2xl mx-auto">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Sparkles className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            GifSpark
          </h1>
          <Sparkles className="h-7 w-7 sm:h-8 sm:w-8 text-accent" />
        </div>
        <p className="text-base sm:text-lg text-muted-foreground leading-relaxed px-4">
          Turn one portrait into a{" "}
          <span className="text-foreground font-medium">tiny, shareable reaction GIF</span>{" "}
          in seconds.
        </p>
      </div>
    </header>
  );
}
