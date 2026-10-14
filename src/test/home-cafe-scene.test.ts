import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const scenePath = 'src/app/[locale]/home/_components/HomeCafeScene.tsx';

describe('HomeCafeScene', () => {
  it('keeps clickable labels in the page React root instead of Drei Html portals', () => {
    const source = readFileSync(scenePath, 'utf8');

    expect(source).not.toMatch(/import\s*\{[^}]*\bHtml\b[^}]*\}\s*from\s*['"]@react-three\/drei['"]/);
    expect(source).toContain('onClick={(event) => { event.stopPropagation(); onClick(); }}');
  });

  it('places readable zone markers in the 3D scene instead of a detached bottom nav', () => {
    const source = readFileSync(scenePath, 'utf8');

    expect(source).toContain('<Billboard');
    expect(source).toContain('new CanvasTexture(canvas)');
    expect(source).toContain('context.roundRect(');
    expect(source).toContain('transparent alphaTest={0.04}');
    expect(source).toContain('position={[-2.45, 1.65, 1.08]}');
    expect(source).not.toContain("import { Billboard, OrbitControls, Text } from '@react-three/drei'");
    expect(source).not.toContain('aria-label="จุดงานในร้าน" className="absolute inset-x-3 bottom-3');
    expect(source).toContain('เอสเปรสโซ');
    expect(source).toContain('จุดรับออเดอร์');
  });

  it('opens the selected zone as a task subwindow from the home scene', () => {
    const clientPath = 'src/app/[locale]/home/HomeClient.tsx';
    const source = readFileSync(clientPath, 'utf8');

    expect(source).toContain('<HomeSceneZoneOverlay');
    expect(source).not.toContain('aria-label={`งาน${selectedZoneData.label}`}');
  });
});
