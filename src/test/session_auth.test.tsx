import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, test, describe, vi, beforeEach } from 'vitest';
import PinGateway from '@/components/auth/PinGateway';
import {
  getBiometricLoginAvailability,
  loginWithDevicePasskey,
  registerDevicePasskey,
  shouldOfferPasskeyEnrollment,
} from '@/lib/passkey/client-flow';

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
  getBiometricLoginAvailability: vi.fn(async () => ({
    supported: false,
    canAutoTrigger: false,
    hasPlatformAuthenticator: false,
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
  beforeEach(() => {
    // Clear storages before each test
    sessionStorage.clear();
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(getBiometricLoginAvailability).mockResolvedValue({
      supported: false,
      canAutoTrigger: false,
      hasPlatformAuthenticator: false,
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

    // It should display the Security Gateway PIN prompt
    expect(await screen.findByText(/Security Gateway/i)).toBeInTheDocument();
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

  test('should NOT allow access if only localStorage has auth keys without server cookie', async () => {
    localStorage.setItem('bb_auth_pin_verified', 'true');

    render(
      <PinGateway>
        <div data-testid="protected-content">Secret Dashboard</div>
      </PinGateway>
    );

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(await screen.findByText(/Security Gateway/i)).toBeInTheDocument();
  });

  test('should mask PIN digits with dots immediately while typing', async () => {
    render(
      <PinGateway>
        <div data-testid="protected-content">Secret Dashboard</div>
      </PinGateway>
    );

    const pinInput = await screen.findByLabelText('รหัสผ่าน 6 หลัก');
    fireEvent.change(pinInput, { target: { value: '1' } });

    expect(screen.getByLabelText('รหัสผ่าน 6 หลัก')).toHaveValue('1');
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

    const pinInput = await screen.findByLabelText('รหัสผ่าน 6 หลัก') as HTMLInputElement;
    const blurSpy = vi.spyOn(pinInput, 'blur');

    fireEvent.change(pinInput, { target: { value: '123456' } });

    await waitFor(() => {
      expect(blurSpy).toHaveBeenCalled();
      expect(screen.getByRole('status')).toHaveTextContent(/กำลังตรวจสอบ/i);
      expect(screen.queryByLabelText('รหัสผ่าน 6 หลัก')).not.toBeInTheDocument();
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
    expect(screen.queryByText(/Security Gateway/i)).not.toBeInTheDocument();
  });

  test('does not auto-trigger biometric login on mount (auto prompt disabled)', async () => {
    vi.mocked(getBiometricLoginAvailability).mockResolvedValue({
      supported: true,
      canAutoTrigger: true,
      hasPlatformAuthenticator: true,
    });
    vi.mocked(loginWithDevicePasskey).mockResolvedValue({
      success: true,
      isReadOnly: false,
    });

    render(
      <PinGateway>
        <div data-testid="protected-content">Secret Dashboard</div>
      </PinGateway>
    );

    expect(await screen.findByLabelText('รหัสผ่าน 6 หลัก')).toBeInTheDocument();
    expect(loginWithDevicePasskey).not.toHaveBeenCalled();
  });

  test('does not auto-trigger biometric after mount when availability resolves', async () => {
    vi.mocked(getBiometricLoginAvailability).mockResolvedValue({
      supported: true,
      canAutoTrigger: true,
      hasPlatformAuthenticator: true,
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

    expect(await screen.findByLabelText('รหัสผ่าน 6 หลัก')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /เข้าด้วย Windows Hello \/ Passkey/i })
    ).toBeInTheDocument();
  });

  test('should stop after 3 manual biometric failures and let manual button reset attempts', async () => {
    vi.mocked(getBiometricLoginAvailability).mockResolvedValue({
      supported: true,
      canAutoTrigger: false,
      hasPlatformAuthenticator: false,
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

    const button = await screen.findByRole('button', { name: /เข้าด้วย Windows Hello \/ Passkey/i });
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
    expect(screen.getByText(/ยืนยันตัวตนไม่สำเร็จครบ 3 ครั้ง/i)).toBeInTheDocument();

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

    fireEvent.change(await screen.findByLabelText('รหัสผ่าน 6 หลัก'), {
      target: { value: '123456' },
    });

    const enrollButton = await screen.findByRole('button', {
      name: /บันทึก Windows Hello \/ Passkey/i,
    });
    fireEvent.click(enrollButton);

    expect(await screen.findByTestId('protected-content')).toBeInTheDocument();
    expect(registerDevicePasskey).toHaveBeenCalledTimes(1);
    expect(loginWithDevicePasskey).not.toHaveBeenCalled();
  });

  test('should show desktop passkey button without auto-trigger when platform probe is unavailable', async () => {
    vi.mocked(getBiometricLoginAvailability).mockResolvedValue({
      supported: true,
      canAutoTrigger: false,
      hasPlatformAuthenticator: false,
    });

    render(
      <PinGateway>
        <div data-testid="protected-content">Secret Dashboard</div>
      </PinGateway>
    );

    expect(
      await screen.findByRole('button', { name: /เข้าด้วย Windows Hello \/ Passkey/i })
    ).toBeInTheDocument();
    expect(loginWithDevicePasskey).not.toHaveBeenCalled();
  });
});
