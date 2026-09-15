# Notification mobile smoke checklist

Manual smoke on a real phone or tablet (Android Chrome PWA and iOS Safari Home Screen). Run after changes to the notification hub, service worker, or push registration.

**Automated gate (dev machine):** `npm run test:notifications`

**Hub (do not bypass when debugging):** `src/hooks/use-inventory-notifications.ts`

---

## 0. Prerequisites

| Step | Action | Pass |
| ---- | ------ | ---- |
| 0.1 | Use production or preview URL (service worker is disabled in local `NODE_ENV=development`). | ☐ |
| 0.2 | Sign in with PIN (complete `PinGateway` if shown). | ☐ |
| 0.3 | Note locale: Thai `https://<host>/th/...` or English `https://<host>/en/...`. | ☐ |

---

## 1. Settings path and notification prefs

**Navigation:** Menu (sidebar or mobile drawer) → **ตั้งค่า** / **Settings** → `/{locale}/settings` (e.g. `/th/settings`).

**Section:** **การแจ้งเตือน** / **Notifications** (top section with bell icon).

| Step | UI (TH) | UI (EN) | Pass |
| ---- | ------- | ------- | ---- |
| 1.1 | เปิดสวิตช์ **การแจ้งเตือน** (master). อนุญาตเมื่อระบบถาม permission. | Turn on **Notifications** master switch. Allow OS prompt. | ☐ |
| 1.2 | หลังอนุญาต สถานะควรเป็น **ลงทะเบียนรับการแจ้งเตือนแล้ว** (สีเขียว) ภายในไม่กี่วินาที (ไม่ต้องรอ idle นาน). | Status turns green within a few seconds after allow. | ☐ |
| 1.3 | **iOS only:** ถ้ามีปุ่ม **ลงทะเบียนการแจ้งเตือนบนเครื่องนี้** ให้กดหลัง master เปิด (ต้องเป็น user gesture). | Tap **Register notifications on this device** if shown. | ☐ |
| 1.4 | ใต้ **ปรับรายละเอียด** / **Fine-tune**, เปิดช่องที่จะทดสอบ: **แจ้งเตือนคลังสินค้า**, **แจ้งเตือนระบบ** (background OS). | Enable **Inventory alerts** and **System notifications** for stock + push tests. | ☐ |
| 1.5 | (Optional) เปิด **สรุปตารางงานรายวัน**, **การแจ้งเตือนที่ต้องตรวจสอบข้ามโมดูล**, **แจ้งเตือนความปลอดภัย** ตามช่องที่ต้องการทดสอบ. | Enable other channels as needed. | ☐ |
| 1.6 | ถ้าเห็นข้อความสีเหลืองว่า permission ถูกบล็อก ไปเปิดใน **การตั้งค่าอุปกรณ์** แล้วกลับมาทำ 1.1 อีกครั้ง. | Fix blocked notifications in device OS settings, then repeat 1.1. | ☐ |

**PWA install (recommended for background push):**

- Same Settings page: use **ติดตั้งแอป** / PWA install section if your build exposes it (`SettingsPwaInstallSection`).
- **iOS:** Share → Add to Home Screen, then open from icon (not only a Safari tab).

---

## 2. FAB and in-app panel (foreground)

**Where:** Any authenticated page after shell loads (e.g. `/th/inventory`). Yellow bell FAB bottom-right (safe area).

| Step | Action | Expected | Pass |
| ---- | ------ | -------- | ---- |
| 2.1 | Wait ~1 s after first paint. | Notification FAB appears (before or with inventory quick-action FAB). | ☐ |
| 2.2 | On another device or browser tab (same account), change inventory (add or adjust stock). | Within ~1–2 s: FAB badge count increases (not capped at 99). | ☐ |
| 2.3 | Tap FAB. | Panel opens; FAB fades/hides; no navigation to another route. | ☐ |
| 2.4 | Check list grouping. | **วันนี้** / **Today** with time in **Asia/Bangkok** (date + short time). | ☐ |
| 2.5 | Tap backdrop or **ปิด** / **Close**. | Panel closes; FAB returns. | ☐ |
| 2.6 | Open panel → **อ่านทั้งหมด** / mark all read. | Badge clears; rows show read state. | ☐ |
| 2.7 | **Two tabs same device:** trigger event in tab A. | Tab B updates badge without manual refresh (cross-tab sync). | ☐ |

**Panel rules (must not break):** rows are view-only (no links, no row navigation).

---

## 3. Android: OS notification (background)

| Step | Action | Expected | Pass |
| ---- | ------ | -------- | ---- |
| 3.1 | Confirm 1.4: **แจ้งเตือนระบบ** on, permission granted, server registered. | Status green in Settings. | ☐ |
| 3.2 | Open PWA or Chrome installed app, then send app to background (home button). | App not in foreground. | ☐ |
| 3.3 | From another session, trigger inventory change eligible for push. | Android system notification (title + body separate). | ☐ |
| 3.4 | Tap notification. | App opens or focuses; no deep link to a specific ERP page (shell only). | ☐ |
| 3.5 | Reopen app. | FAB badge and panel list match push (no duplicate OS banner for same event). | ☐ |

---

## 4. iOS: OS notification (background)

| Step | Action | Expected | Pass |
| ---- | ------ | -------- | ---- |
| 4.1 | Open app from **Home Screen** icon (PWA). Complete 1.1–1.3. | Server registered; no WebKit-incompatible crash. | ☐ |
| 4.2 | Background the app. Trigger inventory change from elsewhere. | iOS banner appears (simplified options, readable Thai/EN body). | ☐ |
| 4.3 | Tap banner. | App foregrounds. | ☐ |
| 4.4 | Open FAB panel. | Same event listed with Bangkok timestamp; badge consistent. | ☐ |

---

## 5. Resume and timing

| Step | Action | Expected | Pass |
| ---- | ------ | -------- | ---- |
| 5.1 | Background app > 2 s, trigger event, return to app. | `syncFromStorageAndServer` hydrates list; missed events appear. | ☐ |
| 5.2 | Brief switch away (< 2 s) and back. | No unnecessary disconnect flicker; badge still correct. | ☐ |
| 5.3 | Compare panel time to actual change time. | Matches `occurred_at` in Bangkok, not device travel timezone drift. | ☐ |

---

## 6. Channel spot checks (optional)

| Channel | Settings toggle (TH) | Rough trigger |
| ------- | -------------------- | ------------- |
| Inventory | แจ้งเตือนคลังสินค้า | Stock add/edit/delete |
| System / closed app | แจ้งเตือนระบบ | Web Push when backgrounded |
| Schedule summary | สรุปตารางงานรายวัน | Cron summaries (05:00 / 18:00) |
| Insights | การแจ้งเตือนที่ต้องตรวจสอบข้ามโมดูล | Cross-module insight logs |
| Security | แจ้งเตือนความปลอดภัย | PIN lockout events |

---

## 7. Failure notes

Record for each failure:

- Device, OS version, browser, PWA vs tab
- URL and locale
- Settings screenshot (master + fine-tune toggles + registration line)
- Whether foreground FAB, background OS, or both failed
- Approximate delay (seconds) from action to UI

---

## Related code

| Layer | Path |
| ----- | ---- |
| Hub | `src/hooks/use-inventory-notifications.ts` |
| Provider / panel | `src/components/notifications/NotificationProvider.tsx` |
| FAB | `src/components/notifications/InventoryNotificationFAB.tsx` |
| Settings UI | `src/app/[locale]/settings/_components/NotificationPreferencesSection.tsx` |
| Service worker | `public/sw.js` |
