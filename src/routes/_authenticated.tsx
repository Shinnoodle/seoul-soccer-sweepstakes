import { createFileRoute, Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, ListChecks, Trophy, User, Shield, LogOut, BookOpen, MessageCircle, Menu, X, Star, Gift, ClipboardList, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!mounted) return;
      if (!s) navigate({ to: "/login" });
    });
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { navigate({ to: "/login" }); return; }
      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", data.session.user.id);
      if (!mounted) return;
      setIsAdmin(!!roles?.some(r => r.role === "admin"));
      setReady(true);
    })();
    return () => { mounted = false; subscription.unsubscribe(); };
  }, [navigate]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  if (!ready) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Laddar...</div>;

  const tabs = [
    { to: "/today", label: "Idag", icon: Calendar },
    { to: "/matches", label: "Matcher", icon: ListChecks },
    { to: "/leaderboard", label: "Tabell", icon: Trophy },
    { to: "/chat", label: "Chat", icon: MessageCircle },
    { to: "/profile", label: "Profil", icon: User },
    ...(isAdmin ? [{ to: "/admin", label: "Admin", icon: Shield }] : []),
  ];

  return (
    <div className="min-h-screen flex flex-col pb-20">
      <header className="px-4 py-3 border-b border-border flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-20">
        <div className="flex items-center gap-2">
          <Trophy className="size-5 text-primary" />
          <div className="leading-tight">
            <div className="font-bold text-sm">Sweepstakes</div>
            <div className="text-[10px] text-muted-foreground">VM tips 2026</div>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="flex items-center justify-center p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Meny"
            >
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-border bg-card shadow-lg overflow-hidden z-50">
                <Link
                  to="/rules"
                  className="flex items-center gap-3 px-4 py-3 text-sm font-semibold hover:bg-accent transition-colors border-b border-border"
                >
                  <BookOpen className="size-5 text-primary" />
                  Regler
                </Link>
                <Link
                  to="/profile"
                  className="flex items-center gap-3 px-4 py-3 text-sm font-semibold hover:bg-accent transition-colors border-b border-border"
                >
                  <Star className="size-5 text-primary" />
                  Turneringstips
                </Link>
                <Link
                  to="/leaderboard"
                  search={{ tab: "prizes" }}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-semibold hover:bg-accent transition-colors border-b border-border"
                >
                  <Gift className="size-5 text-primary" />
                  Priser
                </Link>
                <Link
                  to="/leaderboard"
                  search={{ tab: "tips" }}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-semibold hover:bg-accent transition-colors border-b border-border"
                >
                  <ClipboardList className="size-5 text-primary" />
                  Tipslistan
                </Link>
                <Link
                  to="/leaderboard"
                  search={{ tab: "stats" }}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-semibold hover:bg-accent transition-colors"
                >
                  <BarChart3 className="size-5 text-primary" />
                  Statistik
                </Link>
              </div>
            )}
          </div>

          <button
            onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/login" }); }}
            className="text-muted-foreground hover:text-foreground p-2"
            aria-label="Logga ut"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-card border-t border-border z-20">
        <ul className="flex">
          {tabs.map(t => {
            const active = location.pathname.startsWith(t.to);
            const Icon = t.icon;
            return (
              <li key={t.to} className="flex-1">
                <Link
                  to={t.to}
                  className={cn(
                    "flex flex-col items-center justify-center py-2.5 text-[11px] gap-0.5",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <Icon className="size-5" />
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
