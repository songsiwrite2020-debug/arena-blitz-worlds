import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useNavigate, useParams, useSearchParams, Navigate } from "react-router-dom";
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
import { AGENTS } from "@/game/agents";
import { AbilityEffects, AbilityEffect } from "@/game/AbilityEffects";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Crosshair, Heart, Skull, Trophy, X, Timer, Target, Shield, Zap } from "lucide-react";
import { toast } from "sonner";

const PLAYER_RADIUS = 0.5;
const HEAD_RADIUS = 0.28;
const HEAD_Y_OFFSET = 0.55;
const MATCH_LENGTH_MS = 6 * 60 * 1000;
const HEADSHOT_MULT = 2.5;
const FLASH_RADIUS = 14;
const RECON_RADIUS = 16;
const SMOKE_RADIUS = 3.5;

const MAP_NAMES: Record<string, string> = {
  "arena-1": "NEON GRID",
  "arena-2": "CRIMSON BUNKER",
  "arena-3": "VIOLET CITADEL",
  "haven": "BIND",
};

type Team = "attack" | "defense";

export default function Game() {
  const { user, username, loading } = useAuth();
  const { mapId = "arena-1" } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const obstacles = useArenaObstacles(mapId);
  const map = MAPS[mapId] ?? MAPS["arena-1"];
  const agentId = searchParams.get("agent") ?? "phantom";
  const agent = AGENTS[agentId] ?? AGENTS.phantom;
  const mode = searchParams.get("mode") ?? "ffa"; // ffa | 1v1 | 3v3 | 5v5

  const [remotes, setRemotes] = useState<Record<string, RemotePlayerData & { walking?: boolean; team?: Team; agent?: string }>>({});
  const [tracers, setTracers] = useState<TracerData[]>([]);
  const [hp, setHp] = useState(100);
  const [shield, setShield] = useState(50);
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
  const [scoreboard, setScoreboard] = useState<Record<string, { username: string; kills: number; team?: Team; agent?: string }>>({});
  const [effects, setEffects] = useState<AbilityEffect[]>([]);
  const [qCdEnd, setQCdEnd] = useState(0);
  const [eCdEnd, setECdEnd] = useState(0);
  const [flashUntil, setFlashUntil] = useState(0);
  const [reconUntil, setReconUntil] = useState(0);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [dashTrigger, setDashTrigger] = useState<{ ts: number; strength: number } | null>(null);
  const [respawnTick, setRespawnTick] = useState(0);
  const [team] = useState<Team>(() => {
    if (mode === "ffa") return "attack";
    // simple: assign by hash of user id later — start as attack, will rebalance
    return "attack";
  });

  const weapon = WEAPONS[weaponId];
  const alive = hp > 0;

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const meRef = useRef({ pos: [0, 1.7, 5] as [number, number, number], rotY: 0, hp: 100, walking: false });
  const remotesRef = useRef<Record<string, RemotePlayerData & { walking?: boolean; team?: Team; agent?: string }>>({});
  const killsRef = useRef(0);
  const reloadTimer = useRef<number | null>(null);
  const teamRef = useRef<Team>(team);

  useEffect(() => { remotesRef.current = remotes; }, [remotes]);
  useEffect(() => { meRef.current.hp = hp; }, [hp]);
  useEffect(() => { killsRef.current = kills; }, [kills]);

  // Determine spawn from team if map has spawns
  const spawnPos = useMemo<[number, number, number]>(() => {
    const spawns = map.spawns?.filter(s => s.team === teamRef.current);
    if (spawns && spawns.length) {
      const s = spawns[Math.floor(Math.random() * spawns.length)];
      return s.pos;
    }
    return [Math.random() * 10 - 5, 1.7, Math.random() * 10 - 5];
  }, [map, respawnTick]);

  // Match timer
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(i);
  }, []);
  const remaining = Math.max(0, MATCH_LENGTH_MS - (now - matchStart));
  useEffect(() => {
    if (remaining === 0 && !matchEnded) {
      setMatchEnded(true);
      document.exitPointerLock?.();
      if (user) {
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

  // Cleanup expired effects
  useEffect(() => {
    const i = setInterval(() => {
      setEffects((arr) => arr.filter((e) => performance.now() - e.startTime < e.duration));
    }, 500);
    return () => clearInterval(i);
  }, []);

  const onAbility = useCallback((key: "Q" | "E") => {
    if (!alive) return;
    const ab = key === "Q" ? agent.q : agent.e;
    const cdEnd = key === "Q" ? qCdEnd : eCdEnd;
    if (performance.now() < cdEnd) {
      toast.error(`${ab.name} on cooldown`, { duration: 600 });
      return;
    }
    const setCd = key === "Q" ? setQCdEnd : setECdEnd;
    setCd(performance.now() + ab.cooldownMs);

    const pos = meRef.current.pos;
    const rotY = meRef.current.rotY;
    const fwd = new THREE.Vector3(-Math.sin(rotY), 0, -Math.cos(rotY));
    const target: [number, number, number] = [pos[0] + fwd.x * 8, 1.2, pos[2] + fwd.z * 8];
    const id = Math.random().toString(36);

    if (ab.id === "smoke") {
      const fx: AbilityEffect = { id, kind: "smoke", pos: target, color: ab.color, startTime: performance.now(), duration: ab.durationMs, ownerId: user!.id };
      setEffects((arr) => [...arr, fx]);
      channelRef.current?.send({ type: "broadcast", event: "ability", payload: fx });
      sfx.reload();
    } else if (ab.id === "wall") {
      const fx: AbilityEffect = { id, kind: "wall", pos: [target[0], 1.25, target[2]], rot: rotY + Math.PI / 2, color: ab.color, startTime: performance.now(), duration: ab.durationMs, ownerId: user!.id };
      setEffects((arr) => [...arr, fx]);
      channelRef.current?.send({ type: "broadcast", event: "ability", payload: fx });
      sfx.reload();
    } else if (ab.id === "dash") {
      setDashTrigger({ ts: performance.now(), strength: 18 });
      sfx.jump();
    } else if (ab.id === "flash") {
      // Flash: any player (incl. self if facing) within radius around target gets blinded
      const center = new THREE.Vector3(...target);
      // self
      const dx = center.x - pos[0], dz = center.z - pos[2];
      if (dx * dx + dz * dz < FLASH_RADIUS * FLASH_RADIUS) {
        setFlashUntil(performance.now() + ab.durationMs);
      }
      const fx: AbilityEffect = { id, kind: "flash", pos: target, color: ab.color, startTime: performance.now(), duration: 200, ownerId: user!.id };
      channelRef.current?.send({ type: "broadcast", event: "flash", payload: { center: target, duration: ab.durationMs, ownerId: user!.id } });
      setEffects((arr) => [...arr, fx]);
      sfx.kill();
    } else if (ab.id === "recon") {
      const fx: AbilityEffect = { id, kind: "recon", pos: [pos[0], 0.05, pos[2]], color: ab.color, startTime: performance.now(), duration: ab.durationMs, ownerId: user!.id };
      setEffects((arr) => [...arr, fx]);
      channelRef.current?.send({ type: "broadcast", event: "recon", payload: { center: pos, duration: ab.durationMs, ownerId: user!.id } });
      // reveal nearby enemies for self
      const reveal = new Set<string>();
      for (const [rid, p] of Object.entries(remotesRef.current)) {
        const ddx = p.pos[0] - pos[0], ddz = p.pos[2] - pos[2];
        if (ddx * ddx + ddz * ddz < RECON_RADIUS * RECON_RADIUS) reveal.add(rid);
      }
      setRevealedIds(reveal);
      setReconUntil(performance.now() + ab.durationMs);
    }
    addFeed(`✨ ${username} used ${ab.name}`);
  }, [alive, agent, qCdEnd, eCdEnd, user, username, addFeed]);

  // Realtime
  useEffect(() => {
    if (!user || !username) return;

    const ch = supabase.channel(`game:${mapId}:${mode}`, {
      config: { presence: { key: user.id }, broadcast: { self: false } },
    });
    channelRef.current = ch;

    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState<{ username: string; pos: [number,number,number]; rotY: number; hp: number; kills: number; walking?: boolean; team?: Team; agent?: string }>();
      const next: Record<string, RemotePlayerData & { walking?: boolean; team?: Team; agent?: string }> = {};
      const sb: Record<string, { username: string; kills: number; team?: Team; agent?: string }> = {};
      for (const [id, metas] of Object.entries(state)) {
        const m = metas[0];
        if (!m) continue;
        sb[id] = { username: m.username, kills: m.kills ?? 0, team: m.team, agent: m.agent };
        if (id === user.id) continue;
        next[id] = { id, username: m.username, pos: m.pos, rotY: m.rotY, hp: m.hp, walking: m.walking, team: m.team, agent: m.agent };
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
      // Volume drop if walking shooter? skip, just play
      sfx.shot(payload.weapon || "pistol");
    });

    ch.on("broadcast", { event: "hit" }, ({ payload }) => {
      if (payload.targetId !== user.id) return;
      const dmg = payload.damage;
      // Shield first
      let remaining = dmg;
      let nextShield = meRef.current.hp >= 0 ? Math.max(0, /* placeholder */ 0) : 0;
      // Use functional updates
      setShield((s) => {
        const absorb = Math.min(s, remaining);
        remaining = remaining - absorb;
        return s - absorb;
      });
      setHp((h) => {
        const newHp = Math.max(0, h - remaining);
        meRef.current.hp = newHp;
        if (newHp === 0) {
          setDeaths((d) => {
            const nd = d + 1;
            supabase.from("profiles").update({ deaths: nd }).eq("id", user.id).then(() => {});
            return nd;
          });
          addFeed(`💀 ${payload.shooterName} eliminated YOU${payload.headshot ? " (HS)" : ""}`);
          document.exitPointerLock?.();
          setTimeout(() => {
            setHp(100); setShield(50);
            meRef.current.hp = 100;
            setAmmo(WEAPONS[weaponId].ammo);
            setRespawnTick((t) => t + 1);
            toast.success("Respawned!");
          }, 2500);
        }
        return newHp;
      });
      sfx.hurt();
      if (meRef.current.hp > 0) {
        toast.error(`-${dmg} HP${payload.headshot ? " HEADSHOT" : ""}`, { duration: 700 });
      }
    });

    ch.on("broadcast", { event: "kill" }, ({ payload }) => {
      addFeed(`${payload.headshot ? "🎯" : "☠️"} ${payload.shooter} → ${payload.victim}`);
    });

    ch.on("broadcast", { event: "ability" }, ({ payload }) => {
      setEffects((arr) => [...arr, payload as AbilityEffect]);
    });

    ch.on("broadcast", { event: "flash" }, ({ payload }) => {
      const center = new THREE.Vector3(...payload.center);
      const my = new THREE.Vector3(...meRef.current.pos);
      if (center.distanceTo(my) < FLASH_RADIUS) {
        // line of sight check vs obstacles
        const dir = center.clone().sub(my).normalize();
        const ray = new THREE.Ray(my, dir);
        let blocked = false;
        for (const b of obstacles) {
          const pt = new THREE.Vector3();
          if (ray.intersectBox(b, pt) && my.distanceTo(pt) < my.distanceTo(center)) { blocked = true; break; }
        }
        if (!blocked) setFlashUntil(performance.now() + payload.duration);
      }
      setEffects((arr) => [...arr, { id: Math.random().toString(36), kind: "flash", pos: payload.center, color: "#ffffff", startTime: performance.now(), duration: 200, ownerId: payload.ownerId }]);
    });

    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await ch.track({
          username,
          pos: meRef.current.pos,
          rotY: meRef.current.rotY,
          hp: meRef.current.hp,
          kills: killsRef.current,
          walking: meRef.current.walking,
          team: teamRef.current,
          agent: agent.id,
        });
      }
    });

    return () => {
      supabase.removeChannel(ch);
      channelRef.current = null;
    };
  }, [user, username, mapId, mode, addFeed, weaponId, obstacles, agent.id]);

  useEffect(() => {
    const onChange = () => setPointerLocked(!!document.pointerLockElement);
    document.addEventListener("pointerlockchange", onChange);
    return () => document.removeEventListener("pointerlockchange", onChange);
  }, []);

  // Clear recon reveal when expired
  useEffect(() => {
    if (reconUntil === 0) return;
    const t = setTimeout(() => { setRevealedIds(new Set()); setReconUntil(0); }, Math.max(0, reconUntil - performance.now()));
    return () => clearTimeout(t);
  }, [reconUntil]);

  const onPositionChange = useCallback((pos: [number, number, number], rotY: number, walking: boolean) => {
    meRef.current.pos = pos;
    meRef.current.rotY = rotY;
    meRef.current.walking = walking;
    channelRef.current?.track({
      username, pos, rotY, hp: meRef.current.hp, kills: killsRef.current,
      walking, team: teamRef.current, agent: agent.id,
    });
  }, [username, agent.id]);

  const isBlockedBySmokeOrWall = useCallback((origin: THREE.Vector3, end: THREE.Vector3) => {
    const ray = new THREE.Ray(origin, end.clone().sub(origin).normalize());
    const distToEnd = origin.distanceTo(end);
    for (const e of effects) {
      if (e.kind === "smoke") {
        const sphere = new THREE.Sphere(new THREE.Vector3(...e.pos), SMOKE_RADIUS);
        const pt = new THREE.Vector3();
        if (ray.intersectSphere(sphere, pt) && origin.distanceTo(pt) < distToEnd) return true;
      } else if (e.kind === "wall") {
        // approximate as box
        const box = new THREE.Box3(
          new THREE.Vector3(e.pos[0] - 3, e.pos[1] - 1.25, e.pos[2] - 0.2),
          new THREE.Vector3(e.pos[0] + 3, e.pos[1] + 1.25, e.pos[2] + 0.2),
        );
        // rotate test approximated by sphere of radius 3 at center for blocking
        const sphere = new THREE.Sphere(new THREE.Vector3(...e.pos), 3);
        const pt = new THREE.Vector3();
        if (ray.intersectSphere(sphere, pt) && origin.distanceTo(pt) < distToEnd) return true;
      }
    }
    return false;
  }, [effects]);

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
    let headshot = false;

    for (const b of obstacles) {
      const pt = new THREE.Vector3();
      if (ray.intersectBox(b, pt)) {
        const dist = o.distanceTo(pt);
        if (dist < hitDist) { hitDist = dist; hitPoint = pt; hitPlayerId = null; headshot = false; }
      }
    }
    // Walls block bullets
    for (const e of effects) {
      if (e.kind !== "wall") continue;
      const sphere = new THREE.Sphere(new THREE.Vector3(...e.pos), 3);
      const pt = new THREE.Vector3();
      if (ray.intersectSphere(sphere, pt)) {
        const dist = o.distanceTo(pt);
        if (dist < hitDist) { hitDist = dist; hitPoint = pt; hitPlayerId = null; headshot = false; }
      }
    }

    for (const [id, p] of Object.entries(remotesRef.current)) {
      // Skip teammates in team modes
      if (mode !== "ffa" && p.team && p.team === teamRef.current) continue;
      // Head sphere
      const headCenter = new THREE.Vector3(p.pos[0], p.pos[1] - PLAYER_RADIUS + HEAD_Y_OFFSET, p.pos[2]);
      const headSphere = new THREE.Sphere(headCenter, HEAD_RADIUS);
      const headPt = new THREE.Vector3();
      if (ray.intersectSphere(headSphere, headPt)) {
        const dist = o.distanceTo(headPt);
        if (dist < hitDist) { hitDist = dist; hitPoint = headPt; hitPlayerId = id; headshot = true; continue; }
      }
      // Body sphere
      const bodyCenter = new THREE.Vector3(p.pos[0], p.pos[1] - 0.5, p.pos[2]);
      const bodySphere = new THREE.Sphere(bodyCenter, PLAYER_RADIUS + 0.3);
      const bodyPt = new THREE.Vector3();
      if (ray.intersectSphere(bodySphere, bodyPt)) {
        const dist = o.distanceTo(bodyPt);
        if (dist < hitDist) { hitDist = dist; hitPoint = bodyPt; hitPlayerId = id; headshot = false; }
      }
    }

    // Bullet blocked by smoke?
    if (hitPlayerId && isBlockedBySmokeOrWall(o, hitPoint)) {
      hitPlayerId = null;
    }

    const end: [number, number, number] = [hitPoint.x, hitPoint.y, hitPoint.z];
    setTracers((arr) => [...arr, {
      id: Math.random().toString(36),
      origin, end, startTime: performance.now(),
    }]);
    channelRef.current?.send({ type: "broadcast", event: "shot", payload: { origin, end, weapon: weaponId } });

    if (hitPlayerId && user && username) {
      const target = remotesRef.current[hitPlayerId];
      const dmg = Math.round(weapon.damage * (headshot ? HEADSHOT_MULT : 1));
      sfx.hit();
      channelRef.current?.send({
        type: "broadcast", event: "hit",
        payload: { targetId: hitPlayerId, damage: dmg, shooterName: username, shooterId: user.id, headshot },
      });
      if (target.hp - dmg <= 0) {
        setKills((k) => {
          const nk = k + 1;
          supabase.from("profiles").update({ kills: nk }).eq("id", user.id).then(() => {});
          return nk;
        });
        sfx.kill();
        addFeed(`${headshot ? "🎯" : "☠️"} YOU → ${target.username}${headshot ? " (HS)" : ""}`);
        channelRef.current?.send({
          type: "broadcast", event: "kill",
          payload: { shooter: username, victim: target.username, headshot },
        });
      }
    }
  }, [alive, reloading, ammo, weapon, weaponId, obstacles, effects, user, username, addFeed, doReload, isBlockedBySmokeOrWall, mode]);

  const expireTracer = useCallback((id: string) => {
    setTracers((arr) => arr.filter((t) => t.id !== id));
  }, []);
  const expireEffect = useCallback((id: string) => {
    setEffects((arr) => arr.filter((e) => e.id !== id));
  }, []);

  const sortedScoreboard = useMemo(() =>
    Object.entries(scoreboard)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.kills - a.kills)
      .slice(0, 10),
  [scoreboard]);

  const teamKills = useMemo(() => {
    const t = { attack: 0, defense: 0 };
    for (const v of Object.values(scoreboard)) {
      if (v.team === "attack") t.attack += v.kills;
      else if (v.team === "defense") t.defense += v.kills;
    }
    return t;
  }, [scoreboard]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  const timeStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  const flashIntensity = Math.max(0, Math.min(1, (flashUntil - now) / 1500));
  const qCd = Math.max(0, qCdEnd - now) / 1000;
  const eCd = Math.max(0, eCdEnd - now) / 1000;

  return (
    <main className="fixed inset-0 bg-black overflow-hidden">
      <Canvas shadows camera={{ fov: 80, near: 0.1, far: 300 }}>
        <color attach="background" args={[map.floorColor]} />
        <fog attach="fog" args={[map.floorColor, 30, 110]} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[15, 25, 10]} intensity={1.4} castShadow shadow-mapSize={[2048, 2048]} />
        <pointLight position={[0, 10, 0]} intensity={1.2} color={map.accentColor} distance={50} />
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
          onAbility={onAbility}
          spawnPos={spawnPos}
          respawnTick={respawnTick}
          dashTrigger={dashTrigger}
        />
        {Object.values(remotes).map((r) => (
          <RemotePlayer key={r.id} data={{ ...r, hp: revealedIds.has(r.id) ? Math.max(r.hp, 1) : r.hp }} />
        ))}
        <Tracers tracers={tracers} onExpire={expireTracer} />
        <AbilityEffects effects={effects} onExpire={expireEffect} />
        {!zoomActive && <Viewmodel weapon={weapon} fireFlash={lastShotAt} />}
      </Canvas>

      <div className="pointer-events-none absolute inset-0">
        {/* Flash overlay */}
        {flashIntensity > 0 && (
          <div className="absolute inset-0 bg-white" style={{ opacity: flashIntensity }} />
        )}

        {/* Crosshair */}
        {!zoomActive && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-1 h-1 bg-primary rounded-full shadow-[0_0_6px_hsl(var(--primary))]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 border border-primary/60 rounded-full" />
          </div>
        )}
        {/* Scope overlay */}
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
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-4 px-6 py-2 bg-card/80 backdrop-blur rounded-lg border border-primary/30 items-center">
          {mode !== "ffa" && (
            <>
              <span className="font-black text-lg text-primary tabular-nums">{teamKills.attack}</span>
              <span className="text-xs text-muted-foreground">ATK</span>
              <span className="text-muted-foreground">|</span>
              <span className="text-xs text-muted-foreground">DEF</span>
              <span className="font-black text-lg text-accent tabular-nums">{teamKills.defense}</span>
              <span className="mx-2 text-muted-foreground">·</span>
            </>
          )}
          <div className="flex items-center gap-1 text-primary"><Skull className="w-4 h-4" /><span className="font-bold tabular-nums">{kills}</span></div>
          <div className="flex items-center gap-1 text-destructive"><X className="w-4 h-4" /><span className="font-bold tabular-nums">{deaths}</span></div>
          <div className="flex items-center gap-1 text-accent"><Timer className="w-4 h-4" /><span className="font-bold tabular-nums">{timeStr}</span></div>
        </div>

        {/* HP / Shield */}
        <div className="absolute bottom-6 left-6 w-72">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-accent" />
            <span className="text-xs font-bold uppercase tracking-wider tabular-nums">{shield}</span>
            <Heart className="w-4 h-4 text-destructive ml-3" />
            <span className="text-xs font-bold uppercase tracking-wider tabular-nums">{hp}</span>
          </div>
          <div className="h-2 bg-card border border-border rounded overflow-hidden mb-1">
            <div className="h-full bg-accent transition-all" style={{ width: `${shield}%`, boxShadow: "0 0 8px hsl(var(--accent))" }} />
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

        {/* Abilities */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
          {(["Q", "E"] as const).map((k) => {
            const ab = k === "Q" ? agent.q : agent.e;
            const cd = k === "Q" ? qCd : eCd;
            const ready = cd === 0;
            return (
              <div key={k} className={`relative w-16 h-16 rounded-lg border-2 flex flex-col items-center justify-center ${
                ready ? "border-primary bg-primary/10" : "border-border bg-card/60"
              }`} style={ready ? { boxShadow: `0 0 12px ${ab.color}80` } : {}}>
                <Zap className="w-4 h-4" style={{ color: ready ? ab.color : undefined }} />
                <div className="text-[10px] uppercase font-bold mt-1">{ab.name}</div>
                <div className="absolute top-1 right-1 text-[10px] font-black bg-background/80 px-1 rounded">{k}</div>
                {!ready && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/70 rounded-lg">
                    <span className="text-lg font-black tabular-nums">{Math.ceil(cd)}</span>
                  </div>
                )}
              </div>
            );
          })}
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

        {/* Live scoreboard + agent */}
        <div className="absolute top-20 left-6 bg-card/70 backdrop-blur px-3 py-2 rounded border border-border min-w-[200px]">
          <div className="text-xs uppercase tracking-widest mb-1 flex items-center gap-1" style={{ color: agent.color }}>
            <Target className="w-3 h-3" /> {agent.name} · {agent.role}
          </div>
          {sortedScoreboard.map((p, i) => (
            <div key={p.id} className={`flex justify-between text-xs ${p.id === user.id ? "text-primary font-bold" : ""}`}>
              <span className="truncate max-w-[120px]">#{i+1} {p.username}</span>
              <span className="tabular-nums">{p.kills}</span>
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
            <p className="text-sm text-muted-foreground mb-6">{MAP_NAMES[mapId]} · {mode.toUpperCase()}</p>
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
            <Crosshair className="w-12 h-12 mx-auto mb-3" style={{ color: agent.color }} />
            <div className="text-xs uppercase tracking-widest text-muted-foreground">{agent.role} · {mode.toUpperCase()}</div>
            <h2 className="text-2xl font-black tracking-widest mb-1" style={{ color: agent.color }}>{agent.name}</h2>
            <p className="text-xs text-muted-foreground mb-3">{MAP_NAMES[mapId]}</p>
            <p className="text-sm text-muted-foreground mb-4">
              <strong className="text-foreground">WASD</strong> move · <strong className="text-foreground">SHIFT</strong> walk silent · <strong className="text-foreground">SPACE</strong> jump<br/>
              <strong className="text-foreground">LMB</strong> shoot · <strong className="text-foreground">RMB</strong> aim · <strong className="text-foreground">R</strong> reload<br/>
              <strong className="text-foreground">Q</strong> {agent.q.name} · <strong className="text-foreground">E</strong> {agent.e.name}<br/>
              <strong className="text-foreground">1/2/3</strong> swap weapon
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
