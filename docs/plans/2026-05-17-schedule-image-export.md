# Implementation Plan: High-Fidelity Schedule Image Export

- **Goal**: Integrate a high-fidelity "Export Schedule to Image" feature on the Schedule Screen.
- **Dependency**: Install `html2canvas` (DOM-to-Canvas compiler).
- **Targeting**: Add `id="blackandbrew-schedule-table"` to the core grid wrapper.
- **Export Trigger**:
  - Add a beautiful modern "บันทึกรูปภาพ" button using `Download` icon next to the controls header.
  - Dynamically import `html2canvas` inside `exportScheduleImage` to prevent any Next.js SSR (Server-Side Rendering) build-time window/document initialization failures.
  - Scale canvas to `2` to ensure ultra-sharp high-definition image exporting and set backdrop background to matching pastel cream `#fdfcf0`.
- **Typographical Rule**: Strictly respect the **Zero-Bold Policy** (`font-normal`).

---

## Detailed Tasks

### Task 1: Install `html2canvas` Dependency
- Run `npm install html2canvas` via PowerShell and await execution.

### Task 2: Refactor `ScheduleClient.tsx`
- **Location**: `src/app/[locale]/schedule/ScheduleClient.tsx`
- **Lucide Imports**: Add `Download` to the imports list from `lucide-react` on line 6.
- **Table Container Targeting**: Modify line 835 to include `id="blackandbrew-schedule-table"`.
- **Export Function Definition**:
  ```typescript
  const exportScheduleImage = async () => {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const element = document.getElementById('blackandbrew-schedule-table');
      if (!element) return;

      setLoading(true);

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#fdfcf0', // Matches Pastel Cream background
      });

      const image = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = `Schedule-${new Date().toISOString().split('T')[0]}.png`;
      link.href = image;
      link.click();
    } catch (err) {
      console.error('Failed to export image:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกตารางงานเป็นรูปภาพ');
    } finally {
      setLoading(false);
    }
  };
  ```
- **Control Header Button Rendering**: Insert a `Download` button right before the "เพิ่มพนักงาน" button (around line 815).
  ```typescript
  <button
    onClick={exportScheduleImage}
    className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-normal text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md border border-slate-200 transition-all duration-200 active:scale-95 cursor-pointer uppercase tracking-wide"
  >
    <Download className="w-3.5 h-3.5" />
    บันทึกรูปภาพ
  </button>
  ```

### Task 3: Unit and Compiler Sanity Checks
- Execute `npx vitest run` to ensure unit test stability.
- Run `npm run build` to confirm compiler compatibility.
