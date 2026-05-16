import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  ArrowLeft,
  Shield,
  Lock,
  Sparkles,
  AlertTriangle,
  Flag,
  CheckCircle2,
  Trash2,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const SUPPORT_EMAIL = "administrator@daisylaflamme.com";

const Legal = () => {
  return (
    <div className="min-h-screen bg-gradient-soft">
      <Helmet>
        <title>Trust & Safety — GifSpark</title>
        <meta name="description" content="How GifSpark handles consent, privacy, AI disclosure, and abuse reporting for animated photos." />
        <link rel="canonical" href="https://gifspark.lovable.app/legal" />
        <meta property="og:title" content="Trust & Safety — GifSpark" />
        <meta property="og:description" content="Consent, privacy, AI disclosure, and abuse reporting at GifSpark." />
        <meta property="og:url" content="https://gifspark.lovable.app/legal" />
      </Helmet>
      <main className="container max-w-3xl mx-auto px-4 py-10">
        <Button asChild variant="ghost" size="sm" className="mb-6 gap-1.5">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>

        {/* Hero */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-4">
            <Shield className="h-3.5 w-3.5" />
            Trust & Safety
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">
            Built on trust, by design.
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            We built GifSpark to be fun, safe, and respectful. You stay in control
            of your data, your images, and how they're used.
          </p>
        </div>

        {/* Quick nav */}
        <nav className="mb-12 flex flex-wrap gap-2 text-sm">
          {[
            ["#overview", "Overview"],
            ["#consent", "Consent"],
            ["#privacy", "Privacy"],
            ["#ai", "AI Disclosure"],
            ["#safety", "Safety"],
            ["#report", "Report"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              {label}
            </a>
          ))}
        </nav>

        {/* 1. Trust Overview */}
        <Section
          id="overview"
          icon={<Shield className="h-5 w-5" />}
          title="The basics"
          subtitle="Five things that are always true at GifSpark."
        >
          <ul className="space-y-3">
            {[
              "You must own — or have permission to use — any photo you upload.",
              "Your image is used only to generate your GIF. Nothing else.",
              "Your original photo is automatically deleted right after processing.",
              "You can delete any generated GIF from your history at any time.",
              "All animations are clearly labeled as AI-generated.",
            ].map((line) => (
              <li key={line} className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span className="text-foreground/90">{line}</span>
              </li>
            ))}
          </ul>
        </Section>

        {/* 2. Consent & Ownership */}
        <Section
          id="consent"
          icon={<CheckCircle2 className="h-5 w-5" />}
          title="Consent & ownership"
          subtitle="Your responsibility before you upload."
        >
          <p className="text-foreground/90 mb-4">
            By uploading a photo, you confirm one of the following is true:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-foreground/90 mb-5">
            <li>You took the photo yourself, or you own the rights to it.</li>
            <li>
              You have explicit permission from every identifiable person in the
              image to use their likeness in an AI-generated greeting.
            </li>
          </ul>
          <Callout variant="warn" icon={<AlertTriangle className="h-4 w-4" />}>
            <strong>Don't upload photos of people without their permission.</strong>{" "}
            This includes friends, family, coworkers, public figures, and minors —
            for minors, only a parent or legal guardian may upload.
          </Callout>
        </Section>

        {/* 3. Privacy & Data Handling */}
        <Section
          id="privacy"
          icon={<Lock className="h-5 w-5" />}
          title="Privacy & data handling"
          subtitle="Plain English. No hidden tricks."
        >
          <h3 className="font-semibold text-foreground mb-2">What we collect</h3>
          <ul className="list-disc pl-5 space-y-1.5 text-foreground/90 mb-5">
            <li>Your email and basic profile info from Google sign-in.</li>
            <li>The photo you upload (temporarily).</li>
            <li>The GIF we generate for you.</li>
          </ul>

          <h3 className="font-semibold text-foreground mb-2">
            What happens to your photo
          </h3>
          <ul className="list-disc pl-5 space-y-1.5 text-foreground/90 mb-5">
            <li>
              It's sent securely to our AI provider (Runway) <strong>only</strong>{" "}
              to generate your animation.
            </li>
            <li>
              It's <strong>not</strong> used to train AI models — ours or theirs.
            </li>
            <li>
              It's <strong>automatically deleted immediately</strong> after the GIF
              is generated.
            </li>
          </ul>

          <h3 className="font-semibold text-foreground mb-2">Your generated GIF</h3>
          <ul className="list-disc pl-5 space-y-1.5 text-foreground/90 mb-5">
            <li>Stored privately in your account, visible only to you.</li>
            <li>You can delete it any time from "Recent Greetings".</li>
          </ul>

          <Callout variant="ok" icon={<Lock className="h-4 w-4" />}>
            <strong>We do not sell or share your images.</strong> Ever.
          </Callout>

          <p className="text-sm text-muted-foreground mt-5">
            Want everything deleted? Email{" "}
            <a
              className="text-primary underline underline-offset-2 hover:opacity-80"
              href={`mailto:${SUPPORT_EMAIL}`}
            >
              {SUPPORT_EMAIL}
            </a>{" "}
            and we'll wipe your account.
          </p>
        </Section>

        {/* 4. AI Disclosure */}
        <Section
          id="ai"
          icon={<Sparkles className="h-5 w-5" />}
          title="AI-generated content"
          subtitle="What AI can — and can't — do here."
        >
          <ul className="list-disc pl-5 space-y-2 text-foreground/90">
            <li>All animations on GifSpark are generated using AI.</li>
            <li>
              Results may not always be perfectly accurate, realistic, or true to
              the original photo.
            </li>
            <li>
              Generated content must <strong>not</strong> be used to mislead,
              defraud, or impersonate anyone.
            </li>
            <li>
              Generated GIFs may include a subtle AI indicator or watermark to keep
              things transparent.
            </li>
          </ul>
        </Section>

        {/* 5. Safety & Misuse */}
        <Section
          id="safety"
          icon={<AlertTriangle className="h-5 w-5" />}
          title="Safety & misuse policy"
          subtitle="A short list. We take it seriously."
        >
          <p className="text-foreground/90 mb-3">The following is not allowed:</p>
          <ul className="space-y-2.5">
            {[
              "Uploading photos of people without their consent",
              "Impersonating real people or public figures",
              "Harassment, bullying, or harmful content",
              "Sexual, explicit, or violent content",
              "Political deepfakes or misleading media",
              "Fraud, deception, or any unlawful use",
            ].map((line) => (
              <li key={line} className="flex gap-3 text-foreground/90">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-destructive shrink-0" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <Callout variant="warn" icon={<Trash2 className="h-4 w-4" />} className="mt-5">
            We may remove content and suspend accounts that violate these rules.
          </Callout>
        </Section>

        {/* 6. Report */}
        <Section
          id="report"
          icon={<Flag className="h-5 w-5" />}
          title="Report abuse"
          subtitle="See something off? Let us know."
        >
          <p className="text-foreground/90 mb-4">
            If you believe content on GifSpark violates our policy — or uses your
            likeness without permission — please report it. We review and remove
            violating content quickly.
          </p>
          <Button asChild size="lg" className="gap-2">
            <a href={`mailto:${SUPPORT_EMAIL}?subject=Report%20abuse%20on%20GifSpark`}>
              <Mail className="h-4 w-4" />
              Report content
            </a>
          </Button>
          <p className="text-xs text-muted-foreground mt-3">
            Or email us directly at{" "}
            <a
              className="text-primary underline underline-offset-2 hover:opacity-80"
              href={`mailto:${SUPPORT_EMAIL}`}
            >
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </Section>

        <p className="text-xs text-muted-foreground text-center mt-12">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </main>
    </div>
  );
};

function Section({
  id,
  icon,
  title,
  subtitle,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 mb-10">
      <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
        <div className="flex items-start gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-foreground leading-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="text-[15px] leading-relaxed">{children}</div>
      </div>
    </section>
  );
}

function Callout({
  variant,
  icon,
  className,
  children,
}: {
  variant: "ok" | "warn";
  icon: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  const styles =
    variant === "ok"
      ? "bg-primary/5 border-primary/20 text-foreground"
      : "bg-destructive/5 border-destructive/20 text-foreground";
  const iconColor = variant === "ok" ? "text-primary" : "text-destructive";
  return (
    <div
      className={`rounded-xl border p-4 flex gap-3 text-sm ${styles} ${className ?? ""}`}
    >
      <span className={`mt-0.5 shrink-0 ${iconColor}`}>{icon}</span>
      <div>{children}</div>
    </div>
  );
}

export default Legal;
