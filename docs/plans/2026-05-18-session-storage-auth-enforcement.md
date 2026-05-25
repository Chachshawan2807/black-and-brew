# Implementation Plan: Session-Only PIN Gateway Authentication Enforcement

## Goal

Secure the PIN Gateway system in the `BLACKANDBREW ERP` by completely removing `localStorage` for authentication states and strictly using `sessionStorage`. This guarantees that the user must enter the 6-digit PIN code whenever they open a new tab or restart the browser.

## Architecture & Tech Stack

- **Framework**: Next.js (App Router)
- **Component**: React Client Component with `isMounted` hydration guard
- **Authentication Mechanism**: Server Action for PIN validation (`verifyPin`), client-side session persistence via `sessionStorage`
- **Testing**: Vitest (`jsdom` environment)

## Steps

### Step 1: Write a Failing TDD Test Case (RED Phase)

Create `src/test/session_auth.test.tsx` to verify that:

1. `PinGateway` initially mounts and checks authentication.
2. When `sessionStorage` has `bb_auth_pin_verified` set to `'true'`, it should allow viewing child components.
3. When `sessionStorage` is empty/null, it should render the security PIN input/gateway and not fall back to `localStorage` or server check.
4. When logging out, `sessionStorage` auth state is properly cleared.

Run `npm run test` to verify the test is failing (or that it doesn't compile/pass until code changes are made).

### Step 2: Purge `localStorage` Auth Logic & Enforce `sessionStorage` in `PinGateway.tsx`

1. In `src/components/auth/PinGateway.tsx`:
   - Delete/refactor the `checkAuth()` call in `useEffect` that bypasses the PIN screen via server cookies, as the cookie is shared across tabs and persists for 1 day.
   - Read from `sessionStorage` (`sessionStorage.getItem('bb_auth_pin_verified')`) instead.
   - If `bb_auth_pin_verified === 'true'`, set `isAuthenticated` to `true`. Otherwise, show the PIN prompt.
   - When the server action `verifyPin` returns `{ success: true }`, set `sessionStorage.setItem('bb_auth_pin_verified', 'true')` and transition state.
   - Keep the brute-force lockout states (`bb_failed_attempts` and `bb_lockout_until`) in `localStorage` since lockout needs to persist across tabs/refreshes to prevent lockout bypass.

### Step 3: Update Logout Logic in `Menu.tsx`

In `src/components/sidebar/Menu.tsx` (Logout action):

- Clear `sessionStorage.removeItem('bb_auth_pin_verified')`.
- Remove `localStorage.removeItem('bb_auth_pin')` or any other references to auth in `localStorage`.

### Step 4: Verify the Tests (GREEN Phase)

Run `npm run test` to ensure all tests pass (including the new auth session tests and the existing test suite).

### Step 5: Verify the Build & Styling

Run `npm run build` to verify Next.js build integrity and ensure that the Zero-Bold and Pastel Morning Latte palette guidelines are strictly adhered to.
