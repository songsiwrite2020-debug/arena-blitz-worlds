import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Weapon } from "./weapons";

interface Props {
  weapon: Weapon;
  fireFlash: number;
}

const MAT_DARK  = "#080a0e";
const MAT_METAL = "#1a1d26";
const MAT_GRIP  = "#0c0e14";

export const Viewmodel = ({ weapon, fireFlash }: Props) => {
  const { camera } = useThree();
  const group    = useRef<THREE.Group>(null);
  const flash    = useRef<THREE.PointLight>(null);
  const flashMesh = useRef<THREE.Mesh>(null);
  const swayX    = useRef(0);
  const swayY    = useRef(0);
  const prevCam  = useRef(new THREE.Vector3());

  const isMelee  = weapon.category === "melee";
  const isSide   = weapon.category === "sidearm";
  const isSmg    = weapon.category === "smg";
  const isRifle  = weapon.category === "rifle";
  const isHeavy  = weapon.category === "heavy";

  useFrame(() => {
    if (!group.current) return;
    camera.updateMatrixWorld();

    const offset = new THREE.Vector3(0.32, -0.28, -0.55);
    offset.applyQuaternion(camera.quaternion);
    group.current.position.copy(camera.position).add(offset);
    group.current.quaternion.copy(camera.quaternion);

    const vel = new THREE.Vector3().subVectors(camera.position, prevCam.current);
    prevCam.current.copy(camera.position);
    const dir   = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
    swayX.current += (-vel.dot(right) * 20 - swayX.current) * 0.09;
    swayY.current += (-vel.y * 14 - swayY.current) * 0.09;
    const swayVec = new THREE.Vector3(swayX.current * 0.006, swayY.current * 0.005, 0);
    swayVec.applyQuaternion(camera.quaternion);
    group.current.position.add(swayVec);

    const idleY = Math.sin(performance.now() * 0.0014) * 0.0018;
    group.current.position.y += idleY;

    const since = (performance.now() - fireFlash) / 1000;
    const kick  = since < 0.12 ? Math.max(0, 0.08 * (1 - since / 0.12)) : 0;
    const kickVec = isMelee
      ? new THREE.Vector3(0.01, -0.04, -kick * 1.6)
      : new THREE.Vector3(0, 0.022, kick);
    kickVec.applyQuaternion(camera.quaternion);
    group.current.position.add(kickVec);

    const flashIntensity = !isMelee && since < 0.06 ? (1 - since / 0.06) * 4 : 0;
    if (flash.current) flash.current.intensity = flashIntensity;
    if (flashMesh.current) {
      const s = flashIntensity > 0 ? 0.18 + Math.random() * 0.08 : 0.001;
      flashMesh.current.scale.setScalar(s);
      (flashMesh.current.material as THREE.MeshBasicMaterial).opacity = Math.min(1, flashIntensity / 2);
    }
  });

  /* ─── KNIFE / MELEE ─────────────────────────────────────────── */
  if (isMelee) return (
    <group ref={group} renderOrder={999}>
      <mesh position={[0, 0, 0.18]}>
        <boxGeometry args={[0.055, 0.055, 0.22]} />
        <meshStandardMaterial color="#1c1208" metalness={0.3} roughness={0.8} />
      </mesh>
      {([-0.06, -0.02, 0.02, 0.06] as number[]).map((dz, i) => (
        <mesh key={i} position={[0, 0, 0.18 + dz]}>
          <boxGeometry args={[0.058, 0.058, 0.018]} />
          <meshStandardMaterial color="#28180a" metalness={0.35} roughness={0.75} />
        </mesh>
      ))}
      <mesh position={[0, 0, 0.31]}>
        <boxGeometry args={[0.06, 0.06, 0.03]} />
        <meshStandardMaterial color="#555" metalness={0.88} roughness={0.22} />
      </mesh>
      <mesh position={[0, 0, 0.08]}>
        <boxGeometry args={[0.065, 0.065, 0.04]} />
        <meshStandardMaterial color="#555" metalness={0.88} roughness={0.22} />
      </mesh>
      <mesh position={[0, 0, 0.055]}>
        <boxGeometry args={[0.21, 0.02, 0.025]} />
        <meshStandardMaterial color="#666" metalness={0.9} roughness={0.18} />
      </mesh>
      <mesh position={[0, 0, -0.21]}>
        <boxGeometry args={[0.022, 0.006, 0.44]} />
        <meshStandardMaterial color="#c6d2e6" metalness={0.97} roughness={0.04} />
      </mesh>
      <mesh position={[-0.005, 0.001, -0.19]}>
        <boxGeometry args={[0.004, 0.002, 0.38]} />
        <meshStandardMaterial color="#9aaec4" metalness={0.9} roughness={0.15} />
      </mesh>
      <mesh position={[0, 0.005, -0.19]}>
        <boxGeometry args={[0.024, 0.002, 0.4]} />
        <meshBasicMaterial color={weapon.color} />
      </mesh>
    </group>
  );

  /* ─── SIDEARM ────────────────────────────────────────────────── */
  if (isSide) return (
    <group ref={group} renderOrder={999}>
      <mesh position={[0, 0.025, -0.24]}>
        <boxGeometry args={[0.07, 0.082, 0.36]} />
        <meshStandardMaterial color={MAT_METAL} metalness={0.88} roughness={0.24} />
      </mesh>
      {([0, 0.038, 0.076] as number[]).map((dz, i) => (
        <mesh key={i} position={[0.037, 0.025, -0.07 + dz]}>
          <boxGeometry args={[0.006, 0.088, 0.012]} />
          <meshStandardMaterial color={MAT_DARK} metalness={0.9} roughness={0.2} />
        </mesh>
      ))}
      <mesh position={[0, 0.074, -0.4]}>
        <boxGeometry args={[0.008, 0.022, 0.016]} />
        <meshStandardMaterial color={MAT_DARK} metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.074, -0.07]}>
        <boxGeometry args={[0.034, 0.022, 0.013]} />
        <meshStandardMaterial color={MAT_DARK} metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0, -0.018, -0.165]}>
        <boxGeometry args={[0.075, 0.07, 0.24]} />
        <meshStandardMaterial color="#131520" metalness={0.62} roughness={0.42} />
      </mesh>
      <mesh position={[0, -0.065, -0.06]}>
        <boxGeometry args={[0.065, 0.015, 0.13]} />
        <meshStandardMaterial color="#131520" metalness={0.62} roughness={0.42} />
      </mesh>
      <mesh position={[0, -0.148, 0.024]}>
        <boxGeometry args={[0.066, 0.19, 0.086]} />
        <meshStandardMaterial color={MAT_GRIP} metalness={0.38} roughness={0.72} />
      </mesh>
      {([-0.048, 0, 0.048] as number[]).map((dy, i) => (
        <mesh key={i} position={[0.035, -0.148 + dy, 0.025]}>
          <boxGeometry args={[0.004, 0.03, 0.084]} />
          <meshStandardMaterial color="#080a0e" metalness={0.3} roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 0.025, -0.49]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.14, 8]} />
        <meshStandardMaterial color={MAT_DARK} metalness={0.95} roughness={0.14} />
      </mesh>
      <mesh position={[0, 0.025, -0.575]}>
        <boxGeometry args={[0.034, 0.034, 0.024]} />
        <meshStandardMaterial color={MAT_DARK} metalness={0.96} roughness={0.1} />
      </mesh>
      <mesh position={[0.038, 0.025, -0.24]}>
        <boxGeometry args={[0.004, 0.065, 0.3]} />
        <meshBasicMaterial color={weapon.color} />
      </mesh>
      <pointLight ref={flash} position={[0, 0.025, -0.62]} color={weapon.color} intensity={0} distance={6} decay={2} />
      <mesh ref={flashMesh} position={[0, 0.025, -0.64]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color={weapon.color} transparent opacity={0} />
      </mesh>
    </group>
  );

  /* ─── SMG ────────────────────────────────────────────────────── */
  if (isSmg) return (
    <group ref={group} renderOrder={999}>
      <mesh position={[0, 0.032, -0.30]}>
        <boxGeometry args={[0.074, 0.076, 0.52]} />
        <meshStandardMaterial color={MAT_METAL} metalness={0.84} roughness={0.26} />
      </mesh>
      <mesh position={[0, 0.026, -0.44]}>
        <boxGeometry args={[0.086, 0.065, 0.26]} />
        <meshStandardMaterial color="#10121a" metalness={0.7} roughness={0.38} />
      </mesh>
      {([0.06, 0.12] as number[]).map((dz, i) => (
        <mesh key={i} position={[0.045, 0.026, -0.44 + dz]}>
          <boxGeometry args={[0.006, 0.04, 0.044]} />
          <meshStandardMaterial color={MAT_DARK} metalness={0.5} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, -0.026, -0.21]}>
        <boxGeometry args={[0.08, 0.068, 0.36]} />
        <meshStandardMaterial color="#121418" metalness={0.65} roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.065, -0.1]}>
        <boxGeometry args={[0.062, 0.044, 0.09]} />
        <meshStandardMaterial color="#141620" metalness={0.62} roughness={0.42} />
      </mesh>
      <mesh position={[0, -0.19, -0.1]}>
        <boxGeometry args={[0.054, 0.2, 0.08]} />
        <meshStandardMaterial color="#0d0f16" metalness={0.6} roughness={0.5} />
      </mesh>
      <mesh position={[0, -0.295, -0.1]}>
        <boxGeometry args={[0.058, 0.018, 0.084]} />
        <meshStandardMaterial color="#555" metalness={0.88} roughness={0.22} />
      </mesh>
      <mesh position={[0, -0.138, 0.075]}>
        <boxGeometry args={[0.065, 0.17, 0.082]} />
        <meshStandardMaterial color={MAT_GRIP} metalness={0.4} roughness={0.7} />
      </mesh>
      <mesh position={[0, -0.065, -0.0]}>
        <boxGeometry args={[0.065, 0.015, 0.14]} />
        <meshStandardMaterial color="#121418" metalness={0.65} roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.11, -0.46]}>
        <boxGeometry args={[0.058, 0.13, 0.066]} />
        <meshStandardMaterial color={MAT_GRIP} metalness={0.45} roughness={0.68} />
      </mesh>
      <mesh position={[0.043, 0.038, -0.09]}>
        <boxGeometry args={[0.02, 0.016, 0.055]} />
        <meshStandardMaterial color={MAT_DARK} metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.006, 0.18]}>
        <boxGeometry args={[0.068, 0.062, 0.09]} />
        <meshStandardMaterial color="#0e1018" metalness={0.62} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.032, -0.63]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.18, 8]} />
        <meshStandardMaterial color={MAT_DARK} metalness={0.95} roughness={0.12} />
      </mesh>
      <mesh position={[0, 0.074, -0.26]}>
        <boxGeometry args={[0.076, 0.01, 0.46]} />
        <meshBasicMaterial color={weapon.color} />
      </mesh>
      <mesh position={[0.041, 0.032, -0.38]}>
        <boxGeometry args={[0.004, 0.055, 0.3]} />
        <meshBasicMaterial color={weapon.color} transparent opacity={0.75} />
      </mesh>
      <pointLight ref={flash} position={[0, 0.032, -0.76]} color={weapon.color} intensity={0} distance={6} decay={2} />
      <mesh ref={flashMesh} position={[0, 0.032, -0.78]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color={weapon.color} transparent opacity={0} />
      </mesh>
    </group>
  );

  /* ─── RIFLE ──────────────────────────────────────────────────── */
  if (isRifle) return (
    <group ref={group} renderOrder={999}>
      {/* Upper receiver */}
      <mesh position={[0, 0.03, -0.32]}>
        <boxGeometry args={[0.074, 0.08, 0.56]} />
        <meshStandardMaterial color={MAT_METAL} metalness={0.85} roughness={0.25} />
      </mesh>
      {/* Flat-top rail */}
      <mesh position={[0, 0.078, -0.28]}>
        <boxGeometry args={[0.038, 0.014, 0.5]} />
        <meshStandardMaterial color={MAT_DARK} metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Handguard */}
      <mesh position={[0, 0.022, -0.56]}>
        <boxGeometry args={[0.086, 0.066, 0.3]} />
        <meshStandardMaterial color="#10121a" metalness={0.7} roughness={0.38} />
      </mesh>
      {/* Handguard vents */}
      {([0.04, 0.1, 0.16] as number[]).map((dz, i) => (
        <mesh key={i} position={[0.045, 0.022, -0.46 + dz]}>
          <boxGeometry args={[0.006, 0.042, 0.04]} />
          <meshStandardMaterial color={MAT_DARK} metalness={0.5} roughness={0.6} />
        </mesh>
      ))}
      {/* Lower receiver */}
      <mesh position={[0, -0.024, -0.22]}>
        <boxGeometry args={[0.08, 0.066, 0.36]} />
        <meshStandardMaterial color="#111318" metalness={0.65} roughness={0.4} />
      </mesh>
      {/* Mag well */}
      <mesh position={[0, -0.068, -0.12]}>
        <boxGeometry args={[0.064, 0.042, 0.09]} />
        <meshStandardMaterial color="#13151e" metalness={0.62} roughness={0.42} />
      </mesh>
      {/* Magazine */}
      <mesh position={[0, -0.205, -0.11]}>
        <boxGeometry args={[0.056, 0.22, 0.074]} />
        <meshStandardMaterial color="#0c0e16" metalness={0.6} roughness={0.5} />
      </mesh>
      <mesh position={[0, -0.32, -0.10]}>
        <boxGeometry args={[0.06, 0.02, 0.078]} />
        <meshStandardMaterial color="#555" metalness={0.88} roughness={0.22} />
      </mesh>
      {/* Grip */}
      <mesh position={[0, -0.13, 0.06]}>
        <boxGeometry args={[0.064, 0.17, 0.082]} />
        <meshStandardMaterial color={MAT_GRIP} metalness={0.4} roughness={0.7} />
      </mesh>
      {/* Trigger guard */}
      <mesh position={[0, -0.065, -0.01]}>
        <boxGeometry args={[0.064, 0.014, 0.14]} />
        <meshStandardMaterial color="#111318" metalness={0.65} roughness={0.4} />
      </mesh>
      {/* Charging handle */}
      <mesh position={[0.042, 0.036, -0.1]}>
        <boxGeometry args={[0.018, 0.015, 0.048]} />
        <meshStandardMaterial color={MAT_DARK} metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Collapsible stock */}
      <mesh position={[0, 0.014, 0.12]}>
        <boxGeometry args={[0.058, 0.072, 0.22]} />
        <meshStandardMaterial color="#0d0f1a" metalness={0.62} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.014, 0.26]}>
        <boxGeometry args={[0.046, 0.088, 0.055]} />
        <meshStandardMaterial color="#0a0c14" metalness={0.65} roughness={0.48} />
      </mesh>
      {/* Barrel */}
      <mesh position={[0, 0.03, -0.71]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.28, 8]} />
        <meshStandardMaterial color={MAT_DARK} metalness={0.95} roughness={0.12} />
      </mesh>
      {/* Muzzle compensator */}
      <mesh position={[0, 0.03, -0.86]}>
        <boxGeometry args={[0.03, 0.03, 0.04]} />
        <meshStandardMaterial color={MAT_DARK} metalness={0.95} roughness={0.12} />
      </mesh>
      {/* Red dot sight */}
      <mesh position={[0, 0.099, -0.31]}>
        <boxGeometry args={[0.03, 0.032, 0.065]} />
        <meshStandardMaterial color="#090b10" metalness={0.88} roughness={0.22} />
      </mesh>
      <mesh position={[0, 0.099, -0.278]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.018, 12]} />
        <meshBasicMaterial color={weapon.color} transparent opacity={0.6} />
      </mesh>
      {/* Accent glow top */}
      <mesh position={[0, 0.084, -0.28]}>
        <boxGeometry args={[0.04, 0.006, 0.48]} />
        <meshBasicMaterial color={weapon.color} />
      </mesh>
      {/* Accent glow side */}
      <mesh position={[0.042, 0.03, -0.44]}>
        <boxGeometry args={[0.004, 0.054, 0.34]} />
        <meshBasicMaterial color={weapon.color} transparent opacity={0.75} />
      </mesh>
      <pointLight ref={flash} position={[0, 0.03, -0.9]} color={weapon.color} intensity={0} distance={6} decay={2} />
      <mesh ref={flashMesh} position={[0, 0.03, -0.92]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color={weapon.color} transparent opacity={0} />
      </mesh>
    </group>
  );

  /* ─── HEAVY ──────────────────────────────────────────────────── */
  if (isHeavy) return (
    <group ref={group} renderOrder={999}>
      {/* Boxy receiver */}
      <mesh position={[0, 0.028, -0.26]}>
        <boxGeometry args={[0.088, 0.094, 0.48]} />
        <meshStandardMaterial color={MAT_METAL} metalness={0.82} roughness={0.28} />
      </mesh>
      {/* Side port cover */}
      <mesh position={[0.048, 0.028, -0.21]}>
        <boxGeometry args={[0.008, 0.07, 0.22]} />
        <meshStandardMaterial color="#090b12" metalness={0.88} roughness={0.2} />
      </mesh>
      {/* Handguard */}
      <mesh position={[0, 0.02, -0.5]}>
        <boxGeometry args={[0.096, 0.075, 0.22]} />
        <meshStandardMaterial color="#0f1118" metalness={0.72} roughness={0.36} />
      </mesh>
      {/* Handguard vents */}
      {([0, 0.06, 0.12] as number[]).map((dz, i) => (
        <mesh key={i} position={[0.05, 0.02, -0.45 + dz]}>
          <boxGeometry args={[0.006, 0.05, 0.04]} />
          <meshStandardMaterial color={MAT_DARK} metalness={0.5} roughness={0.6} />
        </mesh>
      ))}
      {/* Under-barrel tube magazine */}
      <mesh position={[0, -0.068, -0.42]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 0.48, 8]} />
        <meshStandardMaterial color="#090b10" metalness={0.85} roughness={0.2} />
      </mesh>
      <mesh position={[0, -0.068, -0.68]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.026, 0.026, 0.018, 8]} />
        <meshStandardMaterial color="#555" metalness={0.88} roughness={0.22} />
      </mesh>
      {/* Lower receiver */}
      <mesh position={[0, -0.022, -0.19]}>
        <boxGeometry args={[0.084, 0.068, 0.3]} />
        <meshStandardMaterial color="#10121c" metalness={0.65} roughness={0.4} />
      </mesh>
      {/* Grip */}
      <mesh position={[0, -0.128, 0.06]}>
        <boxGeometry args={[0.068, 0.165, 0.086]} />
        <meshStandardMaterial color={MAT_GRIP} metalness={0.42} roughness={0.68} />
      </mesh>
      {/* Trigger guard */}
      <mesh position={[0, -0.062, -0.02]}>
        <boxGeometry args={[0.066, 0.014, 0.13]} />
        <meshStandardMaterial color="#10121c" metalness={0.65} roughness={0.4} />
      </mesh>
      {/* Stock */}
      <mesh position={[0, 0.01, 0.13]}>
        <boxGeometry args={[0.066, 0.082, 0.21]} />
        <meshStandardMaterial color="#0e101a" metalness={0.62} roughness={0.52} />
      </mesh>
      <mesh position={[0, 0.01, 0.25]}>
        <boxGeometry args={[0.054, 0.096, 0.06]} />
        <meshStandardMaterial color="#0a0c14" metalness={0.6} roughness={0.55} />
      </mesh>
      {/* Thick barrel */}
      <mesh position={[0, 0.028, -0.57]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.028, 0.2, 8]} />
        <meshStandardMaterial color={MAT_DARK} metalness={0.95} roughness={0.1} />
      </mesh>
      <mesh position={[0, 0.028, -0.68]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.034, 0.032, 0.022, 8]} />
        <meshStandardMaterial color={MAT_DARK} metalness={0.95} roughness={0.1} />
      </mesh>
      {/* Foregrip */}
      <mesh position={[0, -0.1, -0.52]}>
        <boxGeometry args={[0.058, 0.13, 0.066]} />
        <meshStandardMaterial color={MAT_GRIP} metalness={0.45} roughness={0.68} />
      </mesh>
      {/* Accent glow top */}
      <mesh position={[0, 0.077, -0.25]}>
        <boxGeometry args={[0.09, 0.01, 0.44]} />
        <meshBasicMaterial color={weapon.color} />
      </mesh>
      {/* Accent glow side */}
      <mesh position={[0.046, 0.028, -0.34]}>
        <boxGeometry args={[0.004, 0.078, 0.32]} />
        <meshBasicMaterial color={weapon.color} transparent opacity={0.75} />
      </mesh>
      <pointLight ref={flash} position={[0, 0.028, -0.71]} color={weapon.color} intensity={0} distance={7} decay={2} />
      <mesh ref={flashMesh} position={[0, 0.028, -0.73]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color={weapon.color} transparent opacity={0} />
      </mesh>
    </group>
  );

  /* ─── SNIPER (default) ───────────────────────────────────────── */
  return (
    <group ref={group} renderOrder={999}>
      <mesh position={[0, 0.025, -0.36]}>
        <boxGeometry args={[0.074, 0.088, 0.42]} />
        <meshStandardMaterial color={MAT_METAL} metalness={0.87} roughness={0.23} />
      </mesh>
      <mesh position={[0, 0.018, -0.7]}>
        <boxGeometry args={[0.064, 0.072, 0.36]} />
        <meshStandardMaterial color="#10121e" metalness={0.72} roughness={0.36} />
      </mesh>
      <mesh position={[0, 0.025, -0.62]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.026, 0.026, 0.22, 8]} />
        <meshStandardMaterial color="#090b10" metalness={0.95} roughness={0.1} />
      </mesh>
      <mesh position={[0, 0.025, -0.87]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.36, 8]} />
        <meshStandardMaterial color={MAT_DARK} metalness={0.96} roughness={0.08} />
      </mesh>
      <mesh position={[0, 0.025, -1.07]}>
        <boxGeometry args={[0.036, 0.036, 0.07]} />
        <meshStandardMaterial color={MAT_DARK} metalness={0.96} roughness={0.1} />
      </mesh>
      {([-0.015, 0.015] as number[]).map((dy, i) => (
        <mesh key={i} position={[0.02, 0.025 + dy, -1.07]}>
          <boxGeometry args={[0.005, 0.01, 0.074]} />
          <meshStandardMaterial color={MAT_DARK} metalness={0.9} roughness={0.2} />
        </mesh>
      ))}
      <mesh position={[0, 0.077, -0.4]}>
        <boxGeometry args={[0.024, 0.014, 0.34]} />
        <meshStandardMaterial color="#090b10" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.123, -0.42]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.038, 0.038, 0.28, 12]} />
        <meshStandardMaterial color="#030406" metalness={0.92} roughness={0.18} />
      </mesh>
      <mesh position={[0, 0.123, -0.27]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.04, 0.06, 12]} />
        <meshStandardMaterial color="#030406" metalness={0.92} roughness={0.18} />
      </mesh>
      <mesh position={[0, 0.123, -0.58]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.046, 0.038, 0.055, 12]} />
        <meshStandardMaterial color="#030406" metalness={0.92} roughness={0.18} />
      </mesh>
      <mesh position={[0, 0.123, -0.242]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.036, 16]} />
        <meshBasicMaterial color={weapon.color} transparent opacity={0.55} />
      </mesh>
      <mesh position={[0.068, 0.025, -0.31]}>
        <boxGeometry args={[0.065, 0.016, 0.016]} />
        <meshStandardMaterial color={MAT_DARK} metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0.102, 0.025, -0.31]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.014, 0.014, 0.026, 8]} />
        <meshStandardMaterial color="#444" metalness={0.88} roughness={0.22} />
      </mesh>
      <mesh position={[0, -0.115, -0.17]}>
        <boxGeometry args={[0.064, 0.165, 0.09]} />
        <meshStandardMaterial color={MAT_GRIP} metalness={0.4} roughness={0.7} />
      </mesh>
      <mesh position={[0, -0.062, -0.1]}>
        <boxGeometry args={[0.062, 0.015, 0.12]} />
        <meshStandardMaterial color="#12141c" metalness={0.65} roughness={0.42} />
      </mesh>
      <mesh position={[0, 0.01, 0.1]}>
        <boxGeometry args={[0.057, 0.074, 0.15]} />
        <meshStandardMaterial color="#0d0f1a" metalness={0.62} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.058, 0.06]}>
        <boxGeometry args={[0.044, 0.038, 0.1]} />
        <meshStandardMaterial color="#0d0f1a" metalness={0.58} roughness={0.55} />
      </mesh>
      <mesh position={[-0.05, -0.06, -0.72]} rotation={[0.38, 0, 0.08]}>
        <cylinderGeometry args={[0.007, 0.005, 0.13, 6]} />
        <meshStandardMaterial color={MAT_DARK} metalness={0.82} roughness={0.28} />
      </mesh>
      <mesh position={[0.05, -0.06, -0.72]} rotation={[0.38, 0, -0.08]}>
        <cylinderGeometry args={[0.007, 0.005, 0.13, 6]} />
        <meshStandardMaterial color={MAT_DARK} metalness={0.82} roughness={0.28} />
      </mesh>
      <mesh position={[0, 0.077, -0.38]}>
        <boxGeometry args={[0.026, 0.008, 0.32]} />
        <meshBasicMaterial color={weapon.color} />
      </mesh>
      <mesh position={[0.04, 0.025, -0.48]}>
        <boxGeometry args={[0.004, 0.072, 0.38]} />
        <meshBasicMaterial color={weapon.color} transparent opacity={0.7} />
      </mesh>
      <pointLight ref={flash} position={[0, 0.025, -1.12]} color={weapon.color} intensity={0} distance={7} decay={2} />
      <mesh ref={flashMesh} position={[0, 0.025, -1.14]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color={weapon.color} transparent opacity={0} />
      </mesh>
    </group>
  );
};
