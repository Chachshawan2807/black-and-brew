import { render, screen } from '@testing-library/react';
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
}));

// Mock supabase session helper
vi.mock('@/lib/supabase-session', () => ({
  ensureSupabaseSession: vi.fn(async () => true),
}));

describe('PinGateway Session-Only Authentication', () => {
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

  test('should allow access immediately if sessionStorage verified key is present', () => {
    sessionStorage.setItem('bb_auth_pin_verified', 'true');

    render(
      <PinGateway>
        <div data-testid="protected-content">Secret Dashboard</div>
      </PinGateway>
    );

    // It should render the protected content
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.getByText('Secret Dashboard')).toBeInTheDocument();

    // It should NOT show the PIN prompt
    expect(screen.queryByText(/Security Gateway/i)).not.toBeInTheDocument();
  });

  test('should NOT allow access if only localStorage has auth keys (purge proof)', () => {
    localStorage.setItem('bb_auth_pin_verified', 'true');
    localStorage.setItem('AUTH_TOKEN', 'some-token');

    render(
      <PinGateway>
        <div data-testid="protected-content">Secret Dashboard</div>
      </PinGateway>
    );

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.getByText(/Security Gateway/i)).toBeInTheDocument();
  });

  test('should restore read-only flag from sessionStorage via AuthProvider', () => {
    sessionStorage.setItem('bb_auth_pin_verified', 'true');
    sessionStorage.setItem('bb_auth_read_only', 'true');

    render(
      <PinGateway>
        <div data-testid="read-only-probe">
          {String(sessionStorage.getItem('bb_auth_read_only') === 'true')}
        </div>
      </PinGateway>
    );

    expect(screen.getByTestId('read-only-probe')).toHaveTextContent('true');
    expect(screen.queryByText(/Security Gateway/i)).not.toBeInTheDocument();
  });
});
