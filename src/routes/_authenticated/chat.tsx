import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Send, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/chat")({
  component: ChatPage,
});

type Msg = { id: string; user_id: string; content: string; created_at: string };

function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [text, setText] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user.id ?? null;
      setUserId(uid);
      if (uid) {
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid);
        setIsAdmin(!!roles?.some(r => r.role === "admin"));
      }

      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(500);
      setMessages((data as Msg[]) ?? []);
      await loadNames((data as Msg[]) ?? []);
    })();

    const ch = supabase
      .channel("chat_messages_rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, async (payload) => {
        const m = payload.new as Msg;
        setMessages(prev => prev.some(p => p.id === m.id) ? prev : [...prev, m]);
        await loadNames([m]);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "chat_messages" }, (payload) => {
        const old = payload.old as Msg;
        setMessages(prev => prev.filter(p => p.id !== old.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, []);

  async function loadNames(msgs: Msg[]) {
    const missing = Array.from(new Set(msgs.map(m => m.user_id))).filter(id => !names[id]);
    if (missing.length === 0) return;
    const { data } = await supabase.from("profiles").select("id, display_name").in("id", missing);
    if (data) {
      setNames(prev => {
        const next = { ...prev };
        for (const p of data as { id: string; display_name: string }[]) next[p.id] = p.display_name;
        return next;
      });
    }
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || !userId || sending) return;
    setSending(true);
    const { error } = await supabase.from("chat_messages").insert({ user_id: userId, content });
    setSending(false);
    if (!error) setText("");
  }

  async function remove(id: string) {
    if (!confirm("Radera meddelandet?")) return;
    await supabase.from("chat_messages").delete().eq("id", id);
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
  }

  function formatDay(iso: string) {
    const d = new Date(iso);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    if (isToday) return "Idag";
    return d.toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "short" });
  }

  let lastDay = "";

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-12">
            Inga meddelanden än. Skriv något!
          </div>
        )}
        {messages.map(m => {
          const day = formatDay(m.created_at);
          const showDay = day !== lastDay;
          lastDay = day;
          const mine = m.user_id === userId;
          const canDelete = mine || isAdmin;
          return (
            <div key={m.id}>
              {showDay && (
                <div className="text-center text-[11px] text-muted-foreground uppercase tracking-wide my-3">
                  {day}
                </div>
              )}
              <div className={`flex ${mine ? "justify-end" : "justify-start"} group`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${mine ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>
                  <div className={`text-[11px] font-semibold mb-0.5 ${mine ? "text-primary-foreground/90" : "text-primary"}`}>
                    {mine ? "Du" : (names[m.user_id] ?? "…")}
                  </div>
                  <div className="text-sm whitespace-pre-wrap break-words">{m.content}</div>
                  <div className={`text-[10px] mt-1 flex items-center gap-2 ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {formatTime(m.created_at)}
                    {canDelete && (
                      <button
                        onClick={() => remove(m.id)}
                        className="opacity-0 group-hover:opacity-100 transition hover:text-destructive"
                        aria-label="Radera"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={send} className="border-t border-border bg-background px-3 py-2 flex gap-2 items-end">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e as unknown as React.FormEvent); }
          }}
          placeholder="Skriv ett meddelande..."
          rows={1}
          maxLength={2000}
          className="flex-1 resize-none rounded-xl border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary max-h-32"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="rounded-xl bg-primary text-primary-foreground p-2.5 disabled:opacity-50"
          aria-label="Skicka"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}
