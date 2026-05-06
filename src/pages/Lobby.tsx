import { useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Crosshair, LogOut, Trophy, Zap, Users, Skull } from "lucide-react";
import { AGENT_LIST } from "@/game/agents";

interface Profile { id: string; username: string; kills: number; deaths: number; matches_played: number; }

const MAPS = [
  { id: "haven", name: "Bind", desc: "Tactical 2-site map (recommended)", color: "primary", featured: true },
  { id: "arena-1", name: "Neon Grid", desc: "Open arena, neon walls", color: "primary" },
  { id: "arena-2", name: "Crimson Bunker", desc: "Tight cover, fast kills", color: "accent" },
  { id: "arena-3", name: "Violet Citadel", desc: "Large map, sniper-friendly", color: "primary" },
];

const MODES = [
  { id: "ffa", name: "Free-For-All", desc: "Everyone for themselves" },
  { id: "1v1", name: "1v1 Duel", desc: "Aim duel" },
  { id: "3v3", name: "3v3 Squad", desc: "Quick tactical" },
  { id: "5v5", name: "5v5 Tactical", desc: "Full Valorant-style" },
];

export default function Lobby() {
  const { user, username, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [room, setRoom] = useState("haven");
  const [mode, setMode] = useState("5v5");
  const [agentId, setAgentId] = useState("phantom");
  const [leaderboard, setLeaderboard] = useState<Profile[]>([]);
  const [me, setMe] = useState<Profile | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").order("kills", { ascending: false }).limit(10)
      .then(({ data }) => setLeaderboard(data ?? []));
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
      .then(({ data }) => setMe(data));
  }, [user]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const agent = AGENT_LIST.find(a => a.id === agentId)!;

  return (
    <main className="min-h-screen bg-grid p-6">
      <header className="max-w-6xl mx-auto flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Crosshair className="w-8 h-8 text-primary text-glow" />
          <h1 className="text-2xl font-black tracking-widest text-glow">NEON ARENA</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground uppercase tracking-wider">
            <span className="text-primary font-bold">{username ?? "Loading..."}</span>
          </span>
          <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="w-4 h-4" /></Button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 space-y-6">
          {/* Mode */}
          <Card className="p-5 bg-card/60 backdrop-blur border-primary/20">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2"><Zap className="text-primary w-5 h-5" /> Game Mode</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`text-left p-3 rounded-lg border-2 transition-all ${
                    mode === m.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 bg-secondary/40"
                  }`}
                >
                  <div className="font-bold text-sm">{m.name}</div>
                  <div className="text-xs text-muted-foreground">{m.desc}</div>
                </button>
              ))}
            </div>
          </Card>

          {/* Map */}
          <Card className="p-5 bg-card/60 backdrop-blur border-primary/20">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2"><Crosshair className="text-primary w-5 h-5" /> Map</h2>
            <div className="grid grid-cols-2 gap-3">
              {MAPS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setRoom(m.id)}
                  className={`relative text-left p-3 rounded-lg border-2 transition-all ${
                    room === m.id ? "border-primary bg-primary/10 shadow-[0_0_20px_hsl(var(--primary)/0.4)]" : "border-border hover:border-primary/50 bg-secondary/40"
                  }`}
                >
                  {m.featured && <span className="absolute top-1 right-1 text-[10px] bg-accent text-accent-foreground px-1.5 py-0.5 rounded font-bold">TACTICAL</span>}
                  <div className="font-bold">{m.name}</div>
                  <div className="text-xs text-muted-foreground">{m.desc}</div>
                </button>
              ))}
            </div>
          </Card>

          {/* Agent */}
          <Card className="p-5 bg-card/60 backdrop-blur border-accent/20">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2"><Users className="text-accent w-5 h-5" /> Select Agent</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              {AGENT_LIST.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setAgentId(a.id)}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    agentId === a.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 bg-secondary/40"
                  }`}
                  style={agentId === a.id ? { boxShadow: `0 0 20px ${a.color}50`, borderColor: a.color } : {}}
                >
                  <div className="w-10 h-10 mx-auto rounded-full mb-1" style={{ background: a.color, boxShadow: `0 0 14px ${a.color}` }} />
                  <div className="font-bold text-sm">{a.name}</div>
                  <div className="text-[10px] text-muted-foreground uppercase">{a.role}</div>
                </button>
              ))}
            </div>
            <div className="text-xs bg-secondary/40 rounded p-3 space-y-1">
              <div className="text-muted-foreground">{agent.desc}</div>
              <div><strong className="text-foreground">Q · {agent.q.name}</strong> <span className="text-muted-foreground">— {agent.q.desc}</span></div>
              <div><strong className="text-foreground">E · {agent.e.name}</strong> <span className="text-muted-foreground">— {agent.e.desc}</span></div>
            </div>
          </Card>

          <Button
            size="lg"
            className="w-full font-bold tracking-widest uppercase text-lg h-14"
            onClick={() => navigate(`/play/${room}?mode=${mode}&agent=${agentId}`)}
          >
            <Crosshair className="mr-2" /> Deploy as {agent.name}
          </Button>

          {me && (
            <Card className="p-5 bg-card/60 backdrop-blur border-accent/20">
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2"><Trophy className="text-accent w-5 h-5" /> Your Stats</h2>
              <div className="grid grid-cols-3 gap-3 text-center">
                <Stat label="Kills" value={me.kills} accent="primary" />
                <Stat label="Deaths" value={me.deaths} accent="destructive" />
                <Stat label="Matches" value={me.matches_played} accent="accent" />
              </div>
            </Card>
          )}
        </section>

        <aside>
          <Card className="p-5 bg-card/60 backdrop-blur border-accent/20 sticky top-6">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2"><Users className="text-accent w-5 h-5" /> Top Operatives</h2>
            <ol className="space-y-2">
              {leaderboard.length === 0 && <li className="text-sm text-muted-foreground">No kills logged yet.</li>}
              {leaderboard.map((p, i) => (
                <li key={p.id} className="flex items-center justify-between p-2 rounded bg-secondary/40">
                  <span className="flex items-center gap-2">
                    <span className={`w-6 text-center font-bold ${i === 0 ? "text-accent text-glow-accent" : "text-muted-foreground"}`}>#{i+1}</span>
                    <span className="font-semibold text-sm">{p.username}</span>
                  </span>
                  <span className="text-sm flex items-center gap-1 text-primary">
                    <Skull className="w-3 h-3" /> {p.kills}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        </aside>
      </div>
    </main>
  );
}

const Stat = ({ label, value, accent }: { label: string; value: number; accent: string }) => (
  <div className="p-3 rounded-lg bg-secondary/50">
    <div className={`text-3xl font-black text-${accent}`}>{value}</div>
    <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">{label}</div>
  </div>
);
