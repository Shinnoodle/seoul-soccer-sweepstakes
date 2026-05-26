import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type Pool = {
  id: string;
  name: string;
};

export function usePool() {
  const { user } = useAuth();

  const { data: pools } = useQuery({
    queryKey: ["my-pools", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pool_members")
        .select("pool_id, pools(id, name)")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data.map((r) => r.pools as Pool);
    },
  });

  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);

  useEffect(() => {
    if (!pools || pools.length === 0) return;
    const stored = localStorage.getItem("selectedPoolId");
    const valid = pools.find((p) => p.id === stored);
    setSelectedPoolId(valid ? valid.id : pools[0].id);
  }, [pools]);

  const selectedPool = pools?.find((p) => p.id === selectedPoolId) ?? null;

  const selectPool = (id: string) => {
    setSelectedPoolId(id);
    localStorage.setItem("selectedPoolId", id);
  };

  return { pools: pools ?? [], selectedPool, selectPool };
}