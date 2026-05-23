import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Medal, Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const { data: rows, isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leaderboard")
        .select("*")
        .order("total_points", { ascending: false });
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Leaderboard</h1>

      {isLoading && <p className="text-muted-foreground">Laddar...</p>}

      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        {rows?.map((r, i) => (
          <div key={r.user_id} className="flex items-center gap-3 p-3 border-b border-border last:border-b-0">
            <div className="w-8 text-center font-bold text-muted-foreground">
              {i === 0 ? <Trophy className="size-5 mx-auto text-primary" /> :
               i === 1 ? <Medal className="size-5 mx-auto text-muted-foreground" /> :
               i === 2 ? <Star className="size-5 mx-auto text-muted-foreground" /> :
               <span>{i + 1}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{r.display_name}</div>
              <div className="text-xs text-muted-foreground">
                Match {r.match_points}p · Långtid {r.longterm_points}p
              </div>
            </div>
            <div className="text-2xl font-bold text-primary">{r.total_points}</div>
          </div>
        ))}
        {rows?.length === 0 && <p className="p-6 text-center text-muted-foreground">Inga spelare ännu.</p>}
      </div>
    </div>
  );
}
