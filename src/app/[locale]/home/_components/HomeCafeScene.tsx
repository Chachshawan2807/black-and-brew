'use client';

import { Billboard, OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { CanvasTexture, SRGBColorSpace } from 'three';
import { useEffect, useMemo } from 'react';
import type { HomeSceneZoneId } from '@/lib/home-scene-zones';

type HomeCafeSceneProps = {
  counts: Record<HomeSceneZoneId, number>;
  onSelectZone: (zone: HomeSceneZoneId) => void;
};

type Vec3 = [number, number, number];

function CounterBlock({
  position,
  size,
  color,
  roughness = 0.72,
}: {
  position: Vec3;
  size: Vec3;
  color: string;
  roughness?: number;
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={roughness} />
    </mesh>
  );
}

function Countertop() {
  return (
    <group>
      <CounterBlock position={[0, 0.52, -1.05]} size={[7.3, 1.02, 1.35]} color="#d7c6af" />
      <CounterBlock position={[0, 1.08, -1.05]} size={[7.48, 0.12, 1.48]} color="#896044" roughness={0.5} />
      <CounterBlock position={[0, 0.25, -0.34]} size={[7.16, 0.15, 0.12]} color="#79553e" />
      {[-2.55, -0.85, 0.85, 2.55].map((x) => (
        <CounterBlock key={x} position={[x, 0.51, -0.34]} size={[0.035, 0.72, 0.025]} color="#b39679" />
      ))}
      <CounterBlock position={[0, 0.5, -1.82]} size={[7.2, 0.9, 0.08]} color="#c8b398" />
      {[-2.7, -0.9, 0.9, 2.7].map((x) => (
        <CounterBlock key={x} position={[x, 0.5, -1.75]} size={[0.035, 0.72, 0.03]} color="#a98b6e" />
      ))}
    </group>
  );
}

function EspressoMachine() {
  return (
    <group position={[0, 1.19, -1.2]}>
      <CounterBlock position={[0, 0.46, 0]} size={[1.8, 0.88, 0.8]} color="#d9ded9" roughness={0.36} />
      <CounterBlock position={[0, 0.95, -0.01]} size={[1.72, 0.12, 0.74]} color="#bcc7c2" roughness={0.4} />
      <CounterBlock position={[0, 0.63, 0.415]} size={[1.55, 0.22, 0.035]} color="#34413d" roughness={0.3} />
      {[-0.5, 0, 0.5].map((x) => (
        <group key={x} position={[x, 0.34, 0.47]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.09, 0.09, 0.18, 16]} />
            <meshStandardMaterial color="#aebbb5" metalness={0.48} roughness={0.35} />
          </mesh>
          <mesh position={[0.16, -0.08, 0]} rotation={[0, 0, -0.82]}>
            <cylinderGeometry args={[0.025, 0.025, 0.34, 10]} />
            <meshStandardMaterial color="#6b7771" metalness={0.5} roughness={0.35} />
          </mesh>
        </group>
      ))}
      <CounterBlock position={[-0.72, 0.58, 0.44]} size={[0.06, 0.14, 0.05]} color="#9b7356" />
      <CounterBlock position={[0.72, 0.58, 0.44]} size={[0.06, 0.14, 0.05]} color="#9b7356" />
      <CounterBlock position={[0, 0.08, 0.18]} size={[1.5, 0.08, 0.48]} color="#65716c" roughness={0.32} />
    </group>
  );
}

function Grinder() {
  return (
    <group position={[-2.55, 1.18, -1.2]}>
      <mesh position={[0, 0.34, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.29, 0.66, 20]} />
        <meshStandardMaterial color="#b9c9bf" roughness={0.38} />
      </mesh>
      <mesh position={[0, 0.81, 0]} castShadow>
        <cylinderGeometry args={[0.23, 0.28, 0.3, 20]} />
        <meshStandardMaterial color="#dce5df" roughness={0.26} transparent opacity={0.88} />
      </mesh>
      <mesh position={[0, 0.99, 0]}>
        <cylinderGeometry args={[0.18, 0.23, 0.08, 20]} />
        <meshStandardMaterial color="#79553e" roughness={0.8} />
      </mesh>
      <CounterBlock position={[0, 0.13, 0.08]} size={[0.44, 0.11, 0.35]} color="#67746e" roughness={0.36} />
      <mesh position={[0.31, 0.32, 0.08]} rotation={[0, 0, -0.7]}>
        <cylinderGeometry args={[0.025, 0.025, 0.36, 10]} />
        <meshStandardMaterial color="#7d5d43" />
      </mesh>
    </group>
  );
}

function IngredientShelf() {
  return (
    <group position={[-2.55, 0, -2.42]}>
      <CounterBlock position={[0, 1.76, 0]} size={[2.15, 1.85, 0.16]} color="#d2ddd5" />
      {[1.18, 1.82, 2.44].map((y) => (
        <CounterBlock key={y} position={[0, y, 0.22]} size={[2.35, 0.09, 0.66]} color="#896044" roughness={0.52} />
      ))}
      {[-0.86, 0.86].map((x) => (
        <CounterBlock key={x} position={[x, 1.82, 0.22]} size={[0.08, 1.36, 0.58]} color="#a98260" />
      ))}
      {[-0.55, 0, 0.55].map((x, index) => (
        <group key={x} position={[x, 0, 0.27]}>
          <mesh position={[0, 1.47, 0]} castShadow>
            <cylinderGeometry args={[0.19, 0.2, 0.48, 18]} />
            <meshStandardMaterial color={index === 1 ? '#d9c09c' : '#e5ddd0'} roughness={0.48} />
          </mesh>
          <mesh position={[0, 1.74, 0]}>
            <cylinderGeometry args={[0.12, 0.12, 0.08, 16]} />
            <meshStandardMaterial color="#76543c" roughness={0.62} />
          </mesh>
        </group>
      ))}
      {[-0.45, 0.45].map((x, index) => (
        <group key={x} position={[x, 0, 0.27]}>
          <mesh position={[0, 2.08, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.21, 0.4, 18]} />
            <meshStandardMaterial color={index === 0 ? '#e4d5b9' : '#c5d4ca'} roughness={0.48} />
          </mesh>
          <mesh position={[0, 2.31, 0]}>
            <cylinderGeometry args={[0.13, 0.13, 0.07, 16]} />
            <meshStandardMaterial color="#76543c" roughness={0.62} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function PickupStation() {
  return (
    <group position={[2.35, 1.18, -1.15]}>
      <CounterBlock position={[0, 0.3, 0]} size={[1.18, 0.56, 0.68]} color="#d8c29f" />
      <CounterBlock position={[0, 0.61, 0]} size={[1.25, 0.08, 0.74]} color="#9a7050" />
      <CounterBlock position={[0, 1.2, -0.25]} size={[0.94, 0.92, 0.08]} color="#bfaa8c" />
      <CounterBlock position={[0, 1.22, -0.19]} size={[0.8, 0.74, 0.03]} color="#e8ddc9" />
      <mesh position={[-0.28, 0.92, 0.1]} castShadow>
        <cylinderGeometry args={[0.14, 0.18, 0.3, 18]} />
        <meshStandardMaterial color="#f0e8d8" roughness={0.46} />
      </mesh>
      <mesh position={[0.23, 0.92, 0.08]} castShadow>
        <cylinderGeometry args={[0.13, 0.17, 0.3, 18]} />
        <meshStandardMaterial color="#c9d8cd" roughness={0.46} />
      </mesh>
    </group>
  );
}

function CareCorner() {
  return (
    <group position={[-3.25, 0, 0.92]}>
      <mesh position={[0, 0.38, 0]} castShadow>
        <cylinderGeometry args={[0.31, 0.35, 0.72, 20]} />
        <meshStandardMaterial color="#d7c7b7" roughness={0.58} />
      </mesh>
      <mesh position={[0, 0.77, 0]}>
        <cylinderGeometry args={[0.35, 0.35, 0.07, 20]} />
        <meshStandardMaterial color="#94765f" roughness={0.6} />
      </mesh>
      <mesh position={[0.55, 0.76, 0.12]} rotation={[0, 0, -0.08]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 1.45, 10]} />
        <meshStandardMaterial color="#987354" roughness={0.55} />
      </mesh>
      <mesh position={[0.55, 0.12, 0.12]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.11, 0.11, 0.48, 12]} />
        <meshStandardMaterial color="#c8b79e" roughness={0.72} />
      </mesh>
      <CounterBlock position={[0.73, 0.66, -0.2]} size={[0.62, 0.48, 0.36]} color="#b9c9bf" />
    </group>
  );
}

function ZoneMarker({
  position,
  label,
  count,
  onClick,
}: {
  position: Vec3;
  label: string;
  count: number;
  onClick: () => void;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 176;
    const context = canvas.getContext('2d');
    if (!context) return null;

    context.shadowColor = 'rgba(41, 43, 40, 0.16)';
    context.shadowBlur = 12;
    context.shadowOffsetY = 5;
    context.fillStyle = '#f4efe3';
    context.beginPath();
    context.roundRect(8, 8, 624, 160, 80);
    context.fill();
    context.shadowColor = 'transparent';
    context.shadowBlur = 0;
    context.shadowOffsetY = 0;
    context.strokeStyle = '#c8d8ce';
    context.lineWidth = 4;
    context.stroke();
    context.fillStyle = '#292b28';
    context.font = '600 34px sans-serif';
    context.textBaseline = 'middle';
    context.fillText(label, 34, 88, 440);
    context.fillStyle = '#c8d8ce';
    context.beginPath();
    context.arc(562, 88, 42, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#292b28';
    context.font = '600 34px sans-serif';
    context.textAlign = 'center';
    context.fillText(String(count), 562, 90, 70);

    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    return map;
  }, [count, label]);

  useEffect(() => () => texture?.dispose(), [texture]);

  return (
    <Billboard position={position} follow>
      <mesh onClick={(event) => { event.stopPropagation(); onClick(); }}>
        <planeGeometry args={[1.95, 0.54]} />
        <meshBasicMaterial map={texture ?? undefined} toneMapped={false} transparent alphaTest={0.04} />
      </mesh>
    </Billboard>
  );
}

export default function HomeCafeScene({ counts, onSelectZone }: HomeCafeSceneProps) {
  return (
    <div className="relative h-[min(58svh,460px)] min-h-[300px] w-full overflow-hidden rounded-3xl bg-[#dce9df]">
      <Canvas
        camera={{ position: [6.8, 5.8, 8.7], fov: 34 }}
        shadows
        dpr={[1, 1.5]}
        fallback={
          <nav aria-label="จุดงานในร้าน" className="grid h-full grid-cols-2 gap-2 p-3 sm:grid-cols-4">
            {([
              ['service', 'หน้าบาร์'],
              ['inventory', 'วัตถุดิบ'],
              ['orders', 'ออเดอร์'],
              ['maintenance', 'ดูแลร้าน'],
            ] as const).map(([zone, label]) => (
              <button
                key={zone}
                type="button"
                onClick={() => onSelectZone(zone)}
                className="min-h-11 rounded-full border border-border bg-card px-4 text-sm text-foreground"
              >
                {label} · {counts[zone]}
              </button>
            ))}
            <p className="col-span-full self-end px-1 text-center text-xs text-muted-foreground">
              อุปกรณ์นี้ไม่รองรับฉาก 3D ใช้รายการจุดงานเพื่อเปิดข้อมูลได้
            </p>
          </nav>
        }
      >
        <color attach="background" args={['#dce9df']} />
        <ambientLight intensity={1.35} />
        <directionalLight position={[3, 8, 5]} intensity={2.1} castShadow />

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} receiveShadow>
          <planeGeometry args={[11, 8]} />
          <meshStandardMaterial color="#d8ccb9" roughness={0.9} />
        </mesh>
        <CounterBlock position={[0, 1.8, -3.35]} size={[8, 3.6, 0.16]} color="#b9cdc3" />
        <CounterBlock position={[-3.92, 1.8, 0]} size={[0.16, 3.6, 6.85]} color="#dce9df" />

        <Countertop />
        <IngredientShelf />
        <Grinder />
        <EspressoMachine />
        <PickupStation />
        <CareCorner />

        <ZoneMarker position={[0, 2.55, -0.12]} label="เอสเปรสโซ · หน้าบาร์" count={counts.service} onClick={() => onSelectZone('service')} />
        <ZoneMarker position={[-2.68, 2.95, -2.08]} label="วัตถุดิบ · สต็อก" count={counts.inventory} onClick={() => onSelectZone('inventory')} />
        <ZoneMarker position={[2.4, 2.68, -0.1]} label="จุดรับออเดอร์" count={counts.orders} onClick={() => onSelectZone('orders')} />
        <ZoneMarker position={[-2.45, 1.65, 1.08]} label="ดูแลอุปกรณ์" count={counts.maintenance} onClick={() => onSelectZone('maintenance')} />

        <OrbitControls
          target={[0, 0.9, -0.55]}
          enablePan={false}
          minDistance={7}
          maxDistance={11}
          minPolarAngle={0.72}
          maxPolarAngle={1.28}
          maxAzimuthAngle={0.42}
          minAzimuthAngle={-0.42}
        />
      </Canvas>
      <nav aria-label="ทางเลือกจุดงานสำหรับคีย์บอร์ด" className="sr-only focus-within:not-sr-only">
        <ul className="absolute inset-x-3 bottom-3 z-10 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {([
            ['service', 'หน้าบาร์'],
            ['inventory', 'วัตถุดิบ'],
            ['orders', 'ออเดอร์'],
            ['maintenance', 'ดูแลร้าน'],
          ] as const).map(([zone, label]) => (
            <li key={zone}>
              <button
                type="button"
                onClick={() => onSelectZone(zone)}
          className="min-h-11 w-full rounded-full border border-border bg-card px-4 text-sm text-foreground"
              >
                {label} · {counts[zone]}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
