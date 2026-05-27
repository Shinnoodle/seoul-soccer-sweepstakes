import { createFileRoute, Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, ListChecks, Trophy, User, Shield, LogOut, BookOpen, MessageCircle, Menu, X, Star, Gift, ClipboardList, BarChart3, GitBranch, ChevronDown, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePool } from "@/hooks/usePool";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function PoolSelector() {
  const { pools, selectedPool, selectPool } = usePool();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (!pools || pools.length <= 1) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-accent transition-colors"
      >
        <Users className="size-3.5 text-primary" />
        <span className="max-w-[80px] truncate">{selectedPool?.name ?? "Välj pool"}</span>
        <ChevronDown className={`size-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-48 rounded-xl border border-border bg-card shadow-lg overflow-hidden z-50">
          {pools.map(pool => (
            <button
              key={pool.id}
              onClick={() => { selectPool(pool.id); setOpen(false); }}
              className={cn(
                "w-full flex items-center gap-2 px-4 py-3 text-sm text-left hover:bg-accent transition-colors border-b border-border last:border-0",
                selectedPool?.id === pool.id ? "text-primary font-semibold" : "text-foreground"
              )}
            >
              <Users className="size-4 shrink-0" />
              {pool.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AuthLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadChat, setUnreadChat] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isOnChatRef = useRef(false);

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

  useEffect(() => {
    isOnChatRef.current = location.pathname.startsWith("/chat");
    if (location.pathname.startsWith("/chat")) {
      setUnreadChat(false);
      localStorage.setItem("chat_last_seen", new Date().toISOString());
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!ready) return;
    const lastSeen = localStorage.getItem("chat_last_seen");
    if (lastSeen && !isOnChatRef.current) {
      supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .gt("created_at", lastSeen)
        .then(({ count }) => { if (count && count > 0) setUnreadChat(true); });
    }
    const ch = supabase
      .channel("chat_unread")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, () => {
        if (!isOnChatRef.current) setUnreadChat(true);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [ready]);

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
        <Link to="/today" className="flex items-center gap-2">
          <Trophy className="size-5 text-primary" />
          <div className="leading-tight">
            <div className="font-bold text-sm">Sweepstakes</div>
            <div className="text-[10px] text-muted-foreground">VM tips 2026</div>
          </div>
        </Link>

        <div className="flex items-center gap-2 ml-auto">
          <PoolSelector />

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
                <Link to="/rules" className="flex items-center gap-3 px-4 py-3 text-sm font-semibold hover:bg-accent transition-colors border-b border-border">
                  <BookOpen className="size-5 text-primary" />
                  Regler
                </Link>
                <Link to="/profile" className="flex items-center gap-3 px-4 py-3 text-sm font-semibold hover:bg-accent transition-colors border-b border-border">
                  <Star className="size-5 text-primary" />
                  Turneringstips
                </Link>
                <Link to="/leaderboard" search={{ tab: "prizes" }} className="flex items-center gap-3 px-4 py-3 text-sm font-semibold hover:bg-accent transition-colors border-b border-border">
                  <Gift className="size-5 text-primary" />
                  Priser
                </Link>
                <Link to="/leaderboard" search={{ tab: "tips" }} className="flex items-center gap-3 px-4 py-3 text-sm font-semibold hover:bg-accent transition-colors border-b border-border">
                  <ClipboardList className="size-5 text-primary" />
                  Tipslistan
                </Link>
                <Link to="/leaderboard" search={{ tab: "stats" }} className="flex items-center gap-3 px-4 py-3 text-sm font-semibold hover:bg-accent transition-colors border-b border-border">
                  <BarChart3 className="size-5 text-primary" />
                  Statistik
                </Link>
                <Link to="/bracket" className="flex items-center gap-3 px-4 py-3 text-sm font-semibold hover:bg-accent transition-colors">
                  <GitBranch className="size-5 text-primary" />
                  Slutspelsträd
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
                  <span className="relative">
                    <Icon className="size-5" />
                    {t.to === "/chat" && unreadChat && (
                      <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-destructive" />
                    )}
                  </span>
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