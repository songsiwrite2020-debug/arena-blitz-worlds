import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

export interface AbilityEffect {
  id: string;
  kind: "smoke" | "wall" | "flash" | "recon";
  pos: [number, number, number];
  rot?: number; // for wall
  color: string;
  startTime: number;
  duration: number;
  ownerId: string;
}

export const AbilityEffects = ({ effects, onExpire }: { effects: AbilityEffect[]; onExpire: (id: string) => void }) => (
  <>
    {effects.map((e) => {
      if (e.kind === "smoke") return <Smoke key={e.id} e={e} onExpire={() => onExpire(e.id)} />;
      if (e.kind === "wall") return <Wall key={e.id} e={e} onExpire={() => onExpire(e.id)} />;
      if (e.kind === "recon") return <Recon key={e.id} e={e} onExpire={() => onExpire(e.id)} />;
      return null;
    })}
  </>
);

const Smoke = ({ e, onExpire }: { e: AbilityEffect; onExpire: () => void }) => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const age = (performance.now() - e.startTime) / e.duration;
    if (age >= 1) { onExpire(); return; }
    if (ref.current) {
      const grow = age < 0.15 ? age / 0.15 : 1;
      const fade = age > 0.85 ? 1 - (age - 0.85) / 0.15 : 1;
      ref.current.scale.setScalar(grow);
      (ref.current.material as THREE.MeshStandardMaterial).opacity = 0.85 * fade;
    }
  });
  return (
    <mesh ref={ref} position={e.pos}>
      <sphereGeometry args={[3.5, 16, 16]} />
      <meshStandardMaterial color={e.color} transparent opacity={0.85} emissive={e.color} emissiveIntensity={0.2} depthWrite={false} />
    </mesh>
  );
};

const Wall = ({ e, onExpire }: { e: AbilityEffect; onExpire: () => void }) => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const age = (performance.now() - e.startTime) / e.duration;
    if (age >= 1) { onExpire(); return; }
    if (ref.current) {
      const fade = age > 0.85 ? 1 - (age - 0.85) / 0.15 : 1;
      (ref.current.material as THREE.MeshStandardMaterial).opacity = 0.7 * fade;
    }
  });
  return (
    <mesh ref={ref} position={e.pos} rotation={[0, e.rot ?? 0, 0]}>
      <boxGeometry args={[6, 2.5, 0.3]} />
      <meshStandardMaterial color={e.color} emissive={e.color} emissiveIntensity={0.6} transparent opacity={0.7} />
    </mesh>
  );
};

const Recon = ({ e, onExpire }: { e: AbilityEffect; onExpire: () => void }) => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const age = (performance.now() - e.startTime) / e.duration;
    if (age >= 1) { onExpire(); return; }
    if (ref.current) {
      const r = 1 + age * 18;
      ref.current.scale.set(r, 1, r);
      (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - age);
    }
  });
  return (
    <mesh ref={ref} position={[e.pos[0], 0.05, e.pos[2]]} rotation={[-Math.PI/2, 0, 0]}>
      <ringGeometry args={[0.95, 1, 48]} />
      <meshBasicMaterial color={e.color} transparent opacity={0.6} />
    </mesh>
  );
};
