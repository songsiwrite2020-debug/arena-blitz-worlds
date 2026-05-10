import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

export interface RemotePlayerData {
  id: string;
  username: string;
  pos: [number, number, number];
  rotY: number;
  hp: number;
}

const BASE  = "#0d1520";
const PLATE = "#162232";

export const RemotePlayer = ({ data }: { data: RemotePlayerData }) => {
  const group = useRef<THREE.Group>(null);
  const snapped = useRef(false);

  useFrame((_, delta) => {
    if (!group.current) return;
    const tx = data.pos[0];
    const ty = data.pos[1] - 1.7;
    const tz = data.pos[2];

    if (!snapped.current) {
      group.current.position.set(tx, ty, tz);
      group.current.rotation.y = data.rotY;
      snapped.current = true;
      return;
    }

    const t = Math.min(1, delta * 12);
    group.current.position.x += (tx - group.current.position.x) * t;
    group.current.position.y += (ty - group.current.position.y) * t;
    group.current.position.z += (tz - group.current.position.z) * t;
    group.current.rotation.y += (data.rotY - group.current.rotation.y) * t;
  });

  const color = data.hp > 50 ? "#00ff88" : data.hp > 20 ? "#ffaa00" : "#ff3333";

  return (
    <group ref={group}>
      {/* Legs */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[0.38, 1.1, 0.26]} />
        <meshStandardMaterial color={BASE} metalness={0.7} roughness={0.28} />
      </mesh>
      {/* Knee plates */}
      <mesh position={[0.1, 0.34, 0.14]}>
        <boxGeometry args={[0.14, 0.12, 0.06]} />
        <meshStandardMaterial color={PLATE} metalness={0.85} roughness={0.18} />
      </mesh>
      <mesh position={[-0.1, 0.34, 0.14]}>
        <boxGeometry args={[0.14, 0.12, 0.06]} />
        <meshStandardMaterial color={PLATE} metalness={0.85} roughness={0.18} />
      </mesh>
      {/* Torso */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <boxGeometry args={[0.5, 0.68, 0.3]} />
        <meshStandardMaterial color={BASE} metalness={0.7} roughness={0.28} />
      </mesh>
      {/* Chest plate */}
      <mesh position={[0, 1.2, 0.16]}>
        <boxGeometry args={[0.44, 0.54, 0.07]} />
        <meshStandardMaterial color={PLATE} emissive={color} emissiveIntensity={0.1} metalness={0.88} roughness={0.14} />
      </mesh>
      {/* Chest vertical glow strip */}
      <mesh position={[0, 1.2, 0.2]}>
        <boxGeometry args={[0.035, 0.46, 0.01]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* Chest horizontal glow strip */}
      <mesh position={[0, 1.32, 0.2]}>
        <boxGeometry args={[0.38, 0.02, 0.01]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* Shoulder pads */}
      <mesh position={[0.37, 1.52, 0]} castShadow>
        <boxGeometry args={[0.13, 0.11, 0.32]} />
        <meshStandardMaterial color={PLATE} metalness={0.85} roughness={0.18} />
      </mesh>
      <mesh position={[-0.37, 1.52, 0]} castShadow>
        <boxGeometry args={[0.13, 0.11, 0.32]} />
        <meshStandardMaterial color={PLATE} metalness={0.85} roughness={0.18} />
      </mesh>
      {/* Shoulder accent strips */}
      <mesh position={[0.37, 1.58, 0]}>
        <boxGeometry args={[0.135, 0.016, 0.32]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} />
      </mesh>
      <mesh position={[-0.37, 1.58, 0]}>
        <boxGeometry args={[0.135, 0.016, 0.32]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} />
      </mesh>
      {/* Neck */}
      <mesh position={[0, 1.64, 0]}>
        <cylinderGeometry args={[0.09, 0.1, 0.14, 8]} />
        <meshStandardMaterial color={BASE} metalness={0.72} roughness={0.3} />
      </mesh>
      {/* Helmet */}
      <mesh position={[0, 1.89, 0]} castShadow>
        <boxGeometry args={[0.33, 0.33, 0.32]} />
        <meshStandardMaterial color={PLATE} metalness={0.78} roughness={0.2} />
      </mesh>
      {/* Helmet top ridge */}
      <mesh position={[0, 2.06, 0]}>
        <boxGeometry args={[0.08, 0.04, 0.28]} />
        <meshStandardMaterial color={PLATE} metalness={0.85} roughness={0.15} />
      </mesh>
      {/* Visor */}
      <mesh position={[0, 1.9, 0.17]}>
        <boxGeometry args={[0.27, 0.09, 0.025]} />
        <meshBasicMaterial color={color} transparent opacity={0.88} />
      </mesh>
      {/* Visor glow (point light) */}
      <pointLight position={[0, 1.9, 0.28]} color={color} intensity={1.0} distance={1.8} decay={2} />
      {/* Backpack / equipment pack */}
      <mesh position={[0, 1.18, -0.2]}>
        <boxGeometry args={[0.34, 0.42, 0.12]} />
        <meshStandardMaterial color={BASE} metalness={0.65} roughness={0.35} />
      </mesh>
      {/* Weapon */}
      <mesh position={[0.24, 1.22, -0.38]} castShadow>
        <boxGeometry args={[0.08, 0.09, 0.54]} />
        <meshStandardMaterial color="#151820" metalness={0.88} roughness={0.18} />
      </mesh>
      <mesh position={[0.24, 1.14, -0.26]}>
        <boxGeometry args={[0.055, 0.16, 0.07]} />
        <meshStandardMaterial color="#101318" metalness={0.82} roughness={0.22} />
      </mesh>
      {/* Weapon glow strip */}
      <mesh position={[0.28, 1.22, -0.38]}>
        <boxGeometry args={[0.006, 0.065, 0.44]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} />
      </mesh>
      {/* Name + HP */}
      <Text
        position={[0, 2.52, 0]}
        fontSize={0.24}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="black"
      >
        {data.username}
      </Text>
      <Text
        position={[0, 2.3, 0]}
        fontSize={0.17}
        color={color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.015}
        outlineColor="black"
      >
        {data.hp} HP
      </Text>
    </group>
  );
};
