import { Link } from "react-router-dom";
import { openExternal } from "@/lib/platform";

export function Footer() {
  const handleExternal = (url: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    openExternal(url);
  };

  return (
    <footer
      className="border-t border-border/50 mt-8 px-4 pt-8"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 2rem)" }}
    >
      <div className="container max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-3 text-xs text-muted-foreground min-h-[3rem]">
        <span>© {new Date().getFullYear()} GifSpark</span>
        <span aria-hidden>·</span>
        <a
          href="https://runwayml.com"
          onClick={handleExternal("https://runwayml.com")}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground hover:underline"
        >
          Powered by Runway
        </a>
        <span aria-hidden>·</span>
        <Link to="/legal" className="hover:text-foreground hover:underline">
          Trust & Safety
        </Link>
        <Link to="/legal#privacy" className="hover:text-foreground hover:underline">
          Privacy
        </Link>
        <Link to="/legal#report" className="hover:text-foreground hover:underline">
          Report abuse
        </Link>
        <a
          href="mailto:administrator@daisylaflamme.com?subject=GifSpark%20feedback"
          className="hover:text-foreground hover:underline"
        >
          Send feedback
        </a>
      </div>
    </footer>
  );
}
