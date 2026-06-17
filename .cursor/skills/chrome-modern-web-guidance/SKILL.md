---
name: chrome-modern-web-guidance
description: |
  Baseline reference for modern frontend and mobile layout per Chrome Modern Web Guidance
  (Chrome 149 era). MANDATORY before writing HTML/CSS/clientside JS UI. Steers away from
  deprecated/legacy patterns toward native platform APIs with Baseline-aware fallbacks.

  Trigger for: modals, drawers, popovers, forms, responsive/mobile layout, dark mode,
  animations, performance (LCP/INP/CLS), accessibility, images, navigation, touch UI.
---

# Chrome Modern Web Guidance — Project Baseline

> **Sources (do not deviate without verifying):**
> [Modern Web Guidance](https://developer.chrome.com/docs/modern-web-guidance) ·
> [Get started](https://developer.chrome.com/docs/modern-web-guidance/get-started) ·
> [Chrome 149 release notes](https://developer.chrome.com/release-notes/149) ·
> [GitHub: GoogleChrome/modern-web-guidance](https://github.com/GoogleChrome/modern-web-guidance)
>
> **Chrome 149 stable:** 2026-06-02. This skill summarizes official guidance as of that release.

## When to apply

Apply this skill **at the start** of any frontend or mobile-layout task before writing code:

- New UI components, pages, modals, drawers, toolbars, FABs
- Responsive / mobile layout changes
- Form UX, validation styling, autofill
- Performance-sensitive UI (grids, carousels, long lists)
- Accessibility audits or keyboard/touch flows

**Do not** use for backend, CI/CD, database, or non-browser scripts.

## Baseline target (browser compatibility)

Per [Modern Web Guidance Baseline rules](https://developer.chrome.com/docs/modern-web-guidance/get-started):

| Level | Meaning |
|-------|---------|
| **Limited availability** | Not interoperable — requires fallback or progressive enhancement |
| **Newly available** | Interoperable within last ~30 months — follow guide fallbacks |
| **Widely available** | Interoperable 30+ months — safe default without fallback |

**Default for this project:** **Baseline Widely available** — defined in `AGENTS.md` (FRONTEND & MOBILE UI — UNIFIED STANDARD). Do not lower this target without explicit user approval.

Rules:

1. **Widely available** features — use directly, no polyfill required.
2. **Newly / Limited** features — implement per guide fallbacks; load polyfills **conditionally** only when the guide requires it.
3. Prefer **progressive enhancement** (modern path + lightweight custom fallback &lt;50 LOC) over heavy legacy libraries.
4. Never ship a feature that **only** works in one engine without documenting the trade-off.

## Live guide lookup (authoritative detail)

This file is a **baseline summary**. For any non-trivial feature, retrieve the full calibrated guide:

```powershell
# Windows: prefer npx.cmd if npx hangs in MCP/IDE context
npx -y modern-web-guidance@latest search "<what you want to build>"
npx -y modern-web-guidance@latest retrieve "<guide-id>"
```

Example IDs: `html`, `accessibility`, `navigation-drawer`, `size-aware-styling`, `dark-mode`, `validate-input-after-interaction`, `break-up-long-tasks`, `animate-to-from-top-layer`, `declarative-dialog-popover-control`.

**Do not hallucinate guide content** — if unsure, search + retrieve first.

---

## Core principles (anti-legacy)

From [Modern Web Guidance rationale](https://developer.chrome.com/docs/modern-web-guidance/get-started):

1. **Prefer native HTML/CSS/JS platform APIs** over JavaScript libraries that duplicate browser behavior.
2. **Do not default to outdated training-data patterns** (custom modals, jQuery-style overlays, scroll listeners for layout, etc.).
3. **Respect user preferences:** `prefers-reduced-motion`, `prefers-color-scheme`, `prefers-contrast`.
4. **Performance is a feature:** optimize LCP, INP, CLS; break up long tasks; defer offscreen work.
5. **Accessibility is the floor:** semantic HTML first; ARIA only when native semantics are insufficient.

---

## Deprecated / legacy → modern replacements

Use this matrix. **Left column = avoid for new code.**

| Avoid (legacy) | Use instead (modern) | Notes |
|----------------|----------------------|-------|
| Custom modal `div` + JS focus trap | `<dialog>` + `.showModal()` | Use `closedby="any"` for light-dismiss; `popover` for non-modal |
| `dialog.show()` when trap expected | `dialog.showModal()` | `show()` is non-modal |
| Tooltip/menu libraries | Popover API (`popover`, `popovertarget`) + CSS Anchor Positioning | See `interest-triggered-tooltips`, `position-aware-tooltips` |
| JS accordion plugins | `<details>` / `<summary>` + `name` for exclusive sets | No JS required for basic accordions |
| `<div role="button">` / `<span onclick>` | `<button type="button">` | Use `<a href>` only for navigation |
| Inline `onclick=""` handlers | `addEventListener()` | |
| `disabled="disabled"` boolean style | `disabled` (boolean attribute) | |
| `aria-*` duplicating native semantics | Native elements (`<button>`, `<nav>`, `required`) | Exception: `role="list"` when `list-style:none` + flex/grid strips list semantics in Safari |
| `:invalid` styling on page load | `:user-invalid` / `:user-valid` | Show errors **after** interaction |
| `autocomplete="off"` on login/address/payment | Specific tokens (`email`, `street-address`, `cc-number`, etc.) | |
| `title` attribute for tooltips | Popover / `popover="hint"` patterns | |
| Tables for layout | CSS Grid / Flexbox | |
| Viewport-only `@media` for components | **Container queries** (`container-type`, `@container`) | Media queries for page-level only |
| `100vh` on mobile sheets | `100svh` / `dvh` / `lvh` as appropriate | Drawer pattern uses `100svh` to avoid iOS URL bar jump |
| `loading="lazy"` on LCP/hero images | `fetchpriority="high"` + no lazy on above-fold | Always set `width` + `height` on `<img>` |
| Overuse of `fetchpriority="high"` | Single LCP candidate high; demote carousels/trackers with `low` | |
| Positive `tabindex` (1, 2, 3…) | DOM order; `tabindex="0"` or `-1` for programmatic focus | |
| `user-scalable=no` / blocking zoom | Allow zoom — never disable | |
| Heavy scroll `addEventListener` for reveal FX | Scroll-driven animations, `scroll-timeline` | Gate with `@supports` |
| Synchronous long loops blocking main thread | `scheduler.yield()` / task splitting | See `break-up-long-tasks` |
| Custom backdrop `div` stacks | `::backdrop` on `<dialog>` / popover | |
| Password-only auth for new flows | WebAuthn passkeys where applicable | Guides under `passkeys/*` |

---

## HTML document baseline

From guide `html` ([retrieve](https://github.com/GoogleChrome/modern-web-guidance)):

### DO

- `<!DOCTYPE html>`, `<html lang="…">`
- `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
- One `<h1>` per page/view; sequential heading hierarchy
- Landmarks: `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`, `<search>`
- `<button type="button">` for actions; `<a href>` for navigation
- `fetchpriority="high"` on LCP image; `loading="lazy"` off-screen only
- `width` + `height` on images/video to prevent CLS
- `<dialog>` for modals; Popover API for menus/tooltips/toasts
- `<details>`/`<summary>` for inline disclosure
- `inert` on background when overlay/drawer is open
- Pass state to CSS via **custom properties** on `style`, not static inline CSS

### DON'T

- Generic `<div>`/`<span>` when semantic elements exist
- Redundant ARIA on native elements
- `role="presentation"` / `aria-hidden="true"` on focusable nodes or ancestors
- Nest interactive elements inside `<summary>`
- Static design tokens as inline styles (colors, padding) — use stylesheets / CSS variables

### Native overlay decision matrix

| Feature | Modality | Focus | Dismiss | Use case |
|---------|----------|-------|---------|----------|
| `<dialog>` | Modal / non-modal | Auto trap (modal) | Esc, form, `closedby` | Confirmations, settings |
| `[popover]` | Non-modal | Normal tab flow | Light-dismiss | Menus, tooltips, toasts |
| `<details>` | Inline | Normal tab flow | Toggle | FAQs, accordions |

**Rule:** Interruptions requiring action → `<dialog>`. Transient UI → `popover`. Inline expand → `<details>`.

---

## Mobile layout & touch UI

### Viewport & units

- Viewport meta: `width=device-width, initial-scale=1.0` — **never** disable zoom.
- Prefer **dynamic viewport units** where mobile chrome affects layout:
  - `svh` — small viewport (stable during iOS Safari chrome show/hide) — use for full-height sheets/drawers
  - `dvh` / `lvh` — when semantics match design intent
  - `dvw` — drawer width caps (e.g. `min(20em, 80dvw)`)

### Component-level responsiveness

- **Container queries** over viewport breakpoints for reusable cards, nav bars, dashboard widgets (`size-aware-styling`).
- Safe default: stacked/mobile-first layout; enhance with `@container` inside `@supports (container-type: inline-size)`.

### Navigation drawer (mobile menu pattern)

Official pattern: guide `navigation-drawer`. Summary:

| Piece | Modern approach |
|-------|-----------------|
| Layer | `popover="manual"` (not `auto`/`hint` for swipe drawers) |
| Motion | Horizontal **scroll-snap** (native swipe physics), not JS `transform` tweens |
| Backdrop | `::backdrop` + `--drawer-backdrop` driven by scroll-driven animation |
| State | `IntersectionObserver` on sheet — not raw scroll position alone |
| A11y | `aria-expanded`, `aria-controls`, `main[inert]` when open, focus into sheet |
| Dismiss | Tap outside, Escape, swipe to closed snap |
| Reduced motion | `scroll-behavior: smooth` only inside `@media (prefers-reduced-motion: no-preference)` |

**Fallbacks (feature-detect, don't guess):**

- No `animation-timeline` → `scroll` listener sets `--drawer-backdrop`
- No `scroll-initial-target` → jump-scroll to closed stop before open animation
- No Popover → `position:fixed` + high `z-index` + sibling backdrop element (same CSS variables)

### Touch & mobile forms

- Match `type`, `inputmode`, and `autocomplete` together (`type="email"` + `inputmode="email"` + `autocomplete="email"`).
- Use `enterkeyhint` where keyboard action label matters.
- Full-width tap targets for primary actions (align with project clickable-input rules in `AGENTS.md`).

### Mobile chrome / safe areas

- Respect `env(safe-area-inset-*)` for fixed FABs, bottom bars, notches.
- `overscroll-behavior: none` on horizontal swipe surfaces to prevent scroll chaining.

---

## CSS layout & visual design

### Prefer (Baseline-friendly)

- **Flexbox / Grid** for layout; **subgrid** when aligning nested tracks
- **Container queries** (`container-type: inline-size`, `@container`)
- **`:has()`** for parent styling from child state (e.g. invalid field → label style)
- **Modern color:** `oklch()`, `light-dark()`, `color-scheme`; design tokens via CSS variables
- **Typography:** `text-wrap: balance` / `pretty`; `text-box` for trimming
- **`accent-color`** for native form controls (project: pair with theme tokens, not hardcoded surfaces)
- **`prefers-color-scheme`** + `color-scheme` for dark mode (`dark-mode` guide) — complements project `next-themes` / `bb-theme`
- **`@starting-style` + `transition-behavior`** for entry/exit of top-layer UI
- **View Transitions** for SPA route changes when appropriate
- **Scroll-driven animations** — always behind `@supports (animation-timeline: scroll())`

### Chrome 149 CSS additions (progressive enhancement)

From [Chrome 149 release notes](https://developer.chrome.com/release-notes/149):

- **CSS gap decorations** — style grid/flex gaps (`column-rule-inset`, `row-rule-inset`, etc.); unsupported browsers show normal gaps (no decoration).
- **`text-overflow: ellipsis`** — on user interaction, text temporarily switches to `clip` so hidden content is editable/navigable.
- **`shape-outside`** — `path()`, `shape()`, `rect()`, `xywh()` support expanded.
- **`image-rendering: crisp-edges`** — nearest-neighbor scaling (aligned with Firefox/Safari).
- **Top-layer pseudo-classes** — `:hover`/`:active`/`:focus-within` on parents stop at first top-layer boundary.

Use gap decorations and new shape functions only as **enhancement**, not as sole layout mechanism.

---

## Forms & validation

From guides `forms`, `validate-input-after-interaction`, `required-field-feedback`:

- Show validation **after interaction**, not on first paint — CSS `:user-invalid`, not bare `:invalid`.
- Sync `aria-invalid` with visual invalid state for screen readers (`accessible-error-announcement`).
- `field-sizing: content` for auto-growing inputs where supported.
- Correct `autocomplete` tokens per form type (sign-in, sign-up, address, payment guides).
- Native `<select>` customization via **customizable `<select>`** patterns before building from scratch.

---

## Performance (Core Web Vitals)

Mandatory checks for interactive UI:

| Metric | Guidance |
|--------|----------|
| **LCP** | Prioritize hero/LCP image: `fetchpriority="high"`, preload if CSS background, explicit dimensions |
| **CLS** | `width`/`height` on media; avoid injecting content above existing UI |
| **INP** | Break long tasks (`scheduler.yield`, `break-up-long-tasks`); defer work until `scrollend`; avoid layout thrash in grids |
| Offscreen content | `content-visibility: auto`, `loading="lazy"` |
| Next navigation | Speculation Rules / prefetch on likely links (`improve-next-page-load-performance`) |
| Background tabs | Pause off-screen canvas/WebGL/polling (`efficient-background-processing`) |

---

## Accessibility essentials

From guide `accessibility` — minimum bar:

- Landmarks + heading outline + skip link to `<main tabindex="-1">`
- Native naming: `<label for>`, `<caption>`, `<legend>`, `aria-labelledby` over `aria-label` when visible label exists
- Icon-only buttons: accessible name via visible text or `.visually-hidden`
- Focus: never trap users; restore focus on dialog close; `inert` on obscured content
- Tables: `<caption>`, `scope` on `<th>` — not for layout
- Test with keyboard + screen reader tree; patterns are use-case specific

---

## Security & privacy (frontend)

Retrieve guide `privacy` for CSP, third-party audits, data minimization. Starter prompts from [official docs](https://developer.chrome.com/docs/modern-web-guidance):

- CSP without breaking the app
- Passkey flows (`passkeys/*` guides)

---

## Chrome 149 platform notes (web APIs)

Stable in Chrome 149 ([release notes](https://developer.chrome.com/release-notes/149)):

| Feature | Implication for frontend |
|---------|--------------------------|
| **WebSocket + bfcache** | Connections close on bfcache entry — reconnect on `pageshow` / `persisted` if needed |
| **Selective Clipboard read** | `clipboard.read()` returns types lazily via `getType()` |
| **`autocorrect="off"`** | Honored on Windows touch keyboard |
| **WebMCP** (origin trial) | Experimental agent-facing tools — not production default; Chrome 149+ flags required |

Do not build production features solely on origin-trial APIs unless explicitly requested.

---

## Integration with BLACKANDBREW ERP

Canonical merged rules live in **`AGENTS.md` → FRONTEND & MOBILE UI — UNIFIED STANDARD**. Summary:

| Area | Rule |
|------|------|
| **Baseline** | Widely available (stability for all staff devices) |
| **Theme** | `bb-theme` tokens; no hardcoded surface colors |
| **Pastel** | `bb-pastel-surface` / `PASTEL_SURFACE` on shift cards |
| **Touch** | Full hitbox on date pickers; safe-area on fixed UI |
| **Spreadsheet** | Inline `<input>` in `<td>`, auto-save, no edit modals |
| **Data sync** | Optimistic UI + immediate Supabase reflection |

When Modern Web Guidance conflicts with ERP-specific UX (e.g. spreadsheet modals ban), **ERP rules win** for that context.

---

## Agent checklist (before shipping UI)

- [ ] Searched `modern-web-guidance` for the use case; retrieved relevant guide(s)
- [ ] No deprecated patterns from table above
- [ ] Baseline level verified; fallbacks implemented if below Widely available
- [ ] Mobile: viewport meta, touch targets, `svh`/safe-area where fixed UI
- [ ] Overlays use native `<dialog>` / `popover` / `<details>` per matrix
- [ ] Images: dimensions + correct priority/lazy
- [ ] Forms: `:user-invalid` + `aria-invalid` sync
- [ ] `prefers-reduced-motion` respected
- [ ] INP: no unbounded sync work on input handlers
- [ ] Project theme tokens used (not legacy hardcoded colors)

---

## References

- Modern Web Guidance hub: https://developer.chrome.com/docs/modern-web-guidance
- Get started + Baseline: https://developer.chrome.com/docs/modern-web-guidance/get-started
- Chrome 149 release notes: https://developer.chrome.com/release-notes/149
- New in Chrome 149: https://developer.chrome.com/blog/new-in-chrome-149
- DevTools 149 / WebMCP debugging: https://developer.chrome.com/blog/new-in-devtools-149
- GitHub skills + 128 use cases: https://github.com/GoogleChrome/modern-web-guidance
- Baseline feature explorer: https://web-platform-dx.github.io/web-features-explorer/
- Install full skill pack: `npx modern-web-guidance@latest install`
