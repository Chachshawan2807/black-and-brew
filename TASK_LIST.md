# TASK_LIST.md

Implementation Roadmap (2026 Standard)

## Phase 1: Environment Setup (Low Latency Focus)

- [x] Initialize Next.js 16 with App Router & next-intl (i18n).
- [x] Configure Supabase Project with Thailand Edge Region.
- [x] Setup Tailwind CSS with Glassmorphism configuration.

## Phase 2: Core Engine & RLS

- [ ] Apply DB_SCHEMA.sql and seed initial 9 names (นิต้า, ปิ่น, มุก, เม, มีนา, ชัช, หนูดี, ฟิว, ล่า).
- [x] Implement Timezone Helper Functions (UTC to GMT+7).
- [ ] Build Real-time Broadcast for Shift updates.

## Phase 3: Interactive UI (Mobile-First)

- [ ] Develop "Drag-to-Shift" Calendar Interface.
- [ ] Create "Swap Request" module.
- [ ] Integrate WCAG 2.2 Accessibility check.

## Phase 4: MX & Edge Optimization

- [ ] Implement JSON-LD for AI interoperability.
- [ ] Deploy Edge Functions for fast data fetching.
