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

export const RemotePlayer = ({ data }: { data: RemotePlayerData }) => {
  const group = useRef<THREE.Group>(null);
  const target = useRef(new THREE.Vector3(...data.pos));
  const targetRot = useRef(data.rotY);

  useFrame((_, delta) => {
    if (!group.current) return;
    target.current.set(data.pos[0], data.pos[1] - 1.7, data.pos[2]);
    targetRot.current = data.rotY;
    group.current.position.lerp(target.current, Math.min(1, delta * 12));
    group.current.rotation.y += (targetRot.current - group.current.rotation.y) * Math.min(1, delta * 12);
  });

  const color = data.hp > 50 ? "#00ff88" : data.hp > 20 ? "#ffaa00" : "#ff3333";

  return (
    <group ref={group} position={data.pos}>
      {/* Body */}
      <mesh position={[0, 1, 0]} castShadow>
        <capsuleGeometry args={[0.4, 1.2, 4, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.9, 0]} castShadow>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color="#ffffff" emissive={color} emissiveIntensity={0.3} />
      </mesh>
      {/* Forward indicator (gun) */}
      <mesh position={[0.2, 1.2, -0.4]} castShadow>
        <boxGeometry args={[0.1, 0.1, 0.6]} />
        <meshStandardMaterial color="#222" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Name + HP */}
      <Text position={[0, 2.5, 0]} fontSize={0.25} color="white" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="black">
        {data.username}
      </Text>
      <Text position={[0, 2.25, 0]} fontSize={0.18} color={color} anchorX="center" anchorY="middle" outlineWidth={0.015} outlineColor="black">
        {data.hp} HP
      </Text>
    </group>
  );
};
