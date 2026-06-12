# Refactor Phase 0 — Baseline & Regression Checklist

**Goal:** Establish measurable baseline before refactor; define smoke-test checklist for every PR.

## Baseline Commands

```bash
npm run test          # Record pass count
npm run test:coverage # Record coverage summary
npm run build         # Record build time + First Load JS per route
npm run analyze       # Open bundle analyzer (optional, post-build)
```

## Regression Checklist (run after every refactor PR)

### Inventory (`/[locale]/inventory`)

- [ ] Edit cell → auto-save on blur/Enter
- [ ] Undo/redo works (single click)
- [ ] Drag reorder rows (desktop + mobile)
- [ ] PO export generates image
- [ ] Realtime sync from another tab
- [ ] FAB quick action opens and saves

### Schedule (`/[locale]/schedule`)

- [ ] Drag shift between cells
- [ ] Undo/redo
- [ ] Week navigation
- [ ] Regular holidays display
- [ ] Holiday sync for week range

### Sales (`/[locale]/sales`)

- [ ] Charts render
- [ ] XLSX upload processes
- [ ] Category edit updates metrics
- [ ] Metrics cache persists on reload

### Dashboard (`/[locale]/dashboard`)

- [ ] LiveShiftList updates on realtime (no full page flash)
- [ ] MonthlyRoster loads
- [ ] LiveStatusTracker shows correct statuses

### Auth & Settings

- [ ] PIN gateway blocks unauthenticated access
- [ ] Logout clears session
- [ ] Remote session revocation works
- [ ] Theme toggle (light/dark/system)
- [ ] Notification preferences persist

### Notifications

- [ ] Bell shows unread count
- [ ] Panel opens and lists items
- [ ] Inventory change alerts appear

## Automated Gates (every PR)

```bash
npm run lint
npm run test
npm run build
```
