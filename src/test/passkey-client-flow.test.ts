import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  getBiometricLoginAvailability,
  isBiometricLoginAvailable,
  loginWithDevicePasskey,
} from '@/lib/passkey/client-flow';
import {
  getPasskeyLoginOptions,
  verifyPasskeyLogin,
} from '@/app/actions/passkey-actions';

vi.mock('@/app/actions/passkey-actions', () => ({
  checkDeviceHasPasskey: vi.fn(async () => ({ hasPasskey: true })),
  getPasskeyLoginOptions: vi.fn(async () => ({
    success: true,
    optionsJSON: JSON.stringify({ challenge: 'Y2hhbGxlbmdl', rpId: 'example.com' }),
  })),
  getPasskeyRegistrationOptions: vi.fn(),
  verifyPasskeyLogin: vi.fn(async () => ({ success: true, isReadOnly: false })),
  verifyPasskeyRegistration: vi.fn(),
}));

const device = {
  userAgent: 'Mozilla/5.0 Test',
  screenWidth: 390,
  screenHeight: 844,
  language: 'th-TH',
  timezone: 'Asia/Bangkok',
  sessionFingerprint: 'test-fingerprint',
};

describe('passkey client login flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    class FakePublicKeyCredential {}

    Object.defineProperties(FakePublicKeyCredential, {
      parseRequestOptionsFromJSON: {
        value: vi.fn((options: unknown) => options),
      },
      parseCreationOptionsFromJSON: {
        value: vi.fn((options: unknown) => options),
      },
      isUserVerifyingPlatformAuthenticatorAvailable: {
        value: vi.fn(async () => true),
      },
    });

    vi.stubGlobal('PublicKeyCredential', FakePublicKeyCredential);
    Object.defineProperty(navigator, 'credentials', {
      configurable: true,
      value: {
        get: vi.fn(),
        create: vi.fn(),
      },
    });
  });

  test('returns cancellation copy when the native prompt is dismissed', async () => {
    vi.mocked(navigator.credentials.get).mockRejectedValueOnce(
      new DOMException('Dismissed', 'NotAllowedError')
    );

    await expect(loginWithDevicePasskey(device)).resolves.toEqual({
      success: false,
      error: 'ยกเลิกการสแกนลายนิ้วมือ/ใบหน้า',
    });
    expect(verifyPasskeyLogin).not.toHaveBeenCalled();
  });

  test('returns aborted copy when the native prompt is programmatically aborted', async () => {
    vi.mocked(navigator.credentials.get).mockRejectedValueOnce(
      new DOMException('Aborted', 'AbortError')
    );

    await expect(loginWithDevicePasskey(device)).resolves.toEqual({
      success: false,
      error: 'การสแกนลายนิ้วมือ/ใบหน้าถูกยกเลิก',
    });
    expect(verifyPasskeyLogin).not.toHaveBeenCalled();
  });

  test('passes through option generation errors before opening native auth', async () => {
    vi.mocked(getPasskeyLoginOptions).mockResolvedValueOnce({
      success: false,
      error: 'ไม่สามารถเตรียมการเข้าด้วยลายนิ้วมือได้',
    });

    await expect(loginWithDevicePasskey(device)).resolves.toEqual({
      success: false,
      error: 'ไม่สามารถเตรียมการเข้าด้วยลายนิ้วมือได้',
    });
    expect(navigator.credentials.get).not.toHaveBeenCalled();
  });

  test('marks Windows Hello platform authenticators as auto-trigger capable', async () => {
    await expect(getBiometricLoginAvailability()).resolves.toEqual({
      supported: true,
      canAutoTrigger: true,
      hasPlatformAuthenticator: true,
    });
    await expect(isBiometricLoginAvailable()).resolves.toBe(true);
  });

  test('keeps desktop passkey manual login available when platform probing fails', async () => {
    vi.mocked(PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable)
      .mockRejectedValueOnce(new DOMException('Probe unavailable', 'NotAllowedError'));

    await expect(getBiometricLoginAvailability()).resolves.toEqual({
      supported: true,
      canAutoTrigger: false,
      hasPlatformAuthenticator: false,
    });
    await expect(isBiometricLoginAvailable()).resolves.toBe(true);
  });

  test('rejects passkeys on non-secure contexts', async () => {
    vi.stubGlobal('isSecureContext', false);

    await expect(getBiometricLoginAvailability()).resolves.toEqual({
      supported: false,
      canAutoTrigger: false,
      hasPlatformAuthenticator: false,
    });
  });

  test('requests required mediation on auto-trigger to skip passkey picker', async () => {
    const credential = Object.create(PublicKeyCredential.prototype);
    credential.toJSON = () => ({ id: 'cred-id', response: {} });
    vi.mocked(navigator.credentials.get).mockResolvedValueOnce(
      credential as unknown as PublicKeyCredential
    );

    await loginWithDevicePasskey(device, { autoTrigger: true });

    expect(navigator.credentials.get).toHaveBeenCalledWith(
      expect.objectContaining({ mediation: 'required' })
    );
    expect(getPasskeyLoginOptions).toHaveBeenCalledWith(device.sessionFingerprint);
  });

  test('passes device fingerprint to login options for scoped credentials', async () => {
    const credential = Object.create(PublicKeyCredential.prototype);
    credential.toJSON = () => ({ id: 'cred-id', response: {} });
    vi.mocked(navigator.credentials.get).mockResolvedValueOnce(
      credential as unknown as PublicKeyCredential
    );

    await loginWithDevicePasskey(device);

    expect(getPasskeyLoginOptions).toHaveBeenCalledWith(device.sessionFingerprint);
  });
});
