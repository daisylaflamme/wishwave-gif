import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface CreditsRow {
  credits: number;
  lifetime_purchased: number;
  lifetime_used: number;
}

export function useCredits() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["user_credits", user?.id],
    enabled: !!user,
    // Poll every 10s instead of using Realtime (Realtime channel auth would
    // otherwise expose other users' credit updates).
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
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

  return {
    credits: query.data?.credits ?? 0,
    lifetimePurchased: query.data?.lifetime_purchased ?? 0,
    lifetimeUsed: query.data?.lifetime_used ?? 0,
    loading: query.isLoading,
    refetch: query.refetch,
  };
}
