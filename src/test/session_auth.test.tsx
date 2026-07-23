import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, test, describe, vi, beforeEach } from 'vitest';
import PinGateway from '@/components/auth/PinGateway';
import {
  getBiometricAutoLoginReadiness,
  loginWithDevicePasskey,
  registerDevicePasskey,
  shouldOfferPasskeyEnrollment,
} from '@/lib/passkey/client-flow';

vi.mock('next/navigation', () => ({
  useParams: vi.fn(() => ({ locale: 'th' })),
}));

// Mock framer-motion to avoid animation issues in jsdom environment
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
    p: ({ children, ...props }: React.ComponentProps<'p'>) => <p {...props}>{children}</p>,
    span: ({ children, ...props }: React.ComponentProps<'span'>) => <span {...props}>{children}</span>,
  },
}));

// Mock the auth server actions
vi.mock('@/app/actions/auth', () => ({
  verifyPin: vi.fn(),
  checkAuth: vi.fn(async () => false),
  getAuthSessionInfo: vi.fn(async () => ({ verified: false, readOnly: false })),
}));

vi.mock('@/lib/passkey/client-flow', () => ({
  getBiometricAutoLoginReadiness: vi.fn(async () => ({
    supported: false,
    canAutoTrigger: false,
    hasPlatformAuthenticator: false,
    hasPasskey: false,
  })),
  loginWithDevicePasskey: vi.fn(async () => ({
    success: false,
    error: 'ยกเลิกการสแกนลายนิ้วมือ/ใบหน้า',
  })),
  registerDevicePasskey: vi.fn(async () => ({ success: true })),
  shouldOfferPasskeyEnrollment: vi.fn(async () => false),
}));

vi.mock('@/lib/client-device-info', () => ({
  collectClientDeviceInfo: vi.fn(() => ({
    deviceLabel: 'Test phone',
    sessionFingerprint: 'test-fingerprint',
  })),
}));

// Mock supabase session helper
vi.mock('@/lib/supabase-session', () => ({
  ensureSupabaseSession: vi.fn(async () => true),
}));

describe('PinGateway Persistent Authentication', () => {
  beforeEach(async () => {
    // Clear storages before each test
    sessionStorage.clear();
    localStorage.clear();
    vi.clearAllMocks();
    const { useParams } = await import('next/navigation');
    vi.mocked(useParams).mockReturnValue({ locale: 'th' });
    vi.mocked(getBiometricAutoLoginReadiness).mockResolvedValue({
      supported: false,
      canAutoTrigger: false,
      hasPlatformAuthenticator: false,
      hasPasskey: false,
    });
    vi.mocked(loginWithDevicePasskey).mockResolvedValue({
      success: false,
      error: 'ยกเลิกการสแกนลายนิ้วมือ/ใบหน้า',
    });
    vi.mocked(registerDevicePasskey).mockResolvedValue({ success: true });
    vi.mocked(shouldOfferPasskeyEnrollment).mockResolvedValue(false);
  });

  test('should block access when sessionStorage is empty', async () => {
    render(
      <PinGateway>
        <div data-testid="protected-content">Secret Dashboard</div>
      </PinGateway>
    );

    // It should NOT show the protected content
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();

    // It should display the sign-in PIN prompt
    expect(await screen.findByText('เข้าสู่ระบบ')).toBeInTheDocument();
    expect(await screen.findByText('กรุณากรอกรหัส PIN 6 หลัก')).toBeInTheDocument();
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
    expect(screen.queryByText('เข้าสู่ระบบ')).not.toBeInTheDocument();
  });

  test('should NOT allow access if only localStorage has auth keys without server cookie', async () => {
    localStorage.setItem('bb_auth_pin_verified', 'true');

    render(
      <PinGateway>
        <div data-testid="protected-content">Secret Dashboard</div>
      </PinGateway>
    );

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(await screen.findByText('เข้าสู่ระบบ')).toBeInTheDocument();
  });

  test('should show restore splash instead of login while server session is being verified', async () => {
    localStorage.setItem('bb_auth_pin_verified', 'true');
    const { getAuthSessionInfo } = await import('@/app/actions/auth');
    let resolveSession!: (value: { verified: boolean; readOnly: boolean }) => void;
    vi.mocked(getAuthSessionInfo).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSession = resolve;
        }),
    );

    render(
      <PinGateway>
        <div data-testid="protected-content">Secret Dashboard</div>
      </PinGateway>
    );

    await waitFor(() => {
      expect(screen.queryByText('เข้าสู่ระบบ')).not.toBeInTheDocument();
      expect(screen.queryByText('กรุณากรอกรหัส PIN 6 หลัก')).not.toBeInTheDocument();
    });

    resolveSession({ verified: true, readOnly: false });
    expect(await screen.findByTestId('protected-content')).toBeInTheDocument();
  });

  test('should mask PIN digits with dots immediately while typing', async () => {
    render(
      <PinGateway>
        <div data-testid="protected-content">Secret Dashboard</div>
      </PinGateway>
    );

    const pinInput = await screen.findByLabelText('รหัส PIN 6 หลัก');
    fireEvent.change(pinInput, { target: { value: '1' } });

    expect(screen.getByLabelText('รหัส PIN 6 หลัก')).toHaveValue('1');
    expect(screen.queryByText('1')).not.toBeInTheDocument();
    expect(document.querySelector('.rounded-full.bg-foreground')).toBeInTheDocument();
  });

  test('should blur input and show verifying feedback when PIN is complete', async () => {
    const { verifyPin } = await import('@/app/actions/auth');
    let resolveVerify!: (value: { success: boolean; isReadOnly?: boolean }) => void;
    vi.mocked(verifyPin).mockImplementation(
      () =>
        new Promise(resolve => {
          resolveVerify = resolve;
        })
    );

    render(
      <PinGateway>
        <div data-testid="protected-content">Secret Dashboard</div>
      </PinGateway>
    );

    const pinInput = await screen.findByLabelText('รหัส PIN 6 หลัก') as HTMLInputElement;
    const blurSpy = vi.spyOn(pinInput, 'blur');

    fireEvent.change(pinInput, { target: { value: '123456' } });

    await waitFor(() => {
      expect(blurSpy).toHaveBeenCalled();
      expect(screen.getByRole('status')).toHaveTextContent('กำลังตรวจสอบรหัส PIN');
      expect(screen.queryByLabelText('รหัส PIN 6 หลัก')).not.toBeInTheDocument();
      expect(screen.queryByTestId('pin-digit-boxes')).not.toBeInTheDocument();
    });

    resolveVerify({ success: true, isReadOnly: false });
    expect(await screen.findByTestId('protected-content')).toBeInTheDocument();
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
    expect(screen.queryByText('เข้าสู่ระบบ')).not.toBeInTheDocument();
  });

  test('auto-triggers biometric login on mount when device has enrolled passkey', async () => {
    vi.mocked(getBiometricAutoLoginReadiness).mockResolvedValue({
      supported: true,
      canAutoTrigger: true,
      hasPlatformAuthenticator: true,
      hasPasskey: true,
    });
    vi.mocked(loginWithDevicePasskey).mockResolvedValue({
      success: true,
      isReadOnly: false,
      offlineAuthSessionId: 'offline-session',
    });

    render(
      <PinGateway>
        <div data-testid="protected-content">Secret Dashboard</div>
      </PinGateway>
    );

    await waitFor(() => {
      expect(loginWithDevicePasskey).toHaveBeenCalledWith(
        expect.objectContaining({ sessionFingerprint: 'test-fingerprint' }),
        { autoTrigger: true }
      );
    });
    expect(await screen.findByTestId('protected-content')).toBeInTheDocument();
  });

  test('does not auto-trigger biometric when device has no enrolled passkey', async () => {
    vi.mocked(getBiometricAutoLoginReadiness).mockResolvedValue({
      supported: true,
      canAutoTrigger: true,
      hasPlatformAuthenticator: true,
      hasPasskey: false,
    });
    vi.mocked(loginWithDevicePasskey).mockResolvedValue({
      success: false,
      error: 'ยกเลิกการสแกนลายนิ้วมือ/ใบหน้า',
    });

    render(
      <PinGateway>
        <div data-testid="protected-content">Secret Dashboard</div>
      </PinGateway>
    );

    await waitFor(() => {
      expect(loginWithDevicePasskey).not.toHaveBeenCalled();
    });

    expect(await screen.findByLabelText('รหัส PIN 6 หลัก')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'ใช้ลายนิ้วมือหรือใบหน้า' })
    ).toBeInTheDocument();
  });

  test('should stop after 3 manual biometric failures and let manual button reset attempts', async () => {
    vi.mocked(getBiometricAutoLoginReadiness).mockResolvedValue({
      supported: true,
      canAutoTrigger: false,
      hasPlatformAuthenticator: false,
      hasPasskey: false,
    });
    vi.mocked(loginWithDevicePasskey).mockResolvedValue({
      success: false,
      error: 'ยกเลิกการสแกนลายนิ้วมือ/ใบหน้า',
    });

    render(
      <PinGateway>
        <div data-testid="protected-content">Secret Dashboard</div>
      </PinGateway>
    );

    const button = await screen.findByRole('button', { name: 'ใช้ลายนิ้วมือหรือใบหน้า' });
    fireEvent.click(button);
    await waitFor(() => {
      expect(loginWithDevicePasskey).toHaveBeenCalledTimes(1);
    });
    fireEvent.click(button);
    await waitFor(() => {
      expect(loginWithDevicePasskey).toHaveBeenCalledTimes(2);
    });
    fireEvent.click(button);

    await waitFor(() => {
      expect(loginWithDevicePasskey).toHaveBeenCalledTimes(3);
    });
    expect(
      screen.getByText('ยืนยันตัวตนไม่สำเร็จครบ 3 ครั้ง กรุณาใส่รหัส PIN แทน')
    ).toBeInTheDocument();

    fireEvent.click(button);

    await waitFor(() => {
      expect(loginWithDevicePasskey).toHaveBeenCalledTimes(4);
    });
  });

  test('should finish authentication after passkey enrollment without triggering login again', async () => {
    const { verifyPin } = await import('@/app/actions/auth');
    vi.mocked(verifyPin).mockResolvedValue({ success: true, isReadOnly: false });
    vi.mocked(shouldOfferPasskeyEnrollment).mockResolvedValue(true);
    vi.mocked(registerDevicePasskey).mockResolvedValue({ success: true });

    render(
      <PinGateway>
        <div data-testid="protected-content">Secret Dashboard</div>
      </PinGateway>
    );

    fireEvent.change(await screen.findByLabelText('รหัส PIN 6 หลัก'), {
      target: { value: '123456' },
    });

    const enrollButton = await screen.findByRole('button', {
      name: 'เปิดใช้ลายนิ้วมือหรือใบหน้า',
    });
    fireEvent.click(enrollButton);

    expect(await screen.findByTestId('protected-content')).toBeInTheDocument();
    expect(registerDevicePasskey).toHaveBeenCalledTimes(1);
    expect(loginWithDevicePasskey).not.toHaveBeenCalled();
  });

  test('should show desktop passkey button without auto-trigger when platform probe is unavailable', async () => {
    vi.mocked(getBiometricAutoLoginReadiness).mockResolvedValue({
      supported: true,
      canAutoTrigger: false,
      hasPlatformAuthenticator: false,
      hasPasskey: false,
    });

    render(
      <PinGateway>
        <div data-testid="protected-content">Secret Dashboard</div>
      </PinGateway>
    );

    expect(
      await screen.findByRole('button', { name: 'ใช้ลายนิ้วมือหรือใบหน้า' })
    ).toBeInTheDocument();
    expect(loginWithDevicePasskey).not.toHaveBeenCalled();
  });

  test('should show English copy when locale is en', async () => {
    const { useParams } = await import('next/navigation');
    vi.mocked(useParams).mockReturnValue({ locale: 'en' });

    render(
      <PinGateway>
        <div data-testid="protected-content">Secret Dashboard</div>
      </PinGateway>
    );

    expect(await screen.findByText('Sign in')).toBeInTheDocument();
    expect(await screen.findByText('Enter your 6-digit PIN')).toBeInTheDocument();
    expect(await screen.findByLabelText('6-digit PIN')).toBeInTheDocument();
  });
});
