import { useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Crosshair, LogOut, Trophy, Zap, Users, Skull } from "lucide-react";

interface Profile { id: string; username: string; kills: number; deaths: number; matches_played: number; }

export default function Lobby() {
  const { user, username, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [room, setRoom] = useState("arena-1");
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

  const maps = [
    { id: "arena-1", name: "Neon Grid", desc: "Open arena, neon walls", color: "primary" },
    { id: "arena-2", name: "Crimson Bunker", desc: "Tight cover, fast kills", color: "accent" },
    { id: "arena-3", name: "Violet Citadel", desc: "Large map, sniper-friendly", color: "primary" },
  ];

  return (
    <main className="min-h-screen bg-grid p-6">
      <header className="max-w-6xl mx-auto flex justify-between items-center mb-8">
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
          <Card className="p-6 bg-card/60 backdrop-blur border-primary/20">
            <h2 className="text-xl font-bold mb-1 flex items-center gap-2"><Zap className="text-primary" /> Select Arena</h2>
            <p className="text-sm text-muted-foreground mb-4">Choose your battlefield. Other operatives in the same room will appear in real-time.</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {maps.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setRoom(m.id)}
                  className={`text-left p-4 rounded-lg border-2 transition-all ${
                    room === m.id
                      ? "border-primary bg-primary/10 shadow-[0_0_20px_hsl(var(--primary)/0.4)]"
                      : "border-border hover:border-primary/50 bg-secondary/40"
                  }`}
                >
                  <div className="font-bold text-lg">{m.name}</div>
                  <div className="text-sm text-muted-foreground">{m.desc}</div>
                </button>
              ))}
            </div>
            <Button
              size="lg"
              className="w-full mt-6 font-bold tracking-widest uppercase text-lg h-14"
              onClick={() => navigate(`/play/${room}`)}
            >
              <Crosshair className="mr-2" /> Deploy to {maps.find(m => m.id === room)?.name}
            </Button>
          </Card>

          {me && (
            <Card className="p-6 bg-card/60 backdrop-blur border-accent/20">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Trophy className="text-accent" /> Your Stats</h2>
              <div className="grid grid-cols-3 gap-4 text-center">
                <Stat label="Kills" value={me.kills} accent="primary" />
                <Stat label="Deaths" value={me.deaths} accent="destructive" />
                <Stat label="Matches" value={me.matches_played} accent="accent" />
              </div>
            </Card>
          )}
        </section>

        <aside>
          <Card className="p-6 bg-card/60 backdrop-blur border-accent/20">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Users className="text-accent" /> Top Operatives</h2>
            <ol className="space-y-2">
              {leaderboard.length === 0 && <li className="text-sm text-muted-foreground">No kills logged yet. Be the first.</li>}
              {leaderboard.map((p, i) => (
                <li key={p.id} className="flex items-center justify-between p-2 rounded bg-secondary/40">
                  <span className="flex items-center gap-2">
                    <span className={`w-6 text-center font-bold ${i === 0 ? "text-accent text-glow-accent" : "text-muted-foreground"}`}>#{i+1}</span>
                    <span className="font-semibold">{p.username}</span>
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
