import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, describe, vi, beforeEach } from 'vitest';
import PinGateway from '@/components/auth/PinGateway';

// Mock framer-motion to avoid animation issues in jsdom environment
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  },
}));

// Mock the auth server actions
vi.mock('@/app/actions/auth', () => ({
  verifyPin: vi.fn(),
  checkAuth: vi.fn(async () => false),
  getAuthSessionInfo: vi.fn(async () => ({ verified: false, readOnly: false })),
}));

// Mock supabase session helper
vi.mock('@/lib/supabase-session', () => ({
  ensureSupabaseSession: vi.fn(async () => true),
}));

describe('PinGateway Persistent Authentication', () => {
  beforeEach(() => {
    // Clear storages before each test
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  test('should block access when sessionStorage is empty', () => {
    render(
      <PinGateway>
        <div data-testid="protected-content">Secret Dashboard</div>
      </PinGateway>
    );

    // It should NOT show the protected content
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();

    // It should display the Security Gateway PIN prompt
    expect(screen.getByText(/Security Gateway/i)).toBeInTheDocument();
  });

  test('should allow access when server session cookie is verified', async () => {
    const { getAuthSessionInfo } = await import('@/app/actions/auth');
    vi.mocked(getAuthSessionInfo).mockResolvedValueOnce({ verified: true, readOnly: false });

    render(
      <PinGateway>
        <div data-testid="protected-content">Secret Dashboard</div>
      </PinGateway>
    );

    expect(await screen.findByTestId('protected-content')).toBeInTheDocument();
    expect(screen.queryByText(/Security Gateway/i)).not.toBeInTheDocument();
  });

  test('should NOT allow access if only localStorage has auth keys without server cookie', () => {
    localStorage.setItem('bb_auth_pin_verified', 'true');

    render(
      <PinGateway>
        <div data-testid="protected-content">Secret Dashboard</div>
      </PinGateway>
    );

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.getByText(/Security Gateway/i)).toBeInTheDocument();
  });

  test('should mask PIN digits with dots immediately while typing', () => {
    render(
      <PinGateway>
        <div data-testid="protected-content">Secret Dashboard</div>
      </PinGateway>
    );

    const pinInput = screen.getByLabelText('รหัสผ่าน 6 หลัก');
    fireEvent.change(pinInput, { target: { value: '1' } });

    expect(screen.getByLabelText('รหัสผ่าน 6 หลัก')).toHaveValue('1');
    expect(screen.queryByText('1')).not.toBeInTheDocument();
    expect(document.querySelector('.rounded-full.bg-foreground')).toBeInTheDocument();
  });

  test('should restore read-only flag from server session via AuthProvider', async () => {
    const { getAuthSessionInfo } = await import('@/app/actions/auth');
    vi.mocked(getAuthSessionInfo).mockResolvedValueOnce({ verified: true, readOnly: true });

    render(
      <PinGateway>
        <div data-testid="read-only-probe">ok</div>
      </PinGateway>
    );

    expect(await screen.findByTestId('read-only-probe')).toBeInTheDocument();
    expect(localStorage.getItem('bb_auth_read_only')).toBe('true');
    expect(screen.queryByText(/Security Gateway/i)).not.toBeInTheDocument();
  });
});
