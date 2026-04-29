import { Sparkles, LogOut, LogIn, User as UserIcon, Receipt } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { CreditsBadge } from "@/components/CreditsBadge";
import { isNativeApp } from "@/lib/platform";

interface HeaderProps {
  onRequireSignIn?: () => void;
  onBuyCredits?: () => void;
}

export function Header({ onRequireSignIn, onBuyCredits }: HeaderProps) {
  const { user, signOut } = useAuth();
  const native = isNativeApp();

  return (
    <header className="w-full px-4 sm:px-6 pt-safe pb-8 sm:pb-12">
      {/* Top bar: logo left, user controls right */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8 sm:mb-12 min-h-[2.75rem] pt-3">
        <div className="flex items-center" aria-hidden="true" />

        <div className="flex flex-wrap items-center justify-end gap-2">
          {user && onBuyCredits && <CreditsBadge onBuyClick={onBuyCredits} />}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <UserIcon className="h-4 w-4" />
                  <span className="hidden sm:inline truncate max-w-[140px]">{user.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {!native && (
                  <DropdownMenuItem asChild>
                    <Link to="/payment-history" className="cursor-pointer gap-2">
                      <Receipt className="h-4 w-4" />
                      Payment History
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={signOut} className="cursor-pointer gap-2">
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
          <span className="text-foreground font-medium">shareable animated photo</span>{" "}
          — a short looping video you can send anywhere, in seconds.
        </p>
      </div>
    </header>
  );
}
