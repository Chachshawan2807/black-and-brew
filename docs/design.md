# Design Standards — BLACKANDBREW ERP

> Version: 9.2 | Last Updated: 2026-07-23 | Standard: Dual Theme + Pastel Surfaces, High-Legibility

---

## 1. Design Philosophy

**Minimalist Analog** — ดีไซน์ที่สื่อถึงความเรียบง่าย สะอาดตา และใช้งานง่าย เหมือนกระดาษที่ตัดมาวางบนโต๊ะ

- ไม่มี Visual Clutter — ทุกพิกเซลมีหน้าที่
- Black-on-Pastel — ตัวหนังสือดำบนพื้นหลัง pastel accent (ทั้ง light และ dark theme)
- Dual Theme — หน้า/modal ใช้ CSS tokens; pastel cards คงสีเดิม + `.bb-pastel-surface`
- High-Legibility — อ่านง่ายในทุกสภาพแสงและทั้งสองธีม

---

## 2. Color Palette

### 2a. Theme Tokens (`globals.css`)

Light (`:root`) และ dark (`.dark`) กำหนดผ่าน CSS variables — ใช้ Tailwind utilities:

| Utility | CSS Variable | Light | Dark | Usage |
| --- | --- | --- | --- | --- |
| `bg-background` | `--background` | `#fdfcf0` | deep neutral | พื้นหลังหน้า |
| `text-foreground` | `--foreground` | near-black | near-white | ข้อความหลัก |
| `bg-card` | `--card` | white | dark card | Cards, modals, inputs |
| `text-muted-foreground` | `--muted-foreground` | muted | muted light | ข้อความรอง |
| `border-border` | `--border` | subtle | subtle dark | เส้นขอบ |

Theme persistence: `next-themes` + `storageKey="bb-theme"` — ตั้งค่าที่ `/[locale]/settings`.

### 2b. Pastel Accent Surfaces (Both Themes)

Pastel hex backgrounds (shift types, sales metrics, inventory quick actions) **ไม่เปลี่ยนตาม theme** — ต้องใช้ class `bb-pastel-surface` (หรือ `PASTEL_SURFACE` จาก `shift-colors.ts`) เพื่อบังคับ:

- ข้อความและไอคอน = `#000000`
- Override `.text-foreground`, `h1–h6`, และ muted classes ภายใน container

| Pattern | Example |
| --- | --- |
| Pastel card | `bg-[#d4edda] bb-pastel-surface text-[#000000]` |
| Non-pastel page | `bg-background text-foreground` |
| Non-pastel card | `bg-card border border-border text-foreground` |

### 2c. Legacy Semantic Tokens (Reference)

| Token | Light value | Usage |
| --- | --- | --- |
| Morning Latte Cream | `#fdfcf0` | Light `--background` only — ใช้ `bg-background` ไม่ hardcode |
| `--accent-save` | `emerald-500` | Sync/Save confirmation |
| `--accent-delete` | `red-500` | Destructive actions |
| `--accent-loading` | `purple-400` | Loading spinners |

---

## 3. Typography

### Rules (Strict)

- **ห้ามใช้ตัวหนา** (`font-bold`, `font-semibold`, `font-black`) ในทุกส่วนของแอปพลิเคชัน
- ใช้ `font-normal` (weight: 400) เท่านั้น
- ข้อยกเว้น: `font-medium` (weight: 500) ได้เฉพาะกรณีจำเป็นสำหรับ emphasize (เช่น item names ใน history modal)

### Font Stack

```css
font-family: 'Sarabun', 'Inter', system-ui, sans-serif;
```

- **Sarabun** — Primary font สำหรับ Thai text metrics
- **Inter** — Fallback สำหรับ Latin characters

### Sizes

| Element | Size | Line-height |
| --- | --- | --- |
| Page Title (`h1`) | `text-3xl` (30px) | Default |
| Section Title (`h2`) | `text-2xl` / `text-xl` / `text-lg` | Default |
| Body Text | `text-[15px]` | `1.6` |
| Input Text | `text-[14px]` - `text-[15px]` | `1.6` |
| Labels / Sub-headings | `text-[13px]` - `text-[14px]` | Default |
| Timestamps / Hints | `text-[12px]` - `text-[13px]` | Default |
| Numeric Mono | `font-mono` | Default |

### Thai Typography Integrity

- บังคับใช้ `line-height: 1.6` เพื่อป้องกันสระไทยและวรรณยุกต์ถูกตัดขาด
- ใช้ `padding` แนวตั้งที่เพียงพอ (`py-4` ขึ้นไป) สำหรับ Table rows
- ชดเชยพื้นที่สระบนด้วย `+4px` ถึง `+6px` Padding (Optical Alignment)

---

## 4. Layout & Spacing

### 8pt Grid System

ระยะห่างทุกจุดต้องเป็นทวีคูณของ 8:

- `8px`, `16px`, `24px`, `32px`, `40px`, `48px`...
- Tailwind equivalents: `p-2`, `p-4`, `p-6`, `p-8`...

### Border Radius

- **ทุก Interactive Element** ต้องใช้ `rounded-3xl` (24px)
  - Buttons, Cards, Modals, Inputs, Tags, Dropdowns
- ข้อยกเว้น: Table cells ภายใน (ไม่มี radius)

---

## 5. Component Standards

### Buttons

```text
Primary:   bg-black text-white rounded-3xl shadow-sm hover:bg-black/80 active:scale-95
Secondary: bg-card text-foreground border border-border rounded-3xl shadow-sm hover:bg-muted/50
Danger:    bg-red-500 text-white rounded-3xl hover:bg-red-600
```

### Modals

```text
Overlay:   bg-slate-900/20 backdrop-blur-sm (standard) or bg-black/40 backdrop-blur-md (heavy)
Container: bg-card rounded-3xl shadow-xl max-w-xl animate-in fade-in zoom-in-95 border border-border
Header:    px-6 py-5 border-b border-border flex justify-between text-foreground
```

### Table (Spreadsheet-Style)

```text
Wrapper:   border border-border bg-background/80 backdrop-blur-md rounded-3xl shadow-sm
Header:    bg-muted/50 text-muted-foreground text-[13px] uppercase tracking-wider
Row:       border-b border-border hover:bg-muted/30 transition-all duration-300
Cell:      Direct <input> in <td>, px-4 py-4 min-h-[56px] bg-transparent
Index Cell: bg-black/[0.01], text-black/20, text-[10px], font-medium, tabular-nums
Type Indicator: w-9 h-9, rounded-2xl, icon size w-4.5 h-4.5, flex center
```

### Status Badge

```text
IN:  bg-black text-white px-4 py-1.5 rounded-full text-[12px]
OUT: bg-slate-100 text-black/60 border border-black/5 px-4 py-1.5 rounded-full text-[12px]
```

---

## 6. Interaction Standards

| Interaction | Standard |
| --- | --- |
| **Hover / Focus** | `transition-all duration-200 ease-in-out` (`.bb-transition`) |
| **Active/Click** | `active:scale-[0.98]` (buttons) |
| **Page Route Change** | `PageTransition` — opacity fade 300ms `ease-in-out` |
| **Modal Open** | `bb-modal-backdrop` fade 300ms + `bb-modal-panel` zoom-in-95 200ms |
| **Bottom Sheet** | `bb-sheet-panel` slide-in-from-bottom 300ms |
| **Toast / Alert** | slide-up + fade-in 300ms → auto fade-out 2.8–3s |
| **Drag** | `opacity-70 scale-[1.02] shadow-xl z-[100]` |
| **Focus (Input)** | `focus:ring-1 focus:ring-black/10` |
| **Loading** | `Loader2` icon with `animate-spin` |
| **Save Feedback** | `✓ Synced` (emerald-500) → fades after 2s |

---

## 7. Z-Index Layering

| Layer | Z-Index | Element |
| --- | --- | --- |
| Base Content | `1` | Table rows, Cards |
| Sidebar Logo | `110` | Brand logo in sidebar |
| Content Headers | `50` | Sticky headers |
| Dragging Row | `100` | Active drag item |
| Modals | `150` | All modal overlays |
| Dropdown/Search | `200` | Search results dropdown |

---

## 8. Mobile-Specific UI Patterns

### Sticky Name Column (ตารางงาน)

```html
<!-- ตัวอย่างโครงสร้างที่ต้องการใน ScheduleClient.tsx -->
<div class="overflow-x-auto scrollbar-none">
  <table>
    <td class="sticky left-0 z-20 bg-white border-r border-black/5 text-black">
       ชื่อพนักงาน
    </td>
  </table>
</div>
```

### Bottom Sheet Drawer

- **Mobile**: `fixed bottom-0 left-0 right-0 rounded-t-3xl shadow-2xl-up animate-in slide-in-from-bottom`
- **Desktop (md:)**: `relative rounded-3xl translate-y-0` (กลับมาเป็น Modal กลางจอปกติ)

### Custom Popover Calendar (DatePicker)

- **Mobile Viewport (< md)**: แสดงผลเป็น Modal เต็มกึ่งกลางหน้าจอ (`fixed inset-0 flex items-center justify-center z-[250]`) พร้อมแผ่น Backdrop ทึบสีดำจาง 40% และฟังก์ชันคลิกนอกพื้นที่เพื่อสลับปิดแบบสมูท
- **Desktop Viewport (md:)**: แสดงผลเป็น Dropdown Popover ขนาดเล็กใต้กล่องอินพุตปกติ (`absolute mt-2 z-[200] rounded-3xl border border-black/5 bg-white shadow-xl`)
- **Design Elements**: ปุ่มเปลี่ยนเดือนและเลือกวันจัดเรียงแบบแคปซูลมินิมัลพาสเทล (`rounded-full`)

### Date Picker Hitbox (Global Rules)

- กรอบ Container ของอินพุตเลือกวันที่ทั้งหมดต้องสามารถกดคลิกได้เต็มพื้นที่ (`w-full cursor-pointer`) ไม่จำกัดให้กดที่รูปไอคอนเท่านั้น เพื่อเพิ่มความสะดวกในการใช้งานผ่านหน้าจอสัมผัส

### iOS Safe Zones Layout Padding

- เพื่อไม่ให้ UI แถบเมนูด้านล่างหรือกล่อง Modal ไปทับซ้อนกับ iOS Home Indicator (แถบปัดด้านล่างของ iPhone/iPad) ทุกคอนเทนเนอร์ล่างสุดของแอปและปุ่ม Action ต้องมีการสอดแทรก Padding ระยะปลอดภัย:

  ```css
  padding-bottom: calc(1.5rem + env(safe-area-inset-bottom));
  ```

  หรือเทียบเท่า Tailwind Utility: `max-md:pb-[calc(1.5rem+env(safe-area-inset-bottom))]`

---

## 9. Responsive Strategy

- **Desktop-First** for table/spreadsheet layouts
- **Fluid Width** — `w-fit mx-auto` containers
- Breakpoints: `md:` for tablet+ layouts
- Mobile: Stack columns vertically, full-width inputs
- **PWA Capabilities**: 100% App-like shell responsive with fluid scaling and offline capability on any mobile screen.
- **PWA Manifest** (`src/app/manifest.ts`): icons at `/images/notification-icon.png` (192×192) and `/images/notification-icon-512.png` (512×512); `theme_color: #000000`, `background_color: #ffffff`.

---

## 9b. Tooltip Standards (v8.6)

| Component | Path | Purpose |
| --- | --- | --- |
| `AppTooltipProvider` | `src/components/providers/AppTooltipProvider.tsx` | Root `TooltipProvider` — `delayDuration={150}` |
| `HintTooltip` | `src/components/ui/hint-tooltip.tsx` | Styled hover/focus hints for icon buttons; no native `title` |
| `Tooltip` primitives | `src/components/ui/tooltip.tsx` | Radix-based tooltip building blocks |

**Usage:** Wrap app shell with `AppTooltipProvider` in layout. Use `HintTooltip` for compact controls (FAB icons, toolbar buttons). Pass copy via `tip` prop only.

---

## 10. Motion System (v6.9)

### Architecture

| Component | Path | Purpose |
| --- | --- | --- |
| CSS Keyframes | `src/app/[locale]/globals.css` | `bb-fade-in`, `bb-zoom-in-95`, `bb-slide-*` utilities |
| Framer Presets | `src/lib/motion-presets.ts` | Shared `fadeOverlay`, `modalContent`, `pageContent`, `toastSlide` |
| Page Transition | `src/components/ui/page-transition.tsx` | Route fade via `SidebarLayout` |
| Floating Alerts | `src/components/ui/floating-alert.tsx` | Schedule warning + Maintenance toast |

### Standard Classes

```text
.bb-transition          → hover/focus micro-interaction (200ms ease-in-out)
.bb-modal-backdrop      → overlay fade-in 300ms
.bb-modal-panel         → modal zoom-in-95 200ms ease-out
.bb-sheet-panel         → bottom sheet slide-in 300ms
.animate-in.fade-in     → generic enter animation
.animate-out.fade-out-0 → generic exit animation
```

### Rules

- ใช้ **opacity และ transform เท่านั้น** — ห้ามเปลี่ยน width/height/margin ที่กระทบ layout
- Modal overlay: `bg-black/20 backdrop-blur-sm` + fade
- Mobile drawer backdrop: sync 300ms กับ sidebar `transition-transform duration-300`
- Zero-Bold Policy ยังบังคับใช้ในทุก animated element

---

## 11. Dark Theme (v8.4)

### Implementation

| Piece | Path | Role |
| --- | --- | --- |
| CSS tokens | `src/app/[locale]/globals.css` | `:root` / `.dark` variables + `.bb-pastel-surface` |
| Provider | `src/components/providers/ThemeProvider.tsx` | `next-themes`, class on `<html>` |
| Settings UI | `src/app/[locale]/settings/page.tsx` | Theme picker + login history |
| Pastel constants | `src/lib/shift-colors.ts` | `PASTEL_SURFACE`, `SALES_SECTION_COLORS`, etc. |

### Surface Decision Matrix

| Surface type | Background | Text |
| --- | --- | --- |
| Page / modal / spreadsheet | `bg-background` / `bg-card` | `text-foreground` / `text-muted-foreground` |
| Pastel accent (shift, metrics, quick actions) | Pastel hex (unchanged) | `bb-pastel-surface` → always black |
| Borders | `border-border` | — |
| Inputs on pastel (active count cell) | `bg-white` + `text-black` when on pastel only | explicit black |

### Anti-patterns

- ❌ `bg-[#fdfcf0]` or `bg-white` on page wrappers in new code
- ❌ `text-black` / `text-[#000000]` on non-pastel dark surfaces
- ❌ Pastel cards without `bb-pastel-surface` (white/invisible text in dark mode)

---

## 12. Inventory Count Policy UI (v8.9)

| Policy | UI label | Behavior |
| --- | --- | --- |
| `exact_count` | นับจริง | Count entries are compared to system stock and included in accuracy metrics |
| `sufficiency_check` | เช็คพอใช้ | Count entries skip accuracy scoring; purchase-order quantity uses manual `order_qty` |

Design rules:

- Policy controls are compact spreadsheet controls inside the inventory table, not separate edit modals.
- The `/[locale]/inventory/accuracy` report uses normal theme-token surfaces and pastel metric cards with `bb-pastel-surface`.

---

## 13. Inventory Performance UI (v9.0)

- Editable inventory rows may use `.bb-inventory-row-containment` to isolate layout/paint work and progressively render long grids.
- The containment class must not change spreadsheet behavior: inline inputs, blur/Enter save, realtime sync, mobile layout, and numeric display rules stay the same.
- Modal-only inventory surfaces (`PurchaseOrdersModal`, `InventoryHistoryModal`) should stay dynamically loaded and may preload on hover/focus intent from quick-action buttons.
