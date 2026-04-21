import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from "date-fns";
import { Sparkles, Trash2 } from "lucide-react";
import { getSessionGenerationIds, removeSessionGenerationId } from "@/lib/sessionGenerations";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface GenerationHistoryProps {
  onSelect: (generation: { videoUrl: string; recipientMessage: string | null }) => void;
}

export function GenerationHistory({ onSelect }: GenerationHistoryProps) {
  const { user } = useAuth();
  const sessionIds = getSessionGenerationIds();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: generations } = useQuery({
    queryKey: ["generations", "session", user?.id, sessionIds.join(",")],
    enabled: !!user && sessionIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generations")
        .select("*")
        .eq("status", "ready")
        .in("id", sessionIds)
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data;
    },
  });

  const handleDelete = async () => {
    if (!pendingDeleteId) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("generations")
        .delete()
        .eq("id", pendingDeleteId);
      if (error) throw error;
      removeSessionGenerationId(pendingDeleteId);
      await queryClient.invalidateQueries({ queryKey: ["generations"] });
      toast({ title: "Greeting deleted", description: "Your GIF has been removed." });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Couldn't delete",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setDeleting(false);
      setPendingDeleteId(null);
    }
  };

  if (!generations?.length) return null;

  return (
    <div className="mt-12">
      <h2 className="text-xl font-semibold text-foreground mb-4 text-center">Recent Greetings</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {generations.map((gen) => {
          const label = gen.recipient_name?.trim() ? gen.recipient_name : "Greeting";
          return (
            <Card
              key={gen.id}
              className="overflow-hidden hover:shadow-lg transition-shadow group relative"
            >
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7 rounded-full z-10 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity shadow-md"
                onClick={(e) => {
                  e.stopPropagation();
                  setPendingDeleteId(gen.id);
                }}
                aria-label={`Delete ${label}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <CardContent
                className="p-0 cursor-pointer"
                onClick={() =>
                  gen.video_url &&
                  onSelect({
                    videoUrl: gen.video_url,
                    recipientMessage: gen.recipient_name,
                  })
                }
              >
                <div className="aspect-square bg-muted flex items-center justify-center text-muted-foreground relative">
                  <Sparkles className="h-10 w-10" />
                  <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-background/85 backdrop-blur px-1.5 py-0.5 text-[9px] font-medium text-foreground border border-border">
                    <Sparkles className="h-2.5 w-2.5 text-primary" />
                    AI
                  </span>
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-foreground truncate whitespace-nowrap overflow-hidden">
                    {label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(gen.created_at), { addSuffix: true })}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog
        open={!!pendingDeleteId}
        onOpenChange={(o) => !o && !deleting && setPendingDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this greeting?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the GIF from your history. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
