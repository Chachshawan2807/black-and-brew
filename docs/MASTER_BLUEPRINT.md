# Black-and-Brew ERP: MASTER BLUEPRINT [R0]

## 🏛️ Architectural Core

The system is built on Next.js 15 (Turbopack) and Supabase, prioritizing extreme visual consistency, high-fidelity interactions, and robust data persistence.

### 1. Visual Standard: "Pastel Frictionless"

- **Color Palette**: Minimalist Pastel (#fdfcf0 background, soft greens/blues/reds for status).
- **Typography**: **ZERO-BOLD POLICY**. All text must use `font-normal`. Emphasis is achieved via color intensity or layout, never via font weight.
- **Interactions**: Snappy, spring-based animations (Framer Motion).
- **Legibility**: Pure black (#000000) text on pastel backgrounds for maximum contrast.

### 2. Interaction Engine: "Precision DnD"

- **Library**: `dnd-kit`.
- **Sensors**: `PointerSensor` (distance: 5px), `KeyboardSensor`.
- **Collision**: `closestCorners`.
- **Feedback**:
  - Row Drag: `scale: 1.02`, `opacity: 0.8`.
  - Card Drag: `scale: 1.05`, `opacity: 0.7`.
  - Z-Index: `100` for active items.
- **Physics**: Framer Motion `layout` prop with `stiffness: 300`, `damping: 30`.

### 3. Data Integrity: "Service Role Protocol"

- **Persistence**: All critical database mutations (reordering, stock updates) must bypass RLS using the **Supabase Service Role Key** via Server Actions.
- **Atomic Updates**: Use `Promise.all` for batch updates (e.g., reordering entire lists) followed by `revalidatePath`.
- **Zero-Stock Logic**: Numeric inputs must treat empty strings as `0` and explicitly persist `0` to the database.

## 📂 Module Status

| Module | DnD Status | Persistence | UI Mirroring |
| :--- | :--- | :--- | :--- |
| **Inventory** | SOURCE (Gold) | Service Role | 100% |
| **Staff Dashboard** | MIRRORED | Service Role | 100% |
| **Schedule** | MIRRORED | Service Role | 100% |
| **AI Assistant (Bru)** | STABLE | AI SDK v6 | 100% |

## 🛠️ Global Rules

- **Naming**: Strictly use `inventory_item_id` for transaction foreign keys.
- **Revalidation**: Call `revalidateAppPaths` after any cross-module mutation.
- **Testing**: Follow TDD SOP for all new logic.
- **AI Hydration**: Use `AIChatWrapper` (dynamic import with `ssr: false`) to prevent `Math.random` prerender errors.

---
Last Updated: 2026-05-16 [REBIRTH COMPLETED]
