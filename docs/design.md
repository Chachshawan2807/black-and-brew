# Design Standards — BLACKANDBREW ERP

> **Version:** 6.3 | **Last Updated:** 2026-06-04 | **Standard:** Black-on-Pastel, High-Legibility

---

## 1. Design Philosophy

**Minimalist Analog** — ดีไซน์ที่สื่อถึงความเรียบง่าย สะอาดตา และใช้งานง่าย เหมือนกระดาษที่ตัดมาวางบนโต๊ะ

- ไม่มี Visual Clutter — ทุกพิกเซลมีหน้าที่
- Black-on-Pastel — ตัวหนังสือดำบนพื้นหลังอ่อน
- High-Legibility — อ่านง่ายในทุกสภาพแสง

---

## 2. Color Palette

| Token | Value | Usage |
| :--- | :--- | :--- |
| `--text-primary` | `#000000` | หัวข้อ, ข้อมูลหลัก, Labels |
| `--text-secondary` | `#000000/60` (opacity 60%) | ข้อมูลรอง, คำอธิบาย |
| `--text-muted` | `#000000/40` (opacity 40%) | Timestamps, Hints |
| `--bg-primary` | `#fdfcf0` | Morning Latte Cream — พื้นหลังหลัก |
| `--bg-card` | `white` | Cards, Modals |
| `--bg-input` | `#fdfcf0/50` (opacity 50%) | Input fields, Form backgrounds |
| `--bg-hover` | `#000000/5` (opacity 5%) | Row hover, Interactive elements |
| `--border` | `#000000/5` (opacity 5%) | Borders, Separators |
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
| :--- | :--- | :--- |
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
Secondary: bg-white text-black border border-black/5 rounded-3xl shadow-sm hover:bg-slate-50
Danger:    bg-red-500 text-white rounded-3xl hover:bg-red-600
```

### Modals

```text
Overlay:   bg-slate-900/20 backdrop-blur-sm (standard) or bg-black/40 backdrop-blur-md (heavy)
Container: bg-white or bg-[#fdfcf0] rounded-3xl shadow-xl max-w-xl animate-in fade-in zoom-in-95
Header:    px-6 py-5 border-b border-slate-100 flex justify-between
```

### Table (Spreadsheet-Style)

```text
Wrapper:   border border-black/5 bg-[#fdfcf0]/80 backdrop-blur-md rounded-3xl shadow-sm
Header:    bg-slate-50/50 text-black/60 text-[13px] uppercase tracking-wider
Row:       border-b border-black/5 hover:bg-black/5 transition-all duration-300
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
| :--- | :--- |
| **Hover** | `transition-all duration-300` |
| **Active/Click** | `active:scale-95` |
| **Drag** | `opacity-70 scale-[1.02] shadow-xl z-[100]` |
| **Focus (Input)** | `focus:bg-[#fdfcf0]/80` or `focus:ring-1 focus:ring-black/10` |
| **Loading** | `Loader2` icon with `animate-spin` |
| **Save Feedback** | `✓ Synced` (emerald-500) → fades after 2s |

---

## 7. Z-Index Layering

| Layer | Z-Index | Element |
| :--- | :--- | :--- |
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
