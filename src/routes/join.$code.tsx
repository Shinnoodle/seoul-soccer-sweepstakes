import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/join/$code")({
  component: JoinPage,
});

function JoinPage() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [poolName, setPoolName] = useState("");

  useEffect(() => {
    async function join() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Spara koden och redirecta till login
        localStorage.setItem("pendingInviteCode", code);
        navigate({ to: "/login" });
        return;
      }

      // Hitta poolen
      const { data: pool, error } = await supabase
        .from("pools")
        .select("id, name, entry_fee")
        .eq("invite_code", code)
        .single();

      if (error || !pool) {
        setStatus("error");
        return;
      }

      setPoolName(pool.name);

      // Kolla om redan medlem
      const { data: existing } = await supabase
        .from("pool_members")
        .select("user_id")
        .eq("pool_id", pool.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        navigate({ to: "/today" });
        return;
      }

      // Lägg till användaren i poolen
      const { error: joinError } = await supabase
        .from("pool_members")
        .upsert({ pool_id: pool.id, user_id: user.id });

      if (joinError) {
        setStatus("error");
        return;
      }

      if (pool.entry_fee === 0) {
        await supabase.from("profiles").update({ approved: true }).eq("id", user.id);
      }

      setStatus("success");
      setTimeout(() => navigate({ to: "/today" }), 2000);
    }

    join();
  }, [code, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="rounded-2xl bg-card border border-border p-8 text-center space-y-4 max-w-sm w-full">
        {status === "loading" && (
          <>
            <div className="text-4xl">⚽</div>
            <p className="text-muted-foreground">Ansluter till pool...</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="text-4xl">🎉</div>
            <h1 className="text-xl font-bold">Du är med!</h1>
            <p className="text-muted-foreground">Du har gått med i <strong>{poolName}</strong>. Skickar dig vidare...</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="text-4xl">😕</div>
            <h1 className="text-xl font-bold">Ogiltig länk</h1>
            <p className="text-muted-foreground">Inbjudningslänken verkar inte stämma. Be om en ny länk!</p>
            <button
              onClick={() => navigate({ to: "/login" })}
              className="rounded-xl bg-primary text-primary-foreground font-semibold px-4 py-2 w-full"
            >
              Gå till appen
            </button>
          </>
        )}
      </div>
    </div>
  );
}