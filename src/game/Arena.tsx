import { useMemo } from "react";
import * as THREE from "three";

export interface MapData {
  obstacles: { pos: [number, number, number]; size: [number, number, number]; color: string }[];
  size: number;
  floorColor: string;
  accentColor: string;
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
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI/2, 0, 0]} receiveShadow>
        <planeGeometry args={[map.size, map.size]} />
        <meshStandardMaterial color={map.floorColor} metalness={0.3} roughness={0.7} />
      </mesh>
      {/* Grid */}
      <gridHelper args={[map.size, map.size, map.accentColor, "#1a2540"]} position={[0, 0.01, 0]} />
      {/* Walls */}
      {[
        { pos: [0, 2, -half], size: [map.size, 4, 0.5] },
        { pos: [0, 2, half], size: [map.size, 4, 0.5] },
        { pos: [-half, 2, 0], size: [0.5, 4, map.size] },
        { pos: [half, 2, 0], size: [0.5, 4, map.size] },
      ].map((w, i) => (
        <mesh key={i} position={w.pos as any} castShadow receiveShadow>
          <boxGeometry args={w.size as any} />
          <meshStandardMaterial color={map.accentColor} emissive={map.accentColor} emissiveIntensity={0.4} metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
      {/* Obstacles */}
      {map.obstacles.map((o, i) => (
        <mesh key={i} position={o.pos} castShadow receiveShadow>
          <boxGeometry args={o.size} />
          <meshStandardMaterial color={o.color} metalness={0.4} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
};
