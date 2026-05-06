import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import * as THREE from "three";
import { Weapon } from "./weapons";
import { sfx } from "./sfx";

interface Props {
  onPositionChange: (pos: [number, number, number], rotY: number, walking: boolean) => void;
  onShoot: (origin: [number, number, number], dir: [number, number, number]) => void;
  obstacles: THREE.Box3[];
  arenaSize: number;
  weapon: Weapon;
  ammo: number;
  reloading: boolean;
  onReload: () => void;
  onSwitchWeapon: (idx: number) => void;
  onScrollWeapon: (delta: number) => void;
  zoomActive: boolean;
  setZoomActive: (b: boolean) => void;
  alive: boolean;
  onAbility: (key: "Q" | "E") => void;
  spawnPos?: [number, number, number];
  respawnTick?: number;
  dashTrigger?: { ts: number; strength: number } | null;
}

const SPEED = 8;
const WALK_SPEED = 3.2;
const JUMP = 7;
const GRAVITY = 22;
const PLAYER_HEIGHT = 1.7;
const PLAYER_RADIUS = 0.4;

export const Player = ({
  onPositionChange, onShoot, obstacles, arenaSize,
  weapon, ammo, reloading, onReload, onSwitchWeapon, onScrollWeapon,
  zoomActive, setZoomActive, alive,
  onAbility, spawnPos, respawnTick, dashTrigger,
}: Props) => {
  const { camera, gl } = useThree();
  const velocity = useRef(new THREE.Vector3());
  const onGround = useRef(false);
  const keys = useRef<Record<string, boolean>>({});
  const mouseDown = useRef(false);
  const lastSent = useRef(0);
  const lastShot = useRef(0);
  const baseFov = useRef<number>(80);
  const lastDashTs = useRef(0);

  useEffect(() => {
    const p = spawnPos ?? [0, PLAYER_HEIGHT, 5];
    camera.position.set(p[0], p[1], p[2]);
    velocity.current.set(0, 0, 0);
    if ("fov" in camera) {
      baseFov.current = (camera as THREE.PerspectiveCamera).fov;
    }
  }, [camera, spawnPos, respawnTick]);

  // Apply external dash impulse
  useEffect(() => {
    if (!dashTrigger || dashTrigger.ts === lastDashTs.current) return;
    lastDashTs.current = dashTrigger.ts;
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.y = 0; dir.normalize();
    velocity.current.x += dir.x * dashTrigger.strength;
    velocity.current.z += dir.z * dashTrigger.strength;
    velocity.current.y = 3;
  }, [dashTrigger, camera]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      if (!document.pointerLockElement) return;
      if (e.code === "KeyR") onReload();
      if (e.code === "Digit1") onSwitchWeapon(0);
      if (e.code === "Digit2") onSwitchWeapon(1);
      if (e.code === "Digit3") onSwitchWeapon(2);
      if (e.code === "KeyQ") onAbility("Q");
      if (e.code === "KeyE") onAbility("E");
    };
    const up = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    const md = (e: MouseEvent) => {
      if (!document.pointerLockElement) return;
      if (e.button === 0) mouseDown.current = true;
      if (e.button === 2 && weapon.zoom) setZoomActive(true);
    };
    const mu = (e: MouseEvent) => {
      if (e.button === 0) mouseDown.current = false;
      if (e.button === 2) setZoomActive(false);
    };
    const ctxMenu = (e: Event) => e.preventDefault();
    const wheel = (e: WheelEvent) => {
      if (!document.pointerLockElement) return;
      onScrollWeapon(e.deltaY > 0 ? 1 : -1);
    };
    gl.domElement.addEventListener("mousedown", md);
    window.addEventListener("mouseup", mu);
    gl.domElement.addEventListener("contextmenu", ctxMenu);
    gl.domElement.addEventListener("wheel", wheel);

    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      gl.domElement.removeEventListener("mousedown", md);
      window.removeEventListener("mouseup", mu);
      gl.domElement.removeEventListener("contextmenu", ctxMenu);
      gl.domElement.removeEventListener("wheel", wheel);
    };
  }, [gl, onReload, onSwitchWeapon, onScrollWeapon, setZoomActive, weapon.zoom, onAbility]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const k = keys.current;

    // Smooth FOV zoom
    if ("fov" in camera) {
      const cam = camera as THREE.PerspectiveCamera;
      const targetFov = zoomActive && weapon.zoom ? weapon.zoom : baseFov.current;
      cam.fov += (targetFov - cam.fov) * Math.min(1, dt * 12);
      cam.updateProjectionMatrix();
    }

    let walking = false;
    if (alive) {
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.y = 0; forward.normalize();
      const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

      const move = new THREE.Vector3();
      if (k["KeyW"]) move.add(forward);
      if (k["KeyS"]) move.sub(forward);
      if (k["KeyD"]) move.add(right);
      if (k["KeyA"]) move.sub(right);
      walking = !!(k["ShiftLeft"] || k["ShiftRight"]);
      const baseSpeed = walking ? WALK_SPEED : SPEED;
      const speed = zoomActive ? baseSpeed * 0.55 : baseSpeed;
      if (move.lengthSq() > 0) move.normalize().multiplyScalar(speed);
      velocity.current.x = move.x;
      velocity.current.z = move.z;

      if (k["Space"] && onGround.current) {
        velocity.current.y = JUMP;
        onGround.current = false;
        sfx.jump();
      }
    } else {
      velocity.current.x = 0; velocity.current.z = 0;
    }

    velocity.current.y -= GRAVITY * dt;

    const tryMove = (axis: "x" | "y" | "z", amount: number) => {
      const next = camera.position.clone();
      next[axis] += amount;
      const half = arenaSize / 2 - PLAYER_RADIUS;
      if (axis === "x") next.x = Math.max(-half, Math.min(half, next.x));
      if (axis === "z") next.z = Math.max(-half, Math.min(half, next.z));

      const playerBox = new THREE.Box3(
        new THREE.Vector3(next.x - PLAYER_RADIUS, next.y - PLAYER_HEIGHT, next.z - PLAYER_RADIUS),
        new THREE.Vector3(next.x + PLAYER_RADIUS, next.y, next.z + PLAYER_RADIUS),
      );
      for (const b of obstacles) {
        if (playerBox.intersectsBox(b)) {
          if (axis === "y" && amount < 0) {
            onGround.current = true;
            velocity.current.y = 0;
            camera.position.y = b.max.y + PLAYER_HEIGHT;
          }
          return;
        }
      }
      camera.position[axis] = next[axis];
    };

    tryMove("x", velocity.current.x * dt);
    tryMove("z", velocity.current.z * dt);
    tryMove("y", velocity.current.y * dt);

    if (camera.position.y <= PLAYER_HEIGHT) {
      camera.position.y = PLAYER_HEIGHT;
      velocity.current.y = 0;
      onGround.current = true;
    }

    // Auto-fire (held mouse for SMG; pistol/sniper still gated by fireRate)
    if (alive && mouseDown.current && document.pointerLockElement && !reloading && ammo > 0) {
      const now = performance.now();
      if (now - lastShot.current >= weapon.fireRateMs) {
        lastShot.current = now;
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        // apply spread (less when zoomed)
        const spread = weapon.spread * (zoomActive ? 0.15 : 1);
        dir.x += (Math.random() - 0.5) * spread;
        dir.y += (Math.random() - 0.5) * spread;
        dir.z += (Math.random() - 0.5) * spread;
        dir.normalize();
        onShoot(
          [camera.position.x, camera.position.y, camera.position.z],
          [dir.x, dir.y, dir.z]
        );
      }
    }

    const now = performance.now();
    if (now - lastSent.current > 50) {
      lastSent.current = now;
      onPositionChange(
        [camera.position.x, camera.position.y, camera.position.z],
        camera.rotation.y,
        walking,
      );
    }
  });

  return <PointerLockControls />;
};
