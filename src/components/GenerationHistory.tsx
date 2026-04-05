import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

interface GenerationHistoryProps {
  onSelect: (generation: {
    videoUrl: string;
    audioUrl: string;
    recipientName: string | null;
  }) => void;
}

export function GenerationHistory({ onSelect }: GenerationHistoryProps) {
  const { data: generations } = useQuery({
    queryKey: ["generations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generations")
        .select("*")
        .eq("status", "ready")
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data;
    },
  });

  if (!generations?.length) return null;

  return (
    <div className="mt-12">
      <h2 className="text-xl font-semibold text-foreground mb-4 text-center">
        Recent Greetings
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {generations.map((gen) => (
          <Card
            key={gen.id}
            className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
            onClick={() =>
              gen.video_url &&
              gen.audio_url &&
              onSelect({
                videoUrl: gen.video_url,
                audioUrl: gen.audio_url,
                recipientName: gen.recipient_name,
              })
            }
          >
            <CardContent className="p-0">
              <div className="aspect-square bg-muted flex items-center justify-center text-4xl">
                🎂
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-foreground truncate">
                  {gen.recipient_name || "Birthday Greeting"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(gen.created_at), { addSuffix: true })}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
