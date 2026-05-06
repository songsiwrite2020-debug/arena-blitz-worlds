import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Weapon } from "./weapons";

interface Props {
  weapon: Weapon;
  fireFlash: number; // performance.now() of last shot
}

// Renders a low-poly weapon attached to camera with recoil + muzzle flash
export const Viewmodel = ({ weapon, fireFlash }: Props) => {
  const { camera } = useThree();
  const group = useRef<THREE.Group>(null);
  const flash = useRef<THREE.PointLight>(null);
  const flashMesh = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!group.current) return;
    // Attach to camera
    camera.updateMatrixWorld();
    const offset = new THREE.Vector3(0.32, -0.28, -0.55);
    offset.applyQuaternion(camera.quaternion);
    group.current.position.copy(camera.position).add(offset);
    group.current.quaternion.copy(camera.quaternion);

    // recoil kick
    const since = (performance.now() - fireFlash) / 1000;
    const kick = since < 0.12 ? Math.max(0, 0.08 * (1 - since / 0.12)) : 0;
    const kickOffset = new THREE.Vector3(0, 0.02, kick);
    kickOffset.applyQuaternion(camera.quaternion);
    group.current.position.add(kickOffset);

    // muzzle flash fade
    const flashLife = since;
    const intensity = flashLife < 0.06 ? (1 - flashLife / 0.06) * 4 : 0;
    if (flash.current) flash.current.intensity = intensity;
    if (flashMesh.current) {
      const s = intensity > 0 ? 0.18 + Math.random() * 0.08 : 0.001;
      flashMesh.current.scale.setScalar(s);
      (flashMesh.current.material as THREE.MeshBasicMaterial).opacity = Math.min(1, intensity / 2);
    }
  });

  // Different shapes per weapon
  const isSniper = weapon.id === "sniper";
  const isSmg = weapon.id === "smg";
  const bodyLen = isSniper ? 1.0 : isSmg ? 0.5 : 0.35;
  const bodyColor = "#1a1d24";

  return (
    <group ref={group} renderOrder={999}>
      {/* Body */}
      <mesh position={[0, 0, -bodyLen / 2 - 0.05]}>
        <boxGeometry args={[0.08, 0.12, bodyLen]} />
        <meshStandardMaterial color={bodyColor} metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Grip */}
      <mesh position={[0, -0.12, 0]}>
        <boxGeometry args={[0.07, 0.16, 0.1]} />
        <meshStandardMaterial color="#0a0c10" metalness={0.5} roughness={0.6} />
      </mesh>
      {/* Barrel */}
      <mesh position={[0, 0.02, -bodyLen - 0.1]}>
        <cylinderGeometry args={[0.025, 0.025, 0.18, 8]} />
        <meshStandardMaterial color="#080a0e" metalness={0.9} roughness={0.2} />
        <group rotation={[Math.PI / 2, 0, 0]} />
      </mesh>
      {/* Accent strip glow */}
      <mesh position={[0, 0.07, -bodyLen / 2 - 0.05]}>
        <boxGeometry args={[0.082, 0.015, bodyLen * 0.7]} />
        <meshBasicMaterial color={weapon.color} />
      </mesh>
      {/* Scope for sniper */}
      {isSniper && (
        <mesh position={[0, 0.1, -0.3]}>
          <cylinderGeometry args={[0.045, 0.045, 0.25, 12]} />
          <meshStandardMaterial color="#000" metalness={0.9} roughness={0.2} />
        </mesh>
      )}
      {/* Muzzle flash */}
      <pointLight ref={flash} position={[0, 0.02, -bodyLen - 0.2]} color={weapon.color} intensity={0} distance={6} decay={2} />
      <mesh ref={flashMesh} position={[0, 0.02, -bodyLen - 0.22]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color={weapon.color} transparent opacity={0} />
      </mesh>
    </group>
  );
};
