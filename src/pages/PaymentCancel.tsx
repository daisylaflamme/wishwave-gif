import { Link } from "react-router-dom";
import { XCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PaymentCancel() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-soft">
      <div className="max-w-md w-full bg-card rounded-2xl shadow-lg border p-8 text-center space-y-4">
        <XCircle className="h-12 w-12 mx-auto text-muted-foreground" />
        <h1 className="text-2xl font-bold">Payment canceled</h1>
        <p className="text-sm text-muted-foreground">No credits were added to your account.</p>
        <div className="flex flex-col gap-2 pt-2">
          <Button asChild size="lg" className="w-full gap-2">
            <Link to="/?buy=1">
              <Sparkles className="h-4 w-4" />
              Choose another credit package
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link to="/">Back to GifSpark</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
