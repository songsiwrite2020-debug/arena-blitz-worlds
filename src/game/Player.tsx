import { useRef, useEffect, useState, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import * as THREE from "three";

interface Props {
  onPositionChange: (pos: [number, number, number], rotY: number) => void;
  onShoot: (origin: [number, number, number], dir: [number, number, number]) => void;
  obstacles: THREE.Box3[];
  arenaSize: number;
}

const SPEED = 8;
const JUMP = 7;
const GRAVITY = 22;
const PLAYER_HEIGHT = 1.7;
const PLAYER_RADIUS = 0.4;

export const Player = ({ onPositionChange, onShoot, obstacles, arenaSize }: Props) => {
  const { camera, gl } = useThree();
  const velocity = useRef(new THREE.Vector3());
  const onGround = useRef(false);
  const keys = useRef<Record<string, boolean>>({});
  const lastSent = useRef(0);
  const lastShot = useRef(0);

  useEffect(() => {
    camera.position.set(0, PLAYER_HEIGHT, 5);
    const down = (e: KeyboardEvent) => { keys.current[e.code] = true; };
    const up = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    const shoot = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (!document.pointerLockElement) return;
      const now = performance.now();
      if (now - lastShot.current < 200) return;
      lastShot.current = now;
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      onShoot(
        [camera.position.x, camera.position.y, camera.position.z],
        [dir.x, dir.y, dir.z]
      );
    };
    gl.domElement.addEventListener("mousedown", shoot);

    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      gl.domElement.removeEventListener("mousedown", shoot);
    };
  }, [camera, gl, onShoot]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const k = keys.current;

    // movement input relative to camera yaw
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0; forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0,1,0)).normalize();

    const move = new THREE.Vector3();
    if (k["KeyW"]) move.add(forward);
    if (k["KeyS"]) move.sub(forward);
    if (k["KeyD"]) move.add(right);
    if (k["KeyA"]) move.sub(right);
    if (move.lengthSq() > 0) move.normalize().multiplyScalar(SPEED);

    velocity.current.x = move.x;
    velocity.current.z = move.z;
    velocity.current.y -= GRAVITY * dt;

    if (k["Space"] && onGround.current) {
      velocity.current.y = JUMP;
      onGround.current = false;
    }

    // Try move axis by axis with collision
    const tryMove = (axis: "x" | "y" | "z", amount: number) => {
      const next = camera.position.clone();
      next[axis] += amount;
      // arena bounds
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

    // ground check (floor at y=0)
    if (camera.position.y <= PLAYER_HEIGHT) {
      camera.position.y = PLAYER_HEIGHT;
      velocity.current.y = 0;
      onGround.current = true;
    }

    // throttle network updates ~15Hz
    const now = performance.now();
    if (now - lastSent.current > 66) {
      lastSent.current = now;
      onPositionChange(
        [camera.position.x, camera.position.y, camera.position.z],
        camera.rotation.y
      );
    }
  });

  return <PointerLockControls />;
};
