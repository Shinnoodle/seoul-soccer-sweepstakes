import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Logga in – VM-tips 2026" }] }),
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/today" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        if (displayName.trim().length < 2) throw new Error("Skriv ditt namn");
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            data: { display_name: displayName.trim() },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
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
          <h1 className="text-2xl font-bold">VM-tips 2026</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "signup" ? "Skapa konto" : "Logga in"}
          </p>
        </div>

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
          <button
            type="submit" disabled={loading}
            className="w-full rounded-xl bg-primary text-primary-foreground font-semibold py-3 disabled:opacity-50"
          >
            {loading ? "Laddar..." : (mode === "signup" ? "Skapa konto" : "Logga in")}
          </button>
        </form>

        <button
          onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(null); }}
          className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground"
        >
          {mode === "signup" ? "Har du konto? Logga in" : "Inget konto? Skapa ett"}
        </button>
      </div>
    </div>
  );
}
