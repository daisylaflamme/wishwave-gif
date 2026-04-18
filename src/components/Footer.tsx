import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-border/50 mt-8 py-6 px-4">
      <div className="container max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} WishWave</span>
        <span aria-hidden>·</span>
        <a
          href="https://runwayml.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground hover:underline"
        >
          Powered by Runway
        </a>
        <span aria-hidden>·</span>
        <Link to="/legal#terms" className="hover:text-foreground hover:underline">
          Terms
        </Link>
        <Link to="/legal#privacy" className="hover:text-foreground hover:underline">
          Privacy
        </Link>
        <Link to="/legal#content" className="hover:text-foreground hover:underline">
          Content Policy
        </Link>
      </div>
    </footer>
  );
}
