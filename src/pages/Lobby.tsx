import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate, Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Crosshair, LogOut, Trophy, Zap, Users, Skull, Copy, Link2, Search, Lock, Loader2, X } from "lucide-react";
import { AGENT_LIST } from "@/game/agents";
import { toast } from "sonner";

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

// How many players trigger instant match; after 30s any 2+ players start
const MODE_PLAYER_COUNT: Record<string, number> = { ffa: 4, "1v1": 2, "3v3": 6, "5v5": 10 };

// Room code encoding: first char = map, second char = mode, remaining = random
// e.g. "HV3X4A" → haven, 5v5, roomId "3X4A"
const MAP_CHAR: Record<string, string>  = { haven: "H", "arena-1": "A", "arena-2": "B", "arena-3": "C" };
const MODE_CHAR: Record<string, string> = { ffa: "F", "1v1": "D", "3v3": "T", "5v5": "V" };
const CHAR_MAP: Record<string, string>  = { H: "haven", A: "arena-1", B: "arena-2", C: "arena-3" };
const CHAR_MODE: Record<string, string> = { F: "ffa", D: "1v1", T: "3v3", V: "5v5" };

type PlayTab = "quick" | "private" | "find";

export default function Lobby() {
  const { user, username, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [room, setRoom] = useState("haven");
  const [mode, setMode] = useState("5v5");
  const [agentId, setAgentId] = useState("phantom");
  const [leaderboard, setLeaderboard] = useState<Profile[]>([]);
  const [me, setMe] = useState<Profile | null>(null);

  // Per-tab random ID so two tabs/browsers with the same account still count as separate players
  const [clientId] = useState(() => Math.random().toString(36).slice(2, 10));

  // Tab
  const joinParam = searchParams.get("join")?.toUpperCase() ?? "";
  const [tab, setTab] = useState<PlayTab>(joinParam.length >= 6 ? "private" : "quick");

  // Private match
  const [privateCode, setPrivateCode] = useState("");
  const [joinInput, setJoinInput] = useState(joinParam);

  // Find match
  const [queueing, setQueueing] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const [queueElapsed, setQueueElapsed] = useState(0);
  const queueChRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const queueTimerRef = useRef<number | null>(null);
  const queueStartRef = useRef<number>(0);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").order("kills", { ascending: false }).limit(10)
      .then(({ data }) => setLeaderboard(data ?? []));
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
      .then(({ data }) => setMe(data));
  }, [user]);

  // Auto-join when arriving from an invite link with a join code
  useEffect(() => {
    if (joinParam.length < 6 || !user) return;
    const clean = joinParam.trim().toUpperCase();
    const mapId  = CHAR_MAP[clean[0]]  ?? "haven";
    const modeId = CHAR_MODE[clean[1]] ?? "ffa";
    const roomId = clean.slice(2);
    navigate(`/play/${mapId}?mode=${modeId}&agent=${agentId}&room=${roomId}`);
  }, [joinParam, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup queue on unmount
  useEffect(() => {
    return () => { leaveQueue(); };
  }, []);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const agent = AGENT_LIST.find(a => a.id === agentId)!;

  // ── Private match helpers ──────────────────────────────────────────
  const generateCode = () => {
    const mapChar  = MAP_CHAR[room]  ?? "H";
    const modeChar = MODE_CHAR[mode] ?? "F";
    const random   = Math.random().toString(36).slice(2, 6).toUpperCase();
    setPrivateCode(`${mapChar}${modeChar}${random}`);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(privateCode);
    toast.success("Room code copied!");
  };

  const copyLink = () => {
    const mapId  = CHAR_MAP[privateCode[0]]  ?? room;
    const modeId = CHAR_MODE[privateCode[1]] ?? mode;
    const roomId = privateCode.slice(2);
    const gameUrl = `/play/${mapId}?mode=${modeId}&agent=${agentId}&room=${roomId}`;
    const url = `${window.location.origin}/auth?next=${encodeURIComponent(gameUrl)}`;
    navigator.clipboard.writeText(url);
    toast.success("Invite link copied! Friend clicks it, picks a name, joins your room.");
  };

  // Works for both host (passes privateCode) and joiner (passes their typed input).
  // The first two chars encode map+mode so both sides always land on the same channel.
  const launchPrivate = (code: string) => {
    const clean = code.trim().toUpperCase();
    if (clean.length < 6) { toast.error("Enter the full 6-character room code"); return; }
    const mapId  = CHAR_MAP[clean[0]]  ?? room;
    const modeId = CHAR_MODE[clean[1]] ?? mode;
    const roomId = clean.slice(2);
    navigate(`/play/${mapId}?mode=${modeId}&agent=${agentId}&room=${roomId}`);
  };

  // ── Matchmaking helpers ────────────────────────────────────────────
  const startQueue = () => {
    if (!user || !username) return;

    // Local guard — prevents double-broadcast when presence syncs fire rapidly
    let matchSent = false;

    const ch = supabase.channel(`matchmaking:${mode}`, {
      config: { presence: { key: clientId }, broadcast: { self: true } },
    });
    queueChRef.current = ch;
    queueStartRef.current = Date.now();
    setQueueing(true);
    setQueueElapsed(0);

    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState<{ username: string; map: string; agent: string }>();
      const ids = Object.keys(state);
      const count = ids.length;
      setQueueCount(count);

      const elapsed = Date.now() - queueStartRef.current;
      const needed = elapsed > 30_000 ? 2 : (MODE_PLAYER_COUNT[mode] ?? 2);

      if (count >= needed && !matchSent) {
        const sortedIds = ids.slice().sort();
        if (sortedIds[0] === clientId) {
          matchSent = true;
          const roomCode = Math.random().toString(36).slice(2, 7).toUpperCase();
          // Send first, then wait for delivery before unsubscribing
          ch.send({
            type: "broadcast",
            event: "match_found",
            payload: { roomCode, map: room, mode },
          }).then(() => {
            leaveQueue();
            navigate(`/play/${room}?mode=${mode}&agent=${agentId}&room=${roomCode}`);
          });
        }
      }
    });

    ch.on("broadcast", { event: "match_found" }, ({ payload }) => {
      if (matchSent) return; // leader already handled it
      leaveQueue();
      toast.success("Match found! Deploying…");
      navigate(`/play/${payload.map}?mode=${payload.mode}&agent=${agentId}&room=${payload.roomCode}`);
    });

    ch.subscribe(() => {
      ch.track({ username, map: room, agent: agentId });
    });

    // Elapsed counter + re-check after 30s (presence sync won't auto-fire again)
    queueTimerRef.current = window.setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - queueStartRef.current) / 1000);
      setQueueElapsed(elapsedSec);

      if (elapsedSec >= 30 && !matchSent && queueChRef.current) {
        const state = queueChRef.current.presenceState();
        const ids = Object.keys(state);
        if (ids.length >= 2) {
          const sortedIds = ids.slice().sort();
          if (sortedIds[0] === clientId && !matchSent) {
            matchSent = true;
            const roomCode = Math.random().toString(36).slice(2, 7).toUpperCase();
            queueChRef.current.send({
              type: "broadcast",
              event: "match_found",
              payload: { roomCode, map: room, mode },
            }).then(() => {
              leaveQueue();
              navigate(`/play/${room}?mode=${mode}&agent=${agentId}&room=${roomCode}`);
            });
          }
        }
      }
    }, 1000);

    // 60s hard timeout
    window.setTimeout(() => {
      if (queueChRef.current) {
        toast.error("No match found. Try again.");
        leaveQueue();
      }
    }, 60_000);
  };

  const leaveQueue = () => {
    queueChRef.current?.unsubscribe();
    queueChRef.current = null;
    setQueueing(false);
    setQueueCount(0);
    setQueueElapsed(0);
    if (queueTimerRef.current) {
      clearInterval(queueTimerRef.current);
      queueTimerRef.current = null;
    }
  };

  const needed = MODE_PLAYER_COUNT[mode] ?? 2;

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
                  onClick={() => { setMode(m.id); if (queueing) leaveQueue(); }}
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

          {/* Map — hidden when Finding Match (leader picks) */}
          {tab !== "find" && (
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
          )}

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

          {/* ── Play Mode Tabs ── */}
          <Card className="p-5 bg-card/60 backdrop-blur border-primary/20">
            {/* Tab selector */}
            <div className="flex gap-1 mb-5 bg-secondary/40 p-1 rounded-lg">
              {([
                { id: "quick", label: "Quick Play", icon: <Crosshair className="w-4 h-4" /> },
                { id: "private", label: "Private Match", icon: <Lock className="w-4 h-4" /> },
                { id: "find", label: "Find Match", icon: <Search className="w-4 h-4" /> },
              ] as { id: PlayTab; label: string; icon: ReactNode }[]).map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setTab(t.id); if (queueing) leaveQueue(); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-semibold transition-all ${
                    tab === t.id
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.icon}
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              ))}
            </div>

            {/* ── Quick Play ── */}
            {tab === "quick" && (
              <Button
                size="lg"
                className="w-full font-bold tracking-widest uppercase text-lg h-14"
                onClick={() => navigate(`/play/${room}?mode=${mode}&agent=${agentId}`)}
              >
                <Crosshair className="mr-2" /> Deploy as {agent.name}
              </Button>
            )}

            {/* ── Private Match ── */}
            {tab === "private" && (
              <div className="grid sm:grid-cols-2 gap-6">
                {/* Create a room */}
                <div className="space-y-3">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-primary flex items-center gap-2">
                    <Lock className="w-4 h-4" /> Create Room
                  </h3>
                  {!privateCode ? (
                    <Button className="w-full" onClick={generateCode}>
                      Generate Room Code
                    </Button>
                  ) : (
                    <>
                      <div className="bg-secondary/60 rounded-lg p-4 text-center">
                        <div className="text-3xl font-black tracking-[0.3em] text-primary text-glow mb-1">{privateCode}</div>
                        <div className="text-xs text-muted-foreground">Share this code with your friends</div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={copyCode}>
                          <Copy className="w-3 h-3 mr-1" /> Code
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1" onClick={copyLink}>
                          <Link2 className="w-3 h-3 mr-1" /> Link
                        </Button>
                        <Button variant="ghost" size="sm" onClick={generateCode} title="New code">
                          ↺
                        </Button>
                      </div>
                      <Button
                        size="lg"
                        className="w-full font-bold uppercase tracking-wider"
                        onClick={() => launchPrivate(privateCode)}
                      >
                        <Crosshair className="mr-2 w-4 h-4" /> Deploy as {agent.name}
                      </Button>
                    </>
                  )}
                </div>

                {/* Join a room */}
                <div className="space-y-3">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-accent flex items-center gap-2">
                    <Users className="w-4 h-4" /> Join Friend's Room
                  </h3>
                  <div className="space-y-2">
                    <Input
                      placeholder="Enter room code (e.g. HV3X4A)"
                      value={joinInput}
                      onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
                      className="font-mono tracking-widest text-center uppercase"
                      maxLength={6}
                      onKeyDown={(e) => { if (e.key === "Enter") launchPrivate(joinInput); }}
                    />
                    <Button
                      className="w-full"
                      variant="secondary"
                      onClick={() => launchPrivate(joinInput)}
                      disabled={joinInput.trim().length < 6}
                    >
                      Join Room
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ask your friend for their 6-character room code. The code includes the map &amp; mode — no need to match settings manually.
                  </p>
                </div>
              </div>
            )}

            {/* ── Find Match ── */}
            {tab === "find" && (
              <div className="space-y-4">
                {!queueing ? (
                  <>
                    <div className="text-center space-y-1 py-2">
                      <div className="text-sm text-muted-foreground">
                        Searching for <span className="text-primary font-bold">{MODES.find(m => m.id === mode)?.name}</span> players
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Needs {needed} players · Match starts early after 30s with 2+
                      </div>
                    </div>
                    <Button
                      size="lg"
                      className="w-full font-bold tracking-widest uppercase text-lg h-14"
                      onClick={startQueue}
                    >
                      <Search className="mr-2" /> Find Match
                    </Button>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-secondary/40 rounded-lg p-6 text-center space-y-3">
                      <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin" />
                      <div>
                        <div className="font-bold text-lg">Searching for players…</div>
                        <div className="text-sm text-muted-foreground">{MODES.find(m => m.id === mode)?.name}</div>
                      </div>
                      {/* Queue bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{queueCount} / {needed} players</span>
                          <span>{queueElapsed}s</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-500"
                            style={{ width: `${Math.min(100, (queueCount / needed) * 100)}%` }}
                          />
                        </div>
                        {queueElapsed > 30 && queueCount >= 2 && (
                          <div className="text-xs text-accent">Starting with {queueCount} players soon…</div>
                        )}
                      </div>
                      {/* Player dots */}
                      <div className="flex justify-center gap-2 flex-wrap">
                        {Array.from({ length: needed }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-3 h-3 rounded-full border-2 transition-all ${
                              i < queueCount
                                ? "bg-primary border-primary shadow-[0_0_8px_hsl(var(--primary))]"
                                : "bg-transparent border-muted"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={leaveQueue}
                    >
                      <X className="w-4 h-4 mr-2" /> Cancel Search
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>

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
