# FEATURE SPECIFICATION: [Feature Name]

Status: Draft | Target Version: v2026.x

## 1. Overview & Scope

อธิบายวัตถุประสงค์ของฟีเจอร์นี้ และขอบเขตการทำงานหลัก (สิ่งที่ทำและสิ่งที่ไม่ทำ)

## 2. Constraints & Tech Stack

- Methodology: Outcome-First, Chained Thinking
- Performance Target: INP < 200ms
- Visual Standard: Zero-Bold Policy, dual theme tokens + time-based pastel (`bb-pastel-surface`)
- Accessibility: WCAG 2.2 AA Compliance

## 3. Data Integrity & Security

- RLS Principle: Treat AI Code as Untrusted
- Data Validation: Zod Schema enforcement
- Audit Trail: Required for sensitive operations

## 4. UI/UX Acceptance Checks

- [ ] Rounded-3xl corners applied to all new components
- [ ] Mobile-First Layout (App-like UX) verified
- [ ] Typography: Sarabun font with 1.6 line-height (Thai Integrity)
- [ ] No bold text (font-normal weight 400 only)

## 5. Performance Strategy

- Implementation of Partial Prerendering (PPR) if applicable
- Fluid Typography and Grid scaling verification
- Hydration error prevention (isMounted check)
