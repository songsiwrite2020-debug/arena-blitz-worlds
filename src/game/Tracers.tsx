import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export interface TracerData {
  id: string;
  origin: [number, number, number];
  end: [number, number, number];
  startTime: number;
}

export const Tracers = ({ tracers, onExpire }: { tracers: TracerData[]; onExpire: (id: string) => void }) => {
  return (
    <>
      {tracers.map((t) => <Tracer key={t.id} data={t} onExpire={() => onExpire(t.id)} />)}
    </>
  );
};

const Tracer = ({ data, onExpire }: { data: TracerData; onExpire: () => void }) => {
  const ref = useRef<THREE.Mesh>(null);
  const [opacity, setOpacity] = useState(1);

  useFrame(() => {
    const age = (performance.now() - data.startTime) / 1000;
    if (age > 0.4) { onExpire(); return; }
    setOpacity(1 - age / 0.4);
  });

  const start = new THREE.Vector3(...data.origin);
  const end = new THREE.Vector3(...data.end);
  const mid = start.clone().add(end).multiplyScalar(0.5);
  const dir = end.clone().sub(start);
  const len = dir.length();
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0), dir.normalize());

  return (
    <mesh ref={ref} position={mid} quaternion={quat}>
      <cylinderGeometry args={[0.03, 0.03, len, 6]} />
      <meshBasicMaterial color="#ffff66" transparent opacity={opacity} />
    </mesh>
  );
};
