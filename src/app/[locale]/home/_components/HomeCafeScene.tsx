'use client';

import { Billboard, OrbitControls, useTexture } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { CanvasTexture, DoubleSide, SRGBColorSpace } from 'three';
import { useEffect, useMemo } from 'react';
import type { HomeSceneZoneId } from '@/lib/home-scene-zones';

type HomeCafeSceneProps = {
  counts: Record<HomeSceneZoneId, number>;
  onSelectZone: (zone: HomeSceneZoneId) => void;
};

type Vec3 = [number, number, number];

function GroundContactShadow({
  position,
  size,
  opacity = 0.18,
}: {
  position: Vec3;
  size: [number, number];
  opacity?: number;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    if (!context) return null;

    const gradient = context.createRadialGradient(64, 64, 4, 64, 64, 62);
    gradient.addColorStop(0, 'rgba(38, 35, 30, 0.48)');
    gradient.addColorStop(0.38, 'rgba(38, 35, 30, 0.30)');
    gradient.addColorStop(0.72, 'rgba(38, 35, 30, 0.10)');
    gradient.addColorStop(1, 'rgba(38, 35, 30, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);

    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    return map;
  }, []);

  useEffect(() => () => texture?.dispose(), [texture]);

  if (!texture) return null;

  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={texture} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

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

function EspressoMachine() {
  const texture = useTexture('/images/home-espresso-machine.png');
  texture.colorSpace = SRGBColorSpace;

  return (
    <group position={[1, 1.72, -0.8]}>
      <GroundContactShadow position={[0, -0.99, 0.04]} size={[2.05, 0.72]} opacity={0.22} />
      <mesh position={[0, 0, 0.24]}>
        <planeGeometry args={[1.8, 1.35]} />
        <meshBasicMaterial map={texture} transparent side={DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  );
}

function PosTerminal() {
  const texture = useTexture('/images/home-pos-terminal.png');
  texture.colorSpace = SRGBColorSpace;

  return (
    <group position={[-2.55, 1.55, -0.8]}>
      <GroundContactShadow position={[0, -0.78, 0.02]} size={[0.9, 0.58]} opacity={0.2} />
      <mesh position={[0, 0.06, 0.16]}>
        <planeGeometry args={[0.9, 1.2]} />
        <meshBasicMaterial map={texture} transparent side={DoubleSide} toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

function DripCoffeeBar() {
  const [clearTexture, redTexture, whiteTexture] = useTexture([
    '/images/home-pour-over-clear.png',
    '/images/home-pour-over-red.png',
    '/images/home-pour-over-white.png',
  ]);
  clearTexture.colorSpace = SRGBColorSpace;
  redTexture.colorSpace = SRGBColorSpace;
  whiteTexture.colorSpace = SRGBColorSpace;

  return (
    <group position={[3, 1.365, -0.8]}>
      {[
        { x: -0.65, texture: clearTexture },
        { x: 0, texture: redTexture },
        { x: 0.65, texture: whiteTexture },
      ].map(({ x, texture }) => (
        <group key={x} position={[x, 0, 0]}>
          <GroundContactShadow position={[0, -0.39, 0.02]} size={[0.56, 0.4]} opacity={0.17} />
          <mesh position={[0, 0.04, 0.045]}>
            <planeGeometry args={[0.49, 0.65]} />
            <meshBasicMaterial map={texture} transparent side={DoubleSide} toneMapped={false} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Grinder() {
  const texture = useTexture('/images/home-coffee-grinder.png');
  texture.colorSpace = SRGBColorSpace;

  return (
    <group position={[-0.9, 1.64, -0.82]}>
      {[-0.62, 0, 0.62].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <GroundContactShadow position={[0, -0.76, 0.03]} size={[0.66, 0.5]} opacity={0.19} />
          <mesh position={[0, -0.02, 0.12]}>
            <planeGeometry args={[0.825, 1.1]} />
            <meshBasicMaterial map={texture} transparent side={DoubleSide} toneMapped={false} depthWrite={false} />
          </mesh>
        </group>
      ))}
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
    const scale = Math.max(2, Math.min(3, window.devicePixelRatio || 1));
    canvas.height = 176 * scale;
    const context = canvas.getContext('2d');
    if (!context) return null;

    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.font = '600 34px sans-serif';
    const textWidth = context.measureText(label).width;
    const textLeft = 34;
    const markerLeft = Math.ceil(textLeft + textWidth + 48);
    const pillRight = markerLeft + 78;
    const pillWidth = pillRight - 8;
    canvas.width = Math.ceil(pillWidth * scale);

    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.font = '600 34px sans-serif';
    context.textBaseline = 'middle';
    context.shadowColor = 'rgba(41, 43, 40, 0.16)';
    context.shadowBlur = 12;
    context.shadowOffsetY = 5;
    context.fillStyle = '#f4efe3';
    context.beginPath();
    context.roundRect(8, 8, pillWidth - 16, 160, 80);
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
    context.fillText(label, textLeft, 88);
    context.fillStyle = '#c8d8ce';
    context.beginPath();
    context.arc(markerLeft, 88, 42, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#292b28';
    context.font = '600 34px sans-serif';
    context.textAlign = 'center';
    context.fillText(String(count), markerLeft, 90, 70);

    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    return { map, width: pillWidth / 176 * 0.49 };
  }, [count, label]);

  useEffect(() => () => texture?.map.dispose(), [texture]);

  return (
    <Billboard position={position} follow>
      <mesh onClick={(event) => { event.stopPropagation(); onClick(); }}>
        <planeGeometry args={[texture?.width ?? 1.2, 0.49]} />
        <meshBasicMaterial map={texture?.map} toneMapped={false} transparent alphaTest={0.04} />
      </mesh>
    </Billboard>
  );
}

export default function HomeCafeScene({ counts, onSelectZone }: HomeCafeSceneProps) {
  return (
    <div className="relative h-[min(52svh,420px)] min-h-[280px] w-full overflow-hidden rounded-3xl bg-[#dce9df]">
      <Canvas
        camera={{ position: [6.8, 5.8, 8.7], fov: 34 }}
        shadows
        dpr={[1.5, 2]}
        fallback={
          <nav aria-label="จุดงานในร้าน" className="grid h-full grid-cols-2 gap-2 p-3 sm:grid-cols-4">
            {([
              ['service', 'หน้าบาร์'],
              ['inventory', 'วัตถุดิบ'],
              ['orders', 'ออเดอร์'],
              ['maintenance', 'ดูแลร้าน'],
            ] as const).filter(([zone]) => counts[zone] > 0).map(([zone, label]) => (
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
        <CounterBlock position={[0, 0.48, -1.05]} size={[7.8, 0.9, 1.55]} color="#d7c6af" />
        <CounterBlock position={[0, 0.98, -1.05]} size={[7.92, 0.12, 1.68]} color="#896044" roughness={0.5} />

        <PosTerminal />
        <Grinder />
        <EspressoMachine />
        <DripCoffeeBar />

        {counts.orders > 0 ? <ZoneMarker position={[-2.8, 2.55, -0.12]} label="เครื่อง POS" count={counts.orders} onClick={() => onSelectZone('orders')} /> : null}
        {counts.inventory > 0 ? <ZoneMarker position={[-0.95, 2.55, -0.12]} label="เครื่องบด" count={counts.inventory} onClick={() => onSelectZone('inventory')} /> : null}
        {counts.service > 0 ? <ZoneMarker position={[0.95, 2.55, -0.12]} label="เครื่องชงกาแฟ" count={counts.service} onClick={() => onSelectZone('service')} /> : null}
        {counts.maintenance > 0 ? <ZoneMarker position={[2.75, 2.55, -0.12]} label="บาร์ดริปกาแฟ" count={counts.maintenance} onClick={() => onSelectZone('maintenance')} /> : null}

        <OrbitControls
          target={[0, 1.35, -0.8]}
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
          ] as const).filter(([zone]) => counts[zone] > 0).map(([zone, label]) => (
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
