import { useMemo } from "react";
import * as THREE from "three";

export interface MapData {
  obstacles: { pos: [number, number, number]; size: [number, number, number]; color: string }[];
  size: number;
  floorColor: string;
  accentColor: string;
  sites?: { name: "A" | "B"; pos: [number, number] }[];
  spawns?: { team: "attack" | "defense"; pos: [number, number, number] }[];
}

export const MAPS: Record<string, MapData> = {
  "arena-1": {
    size: 50,
    floorColor: "#0a0f1a",
    accentColor: "#00ff88",
    obstacles: [
      { pos: [0, 1.5, 0], size: [4, 3, 4], color: "#1a2540" },
      { pos: [-10, 1, -10], size: [3, 2, 3], color: "#1a2540" },
      { pos: [10, 1, -10], size: [3, 2, 3], color: "#1a2540" },
      { pos: [-10, 1, 10], size: [3, 2, 3], color: "#1a2540" },
      { pos: [10, 1, 10], size: [3, 2, 3], color: "#1a2540" },
      { pos: [-15, 0.75, 0], size: [2, 1.5, 6], color: "#1a2540" },
      { pos: [15, 0.75, 0], size: [2, 1.5, 6], color: "#1a2540" },
      { pos: [0, 0.75, -18], size: [8, 1.5, 2], color: "#1a2540" },
      { pos: [0, 0.75, 18], size: [8, 1.5, 2], color: "#1a2540" },
    ],
  },
  "arena-2": {
    size: 40,
    floorColor: "#1a0a0a",
    accentColor: "#ff4422",
    obstacles: [
      { pos: [-6, 1, -6], size: [4, 2, 2], color: "#3a1010" },
      { pos: [6, 1, -6], size: [4, 2, 2], color: "#3a1010" },
      { pos: [-6, 1, 6], size: [4, 2, 2], color: "#3a1010" },
      { pos: [6, 1, 6], size: [4, 2, 2], color: "#3a1010" },
      { pos: [0, 1.5, 0], size: [2, 3, 2], color: "#3a1010" },
      { pos: [-12, 1, 0], size: [2, 2, 8], color: "#3a1010" },
      { pos: [12, 1, 0], size: [2, 2, 8], color: "#3a1010" },
    ],
  },
  "arena-3": {
    size: 60,
    floorColor: "#0a0a1f",
    accentColor: "#aa66ff",
    obstacles: [
      { pos: [0, 2, 0], size: [6, 4, 6], color: "#1a1438" },
      { pos: [-18, 1, -18], size: [4, 2, 4], color: "#1a1438" },
      { pos: [18, 1, -18], size: [4, 2, 4], color: "#1a1438" },
      { pos: [-18, 1, 18], size: [4, 2, 4], color: "#1a1438" },
      { pos: [18, 1, 18], size: [4, 2, 4], color: "#1a1438" },
      { pos: [-22, 0.5, 0], size: [2, 1, 12], color: "#1a1438" },
      { pos: [22, 0.5, 0], size: [2, 1, 12], color: "#1a1438" },
      { pos: [0, 0.5, -22], size: [12, 1, 2], color: "#1a1438" },
      { pos: [0, 0.5, 22], size: [12, 1, 2], color: "#1a1438" },
      { pos: [-10, 3, 0], size: [3, 6, 3], color: "#1a1438" },
      { pos: [10, 3, 0], size: [3, 6, 3], color: "#1a1438" },
    ],
  },
  "haven": {
    size: 70,
    floorColor: "#1a1408",
    accentColor: "#ffaa33",
    sites: [
      { name: "A", pos: [-22, -18] },
      { name: "B", pos: [22, 18] },
    ],
    spawns: [
      { team: "attack", pos: [-30, 1.7, 30] },
      { team: "attack", pos: [-26, 1.7, 30] },
      { team: "attack", pos: [-22, 1.7, 30] },
      { team: "attack", pos: [-18, 1.7, 30] },
      { team: "attack", pos: [-14, 1.7, 30] },
      { team: "defense", pos: [30, 1.7, -30] },
      { team: "defense", pos: [26, 1.7, -30] },
      { team: "defense", pos: [22, 1.7, -30] },
      { team: "defense", pos: [18, 1.7, -30] },
      { team: "defense", pos: [14, 1.7, -30] },
    ],
    obstacles: [
      // Mid divider
      { pos: [0, 1.5, 0], size: [3, 3, 14], color: "#3a2a14" },
      { pos: [-6, 1, -2], size: [3, 2, 3], color: "#3a2a14" },
      { pos: [6, 1, 2], size: [3, 2, 3], color: "#3a2a14" },
      // A site (bottom-left)
      { pos: [-22, 0.6, -18], size: [6, 1.2, 6], color: "#5c3a18" },
      { pos: [-18, 1, -14], size: [2, 2, 2], color: "#3a2a14" },
      { pos: [-26, 1.5, -22], size: [2, 3, 2], color: "#3a2a14" },
      { pos: [-22, 1, -10], size: [4, 2, 1], color: "#3a2a14" },
      { pos: [-30, 1, -18], size: [1, 2, 4], color: "#3a2a14" },
      // B site (top-right)
      { pos: [22, 0.6, 18], size: [6, 1.2, 6], color: "#5c3a18" },
      { pos: [18, 1, 14], size: [2, 2, 2], color: "#3a2a14" },
      { pos: [26, 1.5, 22], size: [2, 3, 2], color: "#3a2a14" },
      { pos: [22, 1, 10], size: [4, 2, 1], color: "#3a2a14" },
      { pos: [30, 1, 18], size: [1, 2, 4], color: "#3a2a14" },
      // A long corridor walls
      { pos: [-12, 2, -25], size: [10, 4, 0.5], color: "#2a1f10" },
      { pos: [-12, 2, -10], size: [10, 4, 0.5], color: "#2a1f10" },
      // B long corridor walls
      { pos: [12, 2, 25], size: [10, 4, 0.5], color: "#2a1f10" },
      { pos: [12, 2, 10], size: [10, 4, 0.5], color: "#2a1f10" },
      // Mid pillars
      { pos: [0, 2, -10], size: [1.5, 4, 1.5], color: "#3a2a14" },
      { pos: [0, 2, 10], size: [1.5, 4, 1.5], color: "#3a2a14" },
    ],
  },
};

export const useArenaObstacles = (mapId: string) => {
  return useMemo(() => {
    const map = MAPS[mapId] ?? MAPS["arena-1"];
    return map.obstacles.map(o => new THREE.Box3(
      new THREE.Vector3(o.pos[0] - o.size[0]/2, o.pos[1] - o.size[1]/2, o.pos[2] - o.size[2]/2),
      new THREE.Vector3(o.pos[0] + o.size[0]/2, o.pos[1] + o.size[1]/2, o.pos[2] + o.size[2]/2),
    ));
  }, [mapId]);
};

export const Arena = ({ mapId }: { mapId: string }) => {
  const map = MAPS[mapId] ?? MAPS["arena-1"];
  const half = map.size / 2;
  const ceilH = 8;

  const ceilLightPositions: [number, number][] = [
    [-half * 0.45, -half * 0.45],
    [ half * 0.45, -half * 0.45],
    [-half * 0.45,  half * 0.45],
    [ half * 0.45,  half * 0.45],
  ];

  return (
    <group>
      {/* Floor — highly polished, shows environment reflections */}
      <mesh rotation={[-Math.PI/2, 0, 0]} receiveShadow>
        <planeGeometry args={[map.size, map.size]} />
        <meshStandardMaterial color={map.floorColor} metalness={0.92} roughness={0.12} envMapIntensity={1.4} />
      </mesh>

      {/* Floor grid */}
      <gridHelper args={[map.size, 24, map.accentColor, "#252c44"]} position={[0, 0.01, 0]} />

      {/* Floor center ring */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[2.8, 2.95, 48]} />
        <meshBasicMaterial color={map.accentColor} transparent opacity={0.55} />
      </mesh>
      {/* Floor cross lines */}
      <mesh position={[0, 0.015, 0]}>
        <boxGeometry args={[map.size * 0.65, 0.01, 0.07]} />
        <meshBasicMaterial color={map.accentColor} transparent opacity={0.16} />
      </mesh>
      <mesh position={[0, 0.015, 0]}>
        <boxGeometry args={[0.07, 0.01, map.size * 0.65]} />
        <meshBasicMaterial color={map.accentColor} transparent opacity={0.16} />
      </mesh>

      {/* Ceiling */}
      <mesh position={[0, ceilH, 0]} rotation={[Math.PI/2, 0, 0]}>
        <planeGeometry args={[map.size, map.size]} />
        <meshStandardMaterial color="#040608" side={THREE.BackSide} metalness={0.1} roughness={1} />
      </mesh>

      {/* Ceiling light panels + point lights */}
      {ceilLightPositions.map(([x, z], i) => (
        <group key={i} position={[x, ceilH - 0.12, z]}>
          <mesh>
            <boxGeometry args={[1.8, 0.06, 1.8]} />
            <meshBasicMaterial color={map.accentColor} transparent opacity={0.7} />
          </mesh>
          <pointLight position={[0, -0.5, 0]} intensity={3.0} color={map.accentColor} distance={28} decay={2} />
        </group>
      ))}

      {/* Center ceiling cluster */}
      <group position={[0, ceilH - 0.12, 0]}>
        <mesh>
          <boxGeometry args={[3.2, 0.06, 3.2]} />
          <meshBasicMaterial color={map.accentColor} transparent opacity={0.55} />
        </mesh>
        <mesh>
          <boxGeometry args={[0.5, 0.06, 3.4]} />
          <meshBasicMaterial color={map.accentColor} transparent opacity={0.4} />
        </mesh>
        <mesh>
          <boxGeometry args={[3.4, 0.06, 0.5]} />
          <meshBasicMaterial color={map.accentColor} transparent opacity={0.4} />
        </mesh>
        <pointLight position={[0, -0.5, 0]} intensity={4.0} color={map.accentColor} distance={35} decay={2} />
      </group>

      {/* Boundary walls — full floor-to-ceiling height */}
      {([
        { pos: [0, ceilH/2, -half] as [number,number,number], size: [map.size, ceilH, 0.5] as [number,number,number] },
        { pos: [0, ceilH/2,  half] as [number,number,number], size: [map.size, ceilH, 0.5] as [number,number,number] },
        { pos: [-half, ceilH/2, 0] as [number,number,number], size: [0.5, ceilH, map.size] as [number,number,number] },
        { pos: [ half, ceilH/2, 0] as [number,number,number], size: [0.5, ceilH, map.size] as [number,number,number] },
      ]).map((w, i) => (
        <mesh key={i} position={w.pos} castShadow receiveShadow>
          <boxGeometry args={w.size} />
          <meshStandardMaterial color={map.accentColor} emissive={map.accentColor} emissiveIntensity={0.3} metalness={0.7} roughness={0.25} />
        </mesh>
      ))}

      {/* Wall base glow strips */}
      {([
        { pos: [0, 0.04, -half + 0.28] as [number,number,number], size: [map.size, 0.07, 0.12] as [number,number,number] },
        { pos: [0, 0.04,  half - 0.28] as [number,number,number], size: [map.size, 0.07, 0.12] as [number,number,number] },
        { pos: [-half + 0.28, 0.04, 0] as [number,number,number], size: [0.12, 0.07, map.size] as [number,number,number] },
        { pos: [ half - 0.28, 0.04, 0] as [number,number,number], size: [0.12, 0.07, map.size] as [number,number,number] },
      ]).map((s, i) => (
        <mesh key={i} position={s.pos}>
          <boxGeometry args={s.size} />
          <meshBasicMaterial color={map.accentColor} />
        </mesh>
      ))}

      {/* Mid-wall horizontal strips */}
      {([
        { pos: [0, 4, -half + 0.27] as [number,number,number], size: [map.size - 0.6, 0.05, 0.1] as [number,number,number] },
        { pos: [0, 4,  half - 0.27] as [number,number,number], size: [map.size - 0.6, 0.05, 0.1] as [number,number,number] },
        { pos: [-half + 0.27, 4, 0] as [number,number,number], size: [0.1, 0.05, map.size - 0.6] as [number,number,number] },
        { pos: [ half - 0.27, 4, 0] as [number,number,number], size: [0.1, 0.05, map.size - 0.6] as [number,number,number] },
      ]).map((s, i) => (
        <mesh key={i} position={s.pos}>
          <boxGeometry args={s.size} />
          <meshBasicMaterial color={map.accentColor} transparent opacity={0.65} />
        </mesh>
      ))}

      {/* Obstacles */}
      {map.obstacles.map((o, i) => (
        <group key={i}>
          {/* Body */}
          <mesh position={o.pos} castShadow receiveShadow>
            <boxGeometry args={o.size} />
            <meshStandardMaterial color={o.color} emissive={o.color} emissiveIntensity={0.12} metalness={0.55} roughness={0.38} />
          </mesh>
          {/* Glowing top cap */}
          <mesh position={[o.pos[0], o.pos[1] + o.size[1]/2 + 0.03, o.pos[2]]}>
            <boxGeometry args={[o.size[0] + 0.06, 0.05, o.size[2] + 0.06]} />
            <meshBasicMaterial color={map.accentColor} transparent opacity={0.6} />
          </mesh>
          {/* Base glow */}
          <mesh position={[o.pos[0], 0.03, o.pos[2]]}>
            <boxGeometry args={[o.size[0] + 0.04, 0.04, o.size[2] + 0.04]} />
            <meshBasicMaterial color={map.accentColor} transparent opacity={0.2} />
          </mesh>
        </group>
      ))}

      {/* Bomb sites */}
      {map.sites?.map((s) => (
        <group key={s.name} position={[s.pos[0], 0.02, s.pos[1]]}>
          <mesh rotation={[-Math.PI/2, 0, 0]}>
            <ringGeometry args={[2.6, 3, 32]} />
            <meshBasicMaterial color={map.accentColor} transparent opacity={0.7} />
          </mesh>
          <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.05, 0]}>
            <circleGeometry args={[2.6, 32]} />
            <meshBasicMaterial color={map.accentColor} transparent opacity={0.08} />
          </mesh>
        </group>
      ))}
    </group>
  );
};
