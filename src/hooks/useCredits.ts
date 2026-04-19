import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface CreditsRow {
  credits: number;
  lifetime_purchased: number;
  lifetime_used: number;
}

export function useCredits() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["user_credits", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<CreditsRow> => {
      const { data, error } = await supabase
        .from("user_credits")
        .select("credits, lifetime_purchased, lifetime_used")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data ?? { credits: 0, lifetime_purchased: 0, lifetime_used: 0 };
    },
  });

  // Realtime: refresh credits when row changes (after webhook adds credits)
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`user_credits:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_credits",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["user_credits", user.id] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return {
    credits: query.data?.credits ?? 0,
    lifetimePurchased: query.data?.lifetime_purchased ?? 0,
    lifetimeUsed: query.data?.lifetime_used ?? 0,
    loading: query.isLoading,
    refetch: query.refetch,
  };
}
