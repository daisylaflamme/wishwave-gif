import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const Legal = () => {
  return (
    <div className="min-h-screen bg-gradient-soft">
      <main className="container max-w-3xl mx-auto px-4 py-10">
        <Button asChild variant="ghost" size="sm" className="mb-4 gap-1.5">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>

        <h1 className="text-3xl md:text-4xl font-bold mb-2">Legal</h1>
        <p className="text-muted-foreground mb-8">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <nav className="mb-10 flex flex-wrap gap-3 text-sm">
          <a href="#terms" className="text-primary hover:underline">Terms of Service</a>
          <a href="#privacy" className="text-primary hover:underline">Privacy Policy</a>
          <a href="#content" className="text-primary hover:underline">Content Policy</a>
        </nav>

        <section id="terms" className="prose prose-slate max-w-none mb-12">
          <h2 className="text-2xl font-semibold mb-3">Terms of Service</h2>
          <p className="text-muted-foreground mb-3">
            By signing in and using WishWave, you agree to these terms.
          </p>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li>
              <strong>Image rights:</strong> You confirm that you own the rights to any photo
              you upload, or that you have the explicit permission of every identifiable person
              in it to use their likeness in an AI-generated greeting.
            </li>
            <li>
              <strong>Consent to processing:</strong> You consent to WishWave uploading,
              storing, and processing your image with our AI provider to generate an animated
              greeting.
            </li>
            <li>
              <strong>AI-generated content:</strong> Generated videos are produced by an AI
              model and may be imperfect, inaccurate, or contain visual artifacts. WishWave
              makes no guarantee of likeness accuracy or fitness for any particular purpose.
            </li>
            <li>
              <strong>Free-tier limits:</strong> Each account is limited to 3 successful
              generations during the free tier. Failed generations do not count.
            </li>
            <li>
              <strong>Account &amp; termination:</strong> We may suspend accounts that violate
              these terms or our Content Policy.
            </li>
          </ul>
        </section>

        <section id="privacy" className="prose prose-slate max-w-none mb-12">
          <h2 className="text-2xl font-semibold mb-3">Privacy Policy</h2>
          <p className="text-muted-foreground mb-3">
            We take your privacy seriously. Photos containing faces are personal data, and we
            handle them accordingly.
          </p>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li>
              <strong>What we collect:</strong> your email and basic profile data from Google
              sign-in, the photos you upload, and the greetings we generate for you.
            </li>
            <li>
              <strong>How we use it:</strong> solely to provide the WishWave service —
              authenticating you, generating your greeting, and showing you your history.
            </li>
            <li>
              <strong>Third parties:</strong> uploaded images are sent to our AI video
              provider (Runway) for the sole purpose of generating your greeting.
            </li>
            <li>
              <strong>Storage:</strong> uploads and generated videos are stored in private
              per-user folders protected by row-level security.
            </li>
            <li>
              <strong>Your rights:</strong> you can request deletion of your account and all
              associated data at any time by contacting us.
            </li>
          </ul>
        </section>

        <section id="content" className="prose prose-slate max-w-none mb-12">
          <h2 className="text-2xl font-semibold mb-3">Content Policy</h2>
          <p className="text-muted-foreground mb-3">
            To keep WishWave safe and respectful, the following are not allowed:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li>Photos of people without their consent.</li>
            <li>Photos of minors uploaded by anyone other than a parent or legal guardian.</li>
            <li>Sexual, violent, hateful, harassing, or deceptive content.</li>
            <li>Impersonation of real public figures in misleading contexts.</li>
            <li>Any content that violates applicable laws.</li>
          </ul>
          <p className="text-muted-foreground mt-3">
            We may remove content and suspend accounts that violate this policy.
          </p>
        </section>
      </main>
    </div>
  );
};

export default Legal;
