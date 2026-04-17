import { Sparkles } from "lucide-react";

export function Header() {
  return (
    <header className="text-center py-8 px-4">
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
