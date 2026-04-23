import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    document.title = "Page not found — GifSpark";
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="text-center max-w-md">
        <h1 className="mb-4 text-5xl font-bold text-foreground">404</h1>
        <p className="mb-6 text-lg text-foreground/80">
          We couldn't find that page. Let's get you back to making GIFs.
        </p>
        <a
          href="/"
          className="inline-flex items-center justify-center h-11 px-5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
        >
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
