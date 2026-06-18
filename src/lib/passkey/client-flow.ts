'use client';

import './webauthn-json-polyfill';
import {
  checkDeviceHasPasskey,
  getPasskeyLoginOptions,
  getPasskeyRegistrationOptions,
  verifyPasskeyLogin,
  verifyPasskeyRegistration,
} from '@/app/actions/passkey-actions';
import type { ClientDevicePayload } from '@/lib/login-history-types';

export interface BiometricLoginAvailability {
  supported: boolean;
  canAutoTrigger: boolean;
  hasPlatformAuthenticator: boolean;
}

export async function getBiometricLoginAvailability(): Promise<BiometricLoginAvailability> {
  if (typeof window === 'undefined') {
    return { supported: false, canAutoTrigger: false, hasPlatformAuthenticator: false };
  }

  if (!window.PublicKeyCredential || !navigator.credentials?.get) {
    return { supported: false, canAutoTrigger: false, hasPlatformAuthenticator: false };
  }

  if (window.isSecureContext === false) {
    return { supported: false, canAutoTrigger: false, hasPlatformAuthenticator: false };
  }

  try {
    const hasPlatformAuthenticator =
      await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();

    return {
      supported: true,
      canAutoTrigger: hasPlatformAuthenticator,
      hasPlatformAuthenticator,
    };
  } catch {
    // Some desktop browsers support passkey sign-in but fail platform probing.
    // Keep manual Windows Hello/passkey entry available and skip auto prompts.
    return { supported: true, canAutoTrigger: false, hasPlatformAuthenticator: false };
  }
}

export async function isBiometricLoginAvailable(): Promise<boolean> {
  const availability = await getBiometricLoginAvailability();
  return availability.supported;
}

function getWebAuthnErrorName(error: unknown): string {
  return typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    typeof error.name === 'string'
    ? error.name
    : '';
}

async function createCredentialFromOptions(optionsJSON: string): Promise<RegistrationResponseJSON> {
  const options = JSON.parse(optionsJSON) as PublicKeyCredentialCreationOptionsJSON;
  const publicKey = PublicKeyCredential.parseCreationOptionsFromJSON(options);
  const credential = await navigator.credentials.create({ publicKey });
  if (!credential || !(credential instanceof PublicKeyCredential)) {
    throw new Error('No credential returned');
  }
  return credential.toJSON() as RegistrationResponseJSON;
}

async function getCredentialFromOptions(optionsJSON: string): Promise<AuthenticationResponseJSON> {
  const options = JSON.parse(optionsJSON) as PublicKeyCredentialRequestOptionsJSON;
  const publicKey = PublicKeyCredential.parseRequestOptionsFromJSON(options);
  const credential = await navigator.credentials.get({ publicKey });
  if (!credential || !(credential instanceof PublicKeyCredential)) {
    throw new Error('No credential returned');
  }
  return credential.toJSON() as AuthenticationResponseJSON;
}

export async function registerDevicePasskey(
  device: ClientDevicePayload
): Promise<{ success: true } | { success: false; error: string }> {
  const optionsResult = await getPasskeyRegistrationOptions(device);
  if (!optionsResult.success) {
    return optionsResult;
  }

  try {
    const response = await createCredentialFromOptions(optionsResult.optionsJSON);
    return verifyPasskeyRegistration(JSON.stringify(response), device);
  } catch (error) {
    const name = getWebAuthnErrorName(error);
    if (name === 'NotAllowedError') {
      return { success: false, error: 'ยกเลิกการสแกนลายนิ้วมือ/ใบหน้า' };
    }
    if (name === 'AbortError') {
      return { success: false, error: 'การสแกนลายนิ้วมือ/ใบหน้าถูกยกเลิก' };
    }
    console.error('[registerDevicePasskey]', error);
    return { success: false, error: 'ลงทะเบียนลายนิ้วมือไม่สำเร็จ' };
  }
}

export async function loginWithDevicePasskey(
  device: ClientDevicePayload
): Promise<
  { success: true; isReadOnly: boolean } | { success: false; error: string }
> {
  const optionsResult = await getPasskeyLoginOptions();
  if (!optionsResult.success) {
    return optionsResult;
  }

  try {
    const response = await getCredentialFromOptions(optionsResult.optionsJSON);
    return verifyPasskeyLogin(JSON.stringify(response), device);
  } catch (error) {
    const name = getWebAuthnErrorName(error);
    if (name === 'NotAllowedError') {
      return { success: false, error: 'ยกเลิกการสแกนลายนิ้วมือ/ใบหน้า' };
    }
    if (name === 'AbortError') {
      return { success: false, error: 'การสแกนลายนิ้วมือ/ใบหน้าถูกยกเลิก' };
    }
    console.error('[loginWithDevicePasskey]', error);
    return { success: false, error: 'เข้าสู่ระบบด้วยลายนิ้วมือไม่สำเร็จ' };
  }
}

export async function shouldOfferPasskeyEnrollment(
  sessionFingerprint: string | undefined
): Promise<boolean> {
  if (!sessionFingerprint) return false;
  const biometric = await getBiometricLoginAvailability();
  if (!biometric.hasPlatformAuthenticator) return false;
  const { hasPasskey } = await checkDeviceHasPasskey(sessionFingerprint);
  return !hasPasskey;
}

// Type aliases for WebAuthn JSON responses (browser globals)
type RegistrationResponseJSON = ReturnType<PublicKeyCredential['toJSON']>;
type AuthenticationResponseJSON = ReturnType<PublicKeyCredential['toJSON']>;
type PublicKeyCredentialCreationOptionsJSON = Parameters<
  typeof PublicKeyCredential.parseCreationOptionsFromJSON
>[0];
type PublicKeyCredentialRequestOptionsJSON = Parameters<
  typeof PublicKeyCredential.parseRequestOptionsFromJSON
>[0];
