import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Arena, MAPS, useArenaObstacles } from "@/game/Arena";
import { Player } from "@/game/Player";
import { RemotePlayer, RemotePlayerData } from "@/game/RemotePlayer";
import { Tracers, TracerData } from "@/game/Tracers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Crosshair, Heart, Skull, Trophy, X } from "lucide-react";
import { toast } from "sonner";

const PLAYER_RADIUS = 0.5;
const PLAYER_HEAD = 1.7;
const MAX_RANGE = 60;
const DAMAGE = 25;

export default function Game() {
  const { user, username, loading } = useAuth();
  const { mapId = "arena-1" } = useParams();
  const navigate = useNavigate();
  const obstacles = useArenaObstacles(mapId);
  const map = MAPS[mapId] ?? MAPS["arena-1"];

  const [remotes, setRemotes] = useState<Record<string, RemotePlayerData>>({});
  const [tracers, setTracers] = useState<TracerData[]>([]);
  const [hp, setHp] = useState(100);
  const [kills, setKills] = useState(0);
  const [deaths, setDeaths] = useState(0);
  const [pointerLocked, setPointerLocked] = useState(false);
  const [feed, setFeed] = useState<string[]>([]);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const meRef = useRef({ pos: [0, 1.7, 5] as [number, number, number], rotY: 0, hp: 100 });
  const remotesRef = useRef<Record<string, RemotePlayerData>>({});

  useEffect(() => { remotesRef.current = remotes; }, [remotes]);
  useEffect(() => { meRef.current.hp = hp; }, [hp]);

  const addFeed = useCallback((msg: string) => {
    setFeed((f) => [msg, ...f].slice(0, 5));
  }, []);

  useEffect(() => {
    if (!user || !username) return;

    const ch = supabase.channel(`game:${mapId}`, {
      config: { presence: { key: user.id }, broadcast: { self: false } },
    });
    channelRef.current = ch;

    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState<{ username: string; pos: [number,number,number]; rotY: number; hp: number }>();
      const next: Record<string, RemotePlayerData> = {};
      for (const [id, metas] of Object.entries(state)) {
        if (id === user.id) continue;
        const m = metas[0];
        if (!m) continue;
        next[id] = { id, username: m.username, pos: m.pos, rotY: m.rotY, hp: m.hp };
      }
      setRemotes(next);
    });

    ch.on("broadcast", { event: "shot" }, ({ payload }) => {
      const t: TracerData = {
        id: Math.random().toString(36),
        origin: payload.origin,
        end: payload.end,
        startTime: performance.now(),
      };
      setTracers((arr) => [...arr, t]);
    });

    ch.on("broadcast", { event: "hit" }, ({ payload }) => {
      if (payload.targetId !== user.id) return;
      const newHp = Math.max(0, meRef.current.hp - payload.damage);
      setHp(newHp);
      meRef.current.hp = newHp;
      if (newHp === 0) {
        setDeaths((d) => d + 1);
        addFeed(`💀 ${payload.shooterName} eliminated YOU`);
        setTimeout(() => {
          setHp(100);
          meRef.current.hp = 100;
          toast.success("Respawned!");
        }, 1500);
        supabase.from("profiles").update({ deaths: deaths + 1 }).eq("id", user.id).then(() => {});
      } else {
        toast.error(`-${payload.damage} HP from ${payload.shooterName}`, { duration: 1000 });
      }
    });

    ch.on("broadcast", { event: "kill" }, ({ payload }) => {
      addFeed(`☠️ ${payload.shooter} → ${payload.victim}`);
    });

    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await ch.track({
          username,
          pos: meRef.current.pos,
          rotY: meRef.current.rotY,
          hp: meRef.current.hp,
        });
      }
    });

    return () => {
      supabase.removeChannel(ch);
      channelRef.current = null;
    };
  }, [user, username, mapId]);

  useEffect(() => {
    const onChange = () => setPointerLocked(!!document.pointerLockElement);
    document.addEventListener("pointerlockchange", onChange);
    return () => document.removeEventListener("pointerlockchange", onChange);
  }, []);

  const onPositionChange = useCallback((pos: [number, number, number], rotY: number) => {
    meRef.current.pos = pos;
    meRef.current.rotY = rotY;
    channelRef.current?.track({
      username,
      pos, rotY,
      hp: meRef.current.hp,
    });
  }, [username]);

  const onShoot = useCallback((origin: [number, number, number], dir: [number, number, number]) => {
    const o = new THREE.Vector3(...origin);
    const d = new THREE.Vector3(...dir).normalize();
    const ray = new THREE.Ray(o, d);

    let hitPoint = o.clone().add(d.clone().multiplyScalar(MAX_RANGE));
    let hitDist = MAX_RANGE;
    let hitPlayerId: string | null = null;

    for (const b of obstacles) {
      const pt = new THREE.Vector3();
      if (ray.intersectBox(b, pt)) {
        const dist = o.distanceTo(pt);
        if (dist < hitDist) { hitDist = dist; hitPoint = pt; }
      }
    }

    for (const [id, p] of Object.entries(remotesRef.current)) {
      const center = new THREE.Vector3(p.pos[0], p.pos[1] - 0.5, p.pos[2]);
      const sphere = new THREE.Sphere(center, PLAYER_RADIUS + 0.3);
      const pt = new THREE.Vector3();
      if (ray.intersectSphere(sphere, pt)) {
        const dist = o.distanceTo(pt);
        if (dist < hitDist) {
          hitDist = dist;
          hitPoint = pt;
          hitPlayerId = id;
        }
      }
    }

    const end: [number, number, number] = [hitPoint.x, hitPoint.y, hitPoint.z];

    setTracers((arr) => [...arr, {
      id: Math.random().toString(36),
      origin, end, startTime: performance.now(),
    }]);

    channelRef.current?.send({ type: "broadcast", event: "shot", payload: { origin, end } });

    if (hitPlayerId && user && username) {
      const target = remotesRef.current[hitPlayerId];
      channelRef.current?.send({
        type: "broadcast", event: "hit",
        payload: { targetId: hitPlayerId, damage: DAMAGE, shooterName: username, shooterId: user.id },
      });
      if (target.hp - DAMAGE <= 0) {
        setKills((k) => k + 1);
        addFeed(`☠️ YOU → ${target.username}`);
        channelRef.current?.send({
          type: "broadcast", event: "kill",
          payload: { shooter: username, victim: target.username },
        });
        supabase.from("profiles").update({ kills: kills + 1 }).eq("id", user.id).then(() => {});
      }
    }
  }, [obstacles, user, username, kills, addFeed]);

  const expireTracer = useCallback((id: string) => {
    setTracers((arr) => arr.filter((t) => t.id !== id));
  }, []);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <main className="fixed inset-0 bg-black overflow-hidden">
      <Canvas shadows camera={{ fov: 80, near: 0.1, far: 200 }}>
        <color attach="background" args={[map.floorColor]} />
        <fog attach="fog" args={[map.floorColor, 20, 80]} />
        <ambientLight intensity={0.3} />
        <directionalLight position={[10, 20, 10]} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} />
        <pointLight position={[0, 8, 0]} intensity={1} color={map.accentColor} />
        <Arena mapId={mapId} />
        <Player onPositionChange={onPositionChange} onShoot={onShoot} obstacles={obstacles} arenaSize={map.size} />
        {Object.values(remotes).map((r) => <RemotePlayer key={r.id} data={r} />)}
        <Tracers tracers={tracers} onExpire={expireTracer} />
      </Canvas>

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-1 h-1 bg-primary rounded-full shadow-[0_0_6px_hsl(var(--primary))]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 border border-primary/60 rounded-full" />
        </div>

        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-6 px-6 py-2 bg-card/80 backdrop-blur rounded-lg border border-primary/30">
          <div className="flex items-center gap-2 text-primary"><Skull className="w-4 h-4" /><span className="font-bold">{kills}</span><span className="text-xs text-muted-foreground uppercase">Kills</span></div>
          <div className="flex items-center gap-2 text-destructive"><X className="w-4 h-4" /><span className="font-bold">{deaths}</span><span className="text-xs text-muted-foreground uppercase">Deaths</span></div>
          <div className="flex items-center gap-2 text-accent"><Trophy className="w-4 h-4" /><span className="font-bold">{Object.keys(remotes).length + 1}</span><span className="text-xs text-muted-foreground uppercase">Online</span></div>
        </div>

        <div className="absolute bottom-6 left-6 w-64">
          <div className="flex items-center gap-2 mb-1">
            <Heart className="w-4 h-4 text-destructive" />
            <span className="text-sm font-bold uppercase tracking-wider">{hp} HP</span>
          </div>
          <div className="h-3 bg-card border border-border rounded overflow-hidden">
            <div
              className="h-full transition-all"
              style={{
                width: `${hp}%`,
                background: hp > 50 ? "hsl(var(--primary))" : hp > 20 ? "hsl(var(--accent))" : "hsl(var(--destructive))",
                boxShadow: `0 0 10px hsl(var(--${hp > 50 ? "primary" : hp > 20 ? "accent" : "destructive"}))`,
              }}
            />
          </div>
        </div>

        <div className="absolute top-20 right-6 space-y-1 text-right">
          {feed.map((m, i) => (
            <div key={i} className="text-sm bg-card/70 backdrop-blur px-3 py-1 rounded border border-border" style={{ opacity: 1 - i * 0.18 }}>
              {m}
            </div>
          ))}
        </div>

        <Button variant="ghost" size="sm" className="pointer-events-auto absolute top-4 right-4" onClick={() => navigate("/")}>
          <X className="mr-1 w-4 h-4" /> Leave
        </Button>
      </div>

      {!pointerLocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur z-10">
          <Card className="p-8 max-w-md text-center border-primary/40 animate-pulse-glow">
            <Crosshair className="w-12 h-12 text-primary mx-auto mb-4 text-glow" />
            <h2 className="text-2xl font-black tracking-widest mb-2">{map === MAPS["arena-1"] ? "NEON GRID" : "CRIMSON BUNKER"}</h2>
            <p className="text-sm text-muted-foreground mb-4">
              <strong className="text-foreground">WASD</strong> move · <strong className="text-foreground">SPACE</strong> jump · <strong className="text-foreground">MOUSE</strong> look · <strong className="text-foreground">CLICK</strong> shoot
            </p>
            <Button size="lg" className="w-full font-bold tracking-widest uppercase" onClick={() => {
              const canvas = document.querySelector("canvas");
              canvas?.requestPointerLock();
            }}>
              Click to Engage
            </Button>
            <p className="text-xs text-muted-foreground mt-3">Press ESC to release mouse</p>
          </Card>
        </div>
      )}
    </main>
  );
}
