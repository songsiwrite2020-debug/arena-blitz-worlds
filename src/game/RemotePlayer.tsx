import { useRef, MutableRefObject } from "react";
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

interface Props {
  data: RemotePlayerData;
  posRef: MutableRefObject<Record<string, { pos: [number, number, number]; rotY: number }>>;
}

export const RemotePlayer = ({ data, posRef }: Props) => {
  const group     = useRef<THREE.Group>(null);
  const bodyGroup = useRef<THREE.Group>(null);
  const leftHip   = useRef<THREE.Group>(null);
  const rightHip  = useRef<THREE.Group>(null);
  const snapped   = useRef(false);
  const prevPos   = useRef(new THREE.Vector3());
  const walkTime  = useRef(0);

  useFrame((_, delta) => {
    if (!group.current) return;

    // Read from posRef first (updated by broadcast every 50ms, no React re-render needed)
    // Fall back to data.pos (from presence sync) if no broadcast has arrived yet
    const live = posRef.current[data.id];
    const srcPos = live?.pos ?? data.pos;
    const srcRotY = live?.rotY ?? data.rotY;

    const tx = srcPos[0];
    const ty = srcPos[1] - 1.7;
    const tz = srcPos[2];

    if (!snapped.current) {
      group.current.position.set(tx, ty, tz);
      group.current.rotation.y = srcRotY;
      prevPos.current.set(tx, ty, tz);
      snapped.current = true;
      return;
    }

    // Smooth interpolation — fast enough to look real-time at 20fps updates
    const t = Math.min(1, delta * 20);
    group.current.position.x += (tx - group.current.position.x) * t;
    group.current.position.y += (ty - group.current.position.y) * t;
    group.current.position.z += (tz - group.current.position.z) * t;
    group.current.rotation.y += (srcRotY - group.current.rotation.y) * t;

    // Velocity-based walk animation
    const speed = group.current.position.distanceTo(prevPos.current) / Math.max(delta, 0.001);
    prevPos.current.copy(group.current.position);

    const moving = speed > 0.4;
    if (moving) {
      walkTime.current += delta * Math.max(speed * 1.2, 5);
    } else {
      walkTime.current *= 0.8;
    }

    const swing = Math.sin(walkTime.current) * 0.6;
    if (leftHip.current)  leftHip.current.rotation.x  =  swing;
    if (rightHip.current) rightHip.current.rotation.x = -swing;

    if (bodyGroup.current) {
      bodyGroup.current.position.y = moving
        ? Math.abs(Math.sin(walkTime.current * 2)) * 0.05
        : 0;
    }
  });

  const color = data.hp > 50 ? "#00ff88" : data.hp > 20 ? "#ffaa00" : "#ff3333";

  return (
    <group ref={group}>

      {/* Left leg — pivot at hip (y = 1.1) */}
      <group ref={leftHip} position={[-0.1, 1.1, 0]}>
        <mesh position={[0, -0.55, 0]} castShadow>
          <boxGeometry args={[0.17, 1.1, 0.24]} />
          <meshStandardMaterial color={BASE} metalness={0.7} roughness={0.28} />
        </mesh>
        <mesh position={[0, -0.76, 0.14]}>
          <boxGeometry args={[0.14, 0.12, 0.06]} />
          <meshStandardMaterial color={PLATE} metalness={0.85} roughness={0.18} />
        </mesh>
      </group>

      {/* Right leg — pivot at hip */}
      <group ref={rightHip} position={[0.1, 1.1, 0]}>
        <mesh position={[0, -0.55, 0]} castShadow>
          <boxGeometry args={[0.17, 1.1, 0.24]} />
          <meshStandardMaterial color={BASE} metalness={0.7} roughness={0.28} />
        </mesh>
        <mesh position={[0, -0.76, 0.14]}>
          <boxGeometry args={[0.14, 0.12, 0.06]} />
          <meshStandardMaterial color={PLATE} metalness={0.85} roughness={0.18} />
        </mesh>
      </group>

      {/* Upper body */}
      <group ref={bodyGroup}>
        <mesh position={[0, 1.2, 0]} castShadow>
          <boxGeometry args={[0.5, 0.68, 0.3]} />
          <meshStandardMaterial color={BASE} metalness={0.7} roughness={0.28} />
        </mesh>
        <mesh position={[0, 1.2, 0.16]}>
          <boxGeometry args={[0.44, 0.54, 0.07]} />
          <meshStandardMaterial color={PLATE} emissive={color} emissiveIntensity={0.12} metalness={0.88} roughness={0.14} />
        </mesh>
        <mesh position={[0, 1.2, 0.2]}>
          <boxGeometry args={[0.035, 0.46, 0.01]} />
          <meshBasicMaterial color={color} />
        </mesh>
        <mesh position={[0, 1.32, 0.2]}>
          <boxGeometry args={[0.38, 0.02, 0.01]} />
          <meshBasicMaterial color={color} />
        </mesh>
        <mesh position={[0.37, 1.52, 0]} castShadow>
          <boxGeometry args={[0.13, 0.11, 0.32]} />
          <meshStandardMaterial color={PLATE} metalness={0.85} roughness={0.18} />
        </mesh>
        <mesh position={[-0.37, 1.52, 0]} castShadow>
          <boxGeometry args={[0.13, 0.11, 0.32]} />
          <meshStandardMaterial color={PLATE} metalness={0.85} roughness={0.18} />
        </mesh>
        <mesh position={[0.37, 1.58, 0]}>
          <boxGeometry args={[0.135, 0.016, 0.32]} />
          <meshBasicMaterial color={color} transparent opacity={0.8} />
        </mesh>
        <mesh position={[-0.37, 1.58, 0]}>
          <boxGeometry args={[0.135, 0.016, 0.32]} />
          <meshBasicMaterial color={color} transparent opacity={0.8} />
        </mesh>
        <mesh position={[0, 1.64, 0]}>
          <cylinderGeometry args={[0.09, 0.1, 0.14, 8]} />
          <meshStandardMaterial color={BASE} metalness={0.72} roughness={0.3} />
        </mesh>
        <mesh position={[0, 1.89, 0]} castShadow>
          <boxGeometry args={[0.33, 0.33, 0.32]} />
          <meshStandardMaterial color={PLATE} metalness={0.78} roughness={0.2} />
        </mesh>
        <mesh position={[0, 2.06, 0]}>
          <boxGeometry args={[0.08, 0.04, 0.28]} />
          <meshStandardMaterial color={PLATE} metalness={0.85} roughness={0.15} />
        </mesh>
        <mesh position={[0, 1.9, 0.17]}>
          <boxGeometry args={[0.27, 0.09, 0.025]} />
          <meshBasicMaterial color={color} transparent opacity={0.88} />
        </mesh>
        <pointLight position={[0, 1.9, 0.28]} color={color} intensity={1.0} distance={1.8} decay={2} />
        <mesh position={[0, 1.18, -0.2]}>
          <boxGeometry args={[0.34, 0.42, 0.12]} />
          <meshStandardMaterial color={BASE} metalness={0.65} roughness={0.35} />
        </mesh>
        <mesh position={[0.24, 1.22, -0.38]} castShadow>
          <boxGeometry args={[0.08, 0.09, 0.54]} />
          <meshStandardMaterial color="#151820" metalness={0.88} roughness={0.18} />
        </mesh>
        <mesh position={[0.24, 1.14, -0.26]}>
          <boxGeometry args={[0.055, 0.16, 0.07]} />
          <meshStandardMaterial color="#101318" metalness={0.82} roughness={0.22} />
        </mesh>
        <mesh position={[0.28, 1.22, -0.38]}>
          <boxGeometry args={[0.006, 0.065, 0.44]} />
          <meshBasicMaterial color={color} transparent opacity={0.7} />
        </mesh>
        <Text position={[0, 2.52, 0]} fontSize={0.24} color="white" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="black">
          {data.username}
        </Text>
        <Text position={[0, 2.3, 0]} fontSize={0.17} color={color} anchorX="center" anchorY="middle" outlineWidth={0.015} outlineColor="black">
          {data.hp} HP
        </Text>
      </group>
    </group>
  );
};
