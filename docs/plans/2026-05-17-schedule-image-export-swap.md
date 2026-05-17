# Implementation Plan: Swap Schedule Image Exporter to html-to-image

- **Goal**: Swap image capture library from `html2canvas` to `html-to-image` to prevent rendering crashes caused by unsupported modern CSS parameters like `oklch` or `lab`.
- **Dependency Changes**:
  - Uninstall `html2canvas`.
  - Install `html-to-image`.
- **Refactoring**:
  - Update `exportScheduleImage` in `ScheduleClient.tsx` to dynamically load `toPng` from `html-to-image` to prevent Next.js SSR build errors.
  - Set options: `quality: 1.0`, `pixelRatio: 2` (high-density scaling), `backgroundColor: '#fdfcf0'` (pastel cream), and stable styling rules.
- **Zero-Bold Policy**: Enforced.

---

## Detailed Tasks

### Task 1: Package Management
- Run `npm uninstall html2canvas` via terminal and await completion.
- Run `npm install html-to-image` via terminal and await completion.

### Task 2: Refactor `ScheduleClient.tsx`
- Replace `html2canvas` inside `exportScheduleImage` (around lines 750-785) with `toPng` from `html-to-image`:
  ```typescript
  const exportScheduleImage = async () => {
    try {
      const { toPng } = await import('html-to-image');
      const element = document.getElementById('blackandbrew-schedule-table');
      if (!element) return;

      setLoading(true);

      const dataUrl = await toPng(element, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#fdfcf0',
        style: {
          transform: 'scale(1)',
        }
      });

      const link = document.createElement('a');
      link.download = `Schedule-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export image:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกตารางงานเป็นรูปภาพ');
    } finally {
      setLoading(false);
    }
  };
  ```

### Task 3: Unit and Build Verification
- Execute `npx vitest run` to ensure unit test sanity.
- Compile and run `npm run build` to confirm compiler compatibility.
