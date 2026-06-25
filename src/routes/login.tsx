import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Logga in – Sweepstakes" }] }),
});

async function handlePendingInvite(userId: string) {
  const code = localStorage.getItem("pendingInviteCode");
  localStorage.removeItem("pendingInviteCode");

  let poolId: string | null = null;

  if (code) {
    const { data: pool } = await supabase
      .from("pools").select("id, entry_fee").eq("invite_code", code).single();
    if (pool) {
      poolId = pool.id;
      if (pool.entry_fee === 0) {
        await supabase.from("profiles").update({ approved: true }).eq("id", userId);
      }
    }
  }

  if (!poolId) {
    // Fall back to the default pool (oldest created)
    const { data: pool } = await supabase
      .from("pools").select("id").order("created_at", { ascending: true }).limit(1).single();
    if (pool) poolId = pool.id;
  }

  if (poolId) {
    await supabase.from("pool_members").upsert({ pool_id: poolId, user_id: userId });
  }
}

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [mode, setMode] = useState<"login" | "signup" | "reset" | "new-password">("login");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY event from Supabase reset link
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("new-password");
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/today" });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  async function submitNewPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordUpdated(true);
      setTimeout(() => navigate({ to: "/today" }), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Något gick fel");
    } finally {
      setLoading(false);
    }
  }

  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Något gick fel");
    } finally {
      setLoading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        if (displayName.trim().length < 2) throw new Error("Skriv ditt namn");
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: {
            data: { display_name: displayName.trim() },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        if (data.user) await handlePendingInvite(data.user.id);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) await handlePendingInvite(data.user.id);
      }
      navigate({ to: "/today" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Något gick fel");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="size-14 rounded-2xl bg-primary flex items-center justify-center mb-3">
            <Trophy className="size-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Sweepstakes</h1>
          <p className="text-sm text-muted-foreground">VM tips 2026</p>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "signup" ? "Skapa konto" : mode === "reset" ? "Återställ lösenord" : mode === "new-password" ? "Välj nytt lösenord" : "Logga in"}
          </p>
        </div>

        {mode === "new-password" ? (
          passwordUpdated ? (
            <p className="text-center text-sm text-success">Lösenord uppdaterat! Skickar vidare...</p>
          ) : (
            <form onSubmit={submitNewPassword} className="space-y-3">
              <input
                type="password" required minLength={6}
                autoComplete="new-password"
                placeholder="Nytt lösenord (min 6 tecken)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl bg-input border border-border px-4 py-3 text-base outline-none focus:border-primary"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full rounded-xl bg-primary text-primary-foreground font-semibold py-3 disabled:opacity-50">
                {loading ? "Sparar..." : "Spara nytt lösenord"}
              </button>
            </form>
          )
        ) : mode === "reset" ? (
          resetSent ? (
            <div className="text-center space-y-3">
              <p className="text-sm text-success">Återställningslänk skickad! Kolla din e-post.</p>
              <button onClick={() => { setMode("login"); setResetSent(false); }} className="text-sm text-primary hover:underline">
                Tillbaka till inloggning
              </button>
            </div>
          ) : (
            <form onSubmit={submitReset} className="space-y-3">
              <input
                type="email" required autoComplete="email"
                placeholder="E-post"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl bg-input border border-border px-4 py-3 text-base outline-none focus:border-primary"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full rounded-xl bg-primary text-primary-foreground font-semibold py-3 disabled:opacity-50">
                {loading ? "Skickar..." : "Skicka återställningslänk"}
              </button>
              <button type="button" onClick={() => { setMode("login"); setError(null); }}
                className="w-full text-sm text-muted-foreground hover:text-foreground">
                Tillbaka
              </button>
            </form>
          )
        ) : (
          <>
            <form onSubmit={submit} className="space-y-3">
              {mode === "signup" && (
                <input
                  type="text" required minLength={2} maxLength={40}
                  placeholder="Namn (visas i leaderboard)"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-xl bg-input border border-border px-4 py-3 text-base outline-none focus:border-primary"
                />
              )}
              <input
                type="email" required autoComplete="email"
                placeholder="E-post"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl bg-input border border-border px-4 py-3 text-base outline-none focus:border-primary"
              />
              <input
                type="password" required minLength={6}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                placeholder="Lösenord (min 6 tecken)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl bg-input border border-border px-4 py-3 text-base outline-none focus:border-primary"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full rounded-xl bg-primary text-primary-foreground font-semibold py-3 disabled:opacity-50">
                {loading ? "Laddar..." : (mode === "signup" ? "Skapa konto" : "Logga in")}
              </button>
            </form>
            {mode === "login" && (
              <button onClick={() => { setMode("reset"); setError(null); }}
                className="w-full mt-2 text-sm text-muted-foreground hover:text-foreground">
                Glömt lösenordet?
              </button>
            )}
            <button
              onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(null); }}
              className="w-full mt-2 text-sm text-muted-foreground hover:text-foreground">
              {mode === "signup" ? "Har du konto? Logga in" : "Inget konto? Skapa ett"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}