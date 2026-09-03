---
name: notification-smoke
description: Run the notification hub regression test suite before merge when touching FAB, panel, badge, or PWA push
user-invocable: true
---

# Notification Smoke

## When to use

- After any change to notification hub, UI, persistence, or `public/sw.js`
- Before claiming notification FAB / panel / badge / OS banner fixes are done
- When AI touched `use-inventory-notifications.ts` or files listed in `AGENTS.md` notification-hub-standard

## Run (terminal)

```bash
npm run skill:run notification-smoke
```

Equivalent:

```bash
npm run test:notifications
```

## What it does

Runs the Vitest notification regression bundle (fab sync, panel view-only, sync/counter, cross-tab, PWA bridge, channel gates, badge, iOS parity, mobile layout).

## Notes

- Exit code 0 prints `OK: notification-smoke passed`
- Does not run full `npm test`; use for targeted notification hub verification only
