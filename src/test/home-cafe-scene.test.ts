import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const clientPath = 'src/app/[locale]/home/HomeClient.tsx';

describe('Home task cards', () => {
  it('shows task titles and statuses without descriptions, category cards, or the 3D cafe scene', () => {
    const source = readFileSync(clientPath, 'utf8');

    expect(source).not.toContain("import('./_components/HomeCafeScene')");
    expect(source).not.toContain('homeView');
    expect(source).not.toContain('HomeSceneZoneOverlay');
    expect(source).toContain('consolidatedAllTasks.map((task) => (');
    expect(source).toContain('{task.title}');
    expect(source).not.toContain('{task.description}');
  });

  it('opens task details directly from each task card', () => {
    const source = readFileSync(clientPath, 'utf8');

    expect(source).toContain('canOpenSecretaryTaskDetail(task)');
    expect(source).toContain('warmTaskCard(task);');
    expect(source).toContain('setOverlayTask(task);');
  });
});
