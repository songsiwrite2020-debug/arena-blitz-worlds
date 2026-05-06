import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Arena, MAPS, useArenaObstacles } from "@/game/Arena";
import { Player } from "@/game/Player";
import { RemotePlayer, RemotePlayerData } from "@/game/RemotePlayer";
import { Tracers, TracerData } from "@/game/Tracers";
import { Viewmodel } from "@/game/Viewmodel";
import { WEAPONS, WEAPON_ORDER, WeaponId } from "@/game/weapons";
import { sfx } from "@/game/sfx";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Crosshair, Heart, Skull, Trophy, X, Timer, Target } from "lucide-react";
import { toast } from "sonner";

const PLAYER_RADIUS = 0.5;
const MATCH_LENGTH_MS = 5 * 60 * 1000;

const MAP_NAMES: Record<string, string> = {
  "arena-1": "NEON GRID",
  "arena-2": "CRIMSON BUNKER",
  "arena-3": "VIOLET CITADEL",
};

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
  const [weaponId, setWeaponId] = useState<WeaponId>("pistol");
  const [ammo, setAmmo] = useState(WEAPONS.pistol.ammo);
  const [reloading, setReloading] = useState(false);
  const [zoomActive, setZoomActive] = useState(false);
  const [lastShotAt, setLastShotAt] = useState(0);
  const [matchStart] = useState(() => Date.now());
  const [now, setNow] = useState(Date.now());
  const [matchEnded, setMatchEnded] = useState(false);
  const [scoreboard, setScoreboard] = useState<Record<string, { username: string; kills: number }>>({});

  const weapon = WEAPONS[weaponId];
  const alive = hp > 0;

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const meRef = useRef({ pos: [0, 1.7, 5] as [number, number, number], rotY: 0, hp: 100 });
  const remotesRef = useRef<Record<string, RemotePlayerData>>({});
  const killsRef = useRef(0);
  const reloadTimer = useRef<number | null>(null);

  useEffect(() => { remotesRef.current = remotes; }, [remotes]);
  useEffect(() => { meRef.current.hp = hp; }, [hp]);
  useEffect(() => { killsRef.current = kills; }, [kills]);

  // Match timer
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  const remaining = Math.max(0, MATCH_LENGTH_MS - (now - matchStart));
  useEffect(() => {
    if (remaining === 0 && !matchEnded) {
      setMatchEnded(true);
      document.exitPointerLock?.();
      // bump matches_played
      if (user) {
        supabase.from("profiles").update({ matches_played: undefined as any })
          .eq("id", user.id).then(() => {});
        // Use rpc-less increment via direct read+update
        supabase.from("profiles").select("matches_played").eq("id", user.id).maybeSingle()
          .then(({ data }) => {
            if (data) supabase.from("profiles").update({ matches_played: (data.matches_played ?? 0) + 1 }).eq("id", user.id).then(()=>{});
          });
      }
    }
  }, [remaining, matchEnded, user]);

  const addFeed = useCallback((msg: string) => {
    setFeed((f) => [msg, ...f].slice(0, 5));
  }, []);

  // Weapon switch
  const switchTo = useCallback((idx: number) => {
    const id = WEAPON_ORDER[((idx % WEAPON_ORDER.length) + WEAPON_ORDER.length) % WEAPON_ORDER.length];
    setWeaponId((cur) => {
      if (cur === id) return cur;
      sfx.switchWeapon();
      setAmmo(WEAPONS[id].ammo);
      setReloading(false);
      if (reloadTimer.current) { clearTimeout(reloadTimer.current); reloadTimer.current = null; }
      return id;
    });
  }, []);

  const onScrollWeapon = useCallback((delta: number) => {
    const cur = WEAPON_ORDER.indexOf(weaponId);
    switchTo(cur + delta);
  }, [weaponId, switchTo]);

  const doReload = useCallback(() => {
    if (reloading || ammo === weapon.ammo) return;
    sfx.reload();
    setReloading(true);
    reloadTimer.current = window.setTimeout(() => {
      setAmmo(weapon.ammo);
      setReloading(false);
      reloadTimer.current = null;
    }, weapon.reloadMs);
  }, [reloading, ammo, weapon]);

  // Realtime
  useEffect(() => {
    if (!user || !username) return;

    const ch = supabase.channel(`game:${mapId}`, {
      config: { presence: { key: user.id }, broadcast: { self: false } },
    });
    channelRef.current = ch;

    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState<{ username: string; pos: [number,number,number]; rotY: number; hp: number; kills: number }>();
      const next: Record<string, RemotePlayerData> = {};
      const sb: Record<string, { username: string; kills: number }> = {};
      for (const [id, metas] of Object.entries(state)) {
        const m = metas[0];
        if (!m) continue;
        sb[id] = { username: m.username, kills: m.kills ?? 0 };
        if (id === user.id) continue;
        next[id] = { id, username: m.username, pos: m.pos, rotY: m.rotY, hp: m.hp };
      }
      setRemotes(next);
      setScoreboard(sb);
    });

    ch.on("broadcast", { event: "shot" }, ({ payload }) => {
      setTracers((arr) => [...arr, {
        id: Math.random().toString(36),
        origin: payload.origin,
        end: payload.end,
        startTime: performance.now(),
      }]);
      sfx.shot(payload.weapon || "pistol");
    });

    ch.on("broadcast", { event: "hit" }, ({ payload }) => {
      if (payload.targetId !== user.id) return;
      const newHp = Math.max(0, meRef.current.hp - payload.damage);
      setHp(newHp);
      meRef.current.hp = newHp;
      sfx.hurt();
      if (newHp === 0) {
        setDeaths((d) => {
          const nd = d + 1;
          supabase.from("profiles").update({ deaths: nd }).eq("id", user.id).then(() => {});
          return nd;
        });
        addFeed(`💀 ${payload.shooterName} eliminated YOU`);
        document.exitPointerLock?.();
        setTimeout(() => {
          if (!matchEnded) {
            setHp(100);
            meRef.current.hp = 100;
            setAmmo(WEAPONS[weaponId].ammo);
            toast.success("Respawned!");
          }
        }, 2000);
      } else {
        toast.error(`-${payload.damage} HP from ${payload.shooterName}`, { duration: 800 });
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
          kills: killsRef.current,
        });
      }
    });

    return () => {
      supabase.removeChannel(ch);
      channelRef.current = null;
    };
  }, [user, username, mapId, addFeed, matchEnded, weaponId]);

  useEffect(() => {
    const onChange = () => setPointerLocked(!!document.pointerLockElement);
    document.addEventListener("pointerlockchange", onChange);
    return () => document.removeEventListener("pointerlockchange", onChange);
  }, []);

  const onPositionChange = useCallback((pos: [number, number, number], rotY: number) => {
    meRef.current.pos = pos;
    meRef.current.rotY = rotY;
    channelRef.current?.track({
      username, pos, rotY, hp: meRef.current.hp, kills: killsRef.current,
    });
  }, [username]);

  const onShoot = useCallback((origin: [number, number, number], dir: [number, number, number]) => {
    if (!alive || reloading || ammo <= 0) {
      if (ammo <= 0) doReload();
      return;
    }

    setAmmo((a) => {
      const na = a - 1;
      if (na <= 0) doReload();
      return na;
    });
    setLastShotAt(performance.now());
    sfx.shot(weaponId);

    const o = new THREE.Vector3(...origin);
    const d = new THREE.Vector3(...dir).normalize();
    const ray = new THREE.Ray(o, d);

    let hitPoint = o.clone().add(d.clone().multiplyScalar(weapon.range));
    let hitDist = weapon.range;
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
    channelRef.current?.send({ type: "broadcast", event: "shot", payload: { origin, end, weapon: weaponId } });

    if (hitPlayerId && user && username) {
      const target = remotesRef.current[hitPlayerId];
      sfx.hit();
      channelRef.current?.send({
        type: "broadcast", event: "hit",
        payload: { targetId: hitPlayerId, damage: weapon.damage, shooterName: username, shooterId: user.id },
      });
      if (target.hp - weapon.damage <= 0) {
        setKills((k) => {
          const nk = k + 1;
          supabase.from("profiles").update({ kills: nk }).eq("id", user.id).then(() => {});
          return nk;
        });
        sfx.kill();
        addFeed(`☠️ YOU → ${target.username}`);
        channelRef.current?.send({
          type: "broadcast", event: "kill",
          payload: { shooter: username, victim: target.username },
        });
      }
    }
  }, [alive, reloading, ammo, weapon, weaponId, obstacles, user, username, addFeed, doReload]);

  const expireTracer = useCallback((id: string) => {
    setTracers((arr) => arr.filter((t) => t.id !== id));
  }, []);

  const sortedScoreboard = useMemo(() =>
    Object.entries(scoreboard)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.kills - a.kills)
      .slice(0, 8),
  [scoreboard]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  const timeStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return (
    <main className="fixed inset-0 bg-black overflow-hidden">
      <Canvas shadows camera={{ fov: 80, near: 0.1, far: 300 }}>
        <color attach="background" args={[map.floorColor]} />
        <fog attach="fog" args={[map.floorColor, 25, 100]} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[15, 25, 10]} intensity={1.4} castShadow shadow-mapSize={[2048, 2048]} />
        <pointLight position={[0, 8, 0]} intensity={1.2} color={map.accentColor} distance={40} />
        <pointLight position={[-15, 6, -15]} intensity={0.6} color={map.accentColor} distance={25} />
        <pointLight position={[15, 6, 15]} intensity={0.6} color={map.accentColor} distance={25} />
        <Arena mapId={mapId} />
        <Player
          onPositionChange={onPositionChange}
          onShoot={onShoot}
          obstacles={obstacles}
          arenaSize={map.size}
          weapon={weapon}
          ammo={ammo}
          reloading={reloading}
          onReload={doReload}
          onSwitchWeapon={switchTo}
          onScrollWeapon={onScrollWeapon}
          zoomActive={zoomActive}
          setZoomActive={setZoomActive}
          alive={alive && !matchEnded}
        />
        {Object.values(remotes).map((r) => <RemotePlayer key={r.id} data={r} />)}
        <Tracers tracers={tracers} onExpire={expireTracer} />
        {!zoomActive && <Viewmodel weapon={weapon} fireFlash={lastShotAt} />}
      </Canvas>

      <div className="pointer-events-none absolute inset-0">
        {/* Crosshair */}
        {!zoomActive && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-1 h-1 bg-primary rounded-full shadow-[0_0_6px_hsl(var(--primary))]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 border border-primary/60 rounded-full" />
          </div>
        )}
        {/* Sniper scope overlay */}
        {zoomActive && (
          <>
            <div className="absolute inset-0 bg-black/85" style={{
              maskImage: "radial-gradient(circle at center, transparent 38vh, black 38.5vh)",
              WebkitMaskImage: "radial-gradient(circle at center, transparent 38vh, black 38.5vh)",
            }} />
            <div className="absolute top-1/2 left-0 right-0 h-px bg-primary/40" />
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-primary/40" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full" />
          </>
        )}

        {/* Top HUD */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-6 px-6 py-2 bg-card/80 backdrop-blur rounded-lg border border-primary/30">
          <div className="flex items-center gap-2 text-primary"><Skull className="w-4 h-4" /><span className="font-bold">{kills}</span><span className="text-xs text-muted-foreground uppercase">K</span></div>
          <div className="flex items-center gap-2 text-destructive"><X className="w-4 h-4" /><span className="font-bold">{deaths}</span><span className="text-xs text-muted-foreground uppercase">D</span></div>
          <div className="flex items-center gap-2 text-accent"><Timer className="w-4 h-4" /><span className="font-bold tabular-nums">{timeStr}</span></div>
          <div className="flex items-center gap-2 text-foreground"><Trophy className="w-4 h-4" /><span className="font-bold">{Object.keys(remotes).length + 1}</span></div>
        </div>

        {/* HP */}
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

        {/* Weapon HUD */}
        <div className="absolute bottom-6 right-6 w-64 text-right">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">{weapon.name}</div>
          <div className="text-3xl font-black tabular-nums" style={{ color: weapon.color }}>
            {reloading ? "..." : ammo}<span className="text-base text-muted-foreground">/{weapon.ammo}</span>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            {WEAPON_ORDER.map((id, i) => (
              <button
                key={id}
                onClick={() => switchTo(i)}
                className={`pointer-events-auto px-2 py-1 text-xs rounded border ${
                  weaponId === id ? "border-primary bg-primary/20 text-primary" : "border-border bg-card/60 text-muted-foreground"
                }`}
              >
                {i + 1} {WEAPONS[id].name.split("-")[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Kill feed */}
        <div className="absolute top-20 right-6 space-y-1 text-right">
          {feed.map((m, i) => (
            <div key={i} className="text-sm bg-card/70 backdrop-blur px-3 py-1 rounded border border-border" style={{ opacity: 1 - i * 0.18 }}>
              {m}
            </div>
          ))}
        </div>

        {/* Live scoreboard (small) */}
        <div className="absolute top-20 left-6 bg-card/70 backdrop-blur px-3 py-2 rounded border border-border min-w-[180px]">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1"><Target className="w-3 h-3" /> Live</div>
          {sortedScoreboard.map((p, i) => (
            <div key={p.id} className={`flex justify-between text-xs ${p.id === user.id ? "text-primary font-bold" : ""}`}>
              <span>#{i+1} {p.username}</span>
              <span>{p.kills}</span>
            </div>
          ))}
        </div>

        <Button variant="ghost" size="sm" className="pointer-events-auto absolute top-4 right-4" onClick={() => navigate("/lobby")}>
          <X className="mr-1 w-4 h-4" /> Leave
        </Button>
      </div>

      {/* Death overlay */}
      {!alive && !matchEnded && (
        <div className="absolute inset-0 flex items-center justify-center bg-destructive/20 backdrop-blur-sm pointer-events-none">
          <div className="text-center">
            <div className="text-5xl font-black text-destructive text-glow tracking-widest">ELIMINATED</div>
            <div className="text-sm text-muted-foreground mt-2">Respawning...</div>
          </div>
        </div>
      )}

      {/* Match end */}
      {matchEnded && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur z-20">
          <Card className="p-8 max-w-lg w-full text-center border-primary/40">
            <Trophy className="w-14 h-14 text-accent mx-auto mb-3" />
            <h2 className="text-3xl font-black tracking-widest mb-1">MATCH OVER</h2>
            <p className="text-sm text-muted-foreground mb-6">{MAP_NAMES[mapId]}</p>
            <div className="space-y-1 mb-6">
              {sortedScoreboard.map((p, i) => (
                <div key={p.id} className={`flex justify-between p-2 rounded ${
                  i === 0 ? "bg-accent/20 text-accent" : "bg-secondary/40"
                } ${p.id === user.id ? "ring-1 ring-primary" : ""}`}>
                  <span className="font-bold">#{i+1} {p.username}{p.id === user.id ? " (YOU)" : ""}</span>
                  <span className="font-bold tabular-nums">{p.kills} K</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => navigate("/lobby")}>Lobby</Button>
              <Button className="flex-1" onClick={() => window.location.reload()}>Rematch</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Pointer-lock prompt */}
      {!pointerLocked && !matchEnded && alive && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur z-10">
          <Card className="p-8 max-w-md text-center border-primary/40 animate-pulse-glow">
            <Crosshair className="w-12 h-12 text-primary mx-auto mb-4 text-glow" />
            <h2 className="text-2xl font-black tracking-widest mb-2">{MAP_NAMES[mapId]}</h2>
            <p className="text-sm text-muted-foreground mb-2">
              <strong className="text-foreground">WASD</strong> move · <strong className="text-foreground">SPACE</strong> jump · <strong className="text-foreground">MOUSE</strong> look<br/>
              <strong className="text-foreground">CLICK</strong> shoot · <strong className="text-foreground">RMB</strong> aim · <strong className="text-foreground">R</strong> reload<br/>
              <strong className="text-foreground">1/2/3</strong> or <strong className="text-foreground">scroll</strong> swap weapon
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
