'use server';

import { createClient } from '@supabase/supabase-js';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { getAuthSessionInfo } from '@/app/actions/auth';
import { recordLoginEvent } from '@/app/actions/login-history-actions';
import { setAuthCookies } from '@/lib/auth-cookies';
import { SESSION_FP_COOKIE } from '@/lib/auth-constants';
import type { ClientDevicePayload } from '@/lib/login-history-types';
import { parseUserAgent } from '@/lib/parse-user-agent';
import { consumePasskeyChallenge, storePasskeyChallenge } from '@/lib/passkey/challenge-cookie';
import { fingerprintToPasskeyUserId } from '@/lib/passkey/passkey-user-id';
import { resolveWebAuthnContext } from '@/lib/passkey/webauthn-origin';
import { clearSessionRevocation, isSessionFingerprintRevoked } from '@/lib/session-revocation';
import { requireServiceRoleKey } from '@/lib/security/server-auth';

const clientDeviceSchema = z.object({
  userAgent: z.string().max(2000),
  screenWidth: z.number().int().min(0).max(10000),
  screenHeight: z.number().int().min(0).max(10000),
  language: z.string().max(50),
  timezone: z.string().max(100),
  sessionFingerprint: z.string().max(200),
});

const RP_NAME = 'BLACKANDBREW';

interface StoredPasskeyRow {
  id: string;
  credential_id: string;
  public_key: string;
  counter: number;
  transports: string[];
  device_label: string | null;
  session_fingerprint: string;
  access_level: 'full' | 'read_only';
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  }
  return createClient(supabaseUrl, requireServiceRoleKey());
}

function deviceLabelFromPayload(device: ClientDevicePayload): string {
  const parsed = parseUserAgent(device.userAgent);
  const model = parsed.deviceModel ?? parsed.osName ?? 'Device';
  return `${model} (${device.screenWidth}×${device.screenHeight})`;
}

async function fetchPasskeyByCredentialId(
  credentialId: string
): Promise<StoredPasskeyRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('device_passkeys')
    .select(
      'id, credential_id, public_key, counter, transports, device_label, session_fingerprint, access_level'
    )
    .eq('credential_id', credentialId)
    .maybeSingle();

  if (error) {
    console.error('Supabase Error:', error.message, error.details);
    throw error;
  }

  return data as StoredPasskeyRow | null;
}

async function fetchPasskeysForFingerprint(sessionFingerprint: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('device_passkeys')
    .select('credential_id, transports')
    .eq('session_fingerprint', sessionFingerprint);

  if (error) {
    console.error('Supabase Error:', error.message, error.details);
    throw error;
  }

  return data ?? [];
}

export async function checkDeviceHasPasskey(
  sessionFingerprint: string
): Promise<{ hasPasskey: boolean }> {
  if (!sessionFingerprint) {
    return { hasPasskey: false };
  }

  try {
    const rows = await fetchPasskeysForFingerprint(sessionFingerprint);
    return { hasPasskey: rows.length > 0 };
  } catch {
    return { hasPasskey: false };
  }
}

export async function getPasskeyRegistrationOptions(
  device: ClientDevicePayload
): Promise<{ success: true; optionsJSON: string } | { success: false; error: string }> {
  const session = await getAuthSessionInfo();
  if (!session.verified) {
    return { success: false, error: 'กรุณาเข้าสู่ระบบด้วยรหัส PIN ก่อนบันทึกเครื่องนี้' };
  }

  if (!device.sessionFingerprint) {
    return { success: false, error: 'ไม่พบข้อมูลอุปกรณ์' };
  }

  try {
    const { rpId } = await resolveWebAuthnContext();
    const existing = await fetchPasskeysForFingerprint(device.sessionFingerprint);

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: rpId,
      userName: deviceLabelFromPayload(device),
      userDisplayName: 'BLACKANDBREW',
      userID: fingerprintToPasskeyUserId(device.sessionFingerprint),
      attestationType: 'none',
      excludeCredentials: existing.map((row) => ({
        id: row.credential_id,
        transports: row.transports as AuthenticatorTransport[],
      })),
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'required',
        userVerification: 'required',
      },
    });

    await storePasskeyChallenge(options.challenge, 'registration');

    return { success: true, optionsJSON: JSON.stringify(options) };
  } catch (error) {
    console.error('[getPasskeyRegistrationOptions]', error);
    return { success: false, error: 'ไม่สามารถเตรียมการลงทะเบียนลายนิ้วมือได้' };
  }
}

export async function verifyPasskeyRegistration(
  responseJSON: string,
  device: ClientDevicePayload
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await getAuthSessionInfo();
  if (!session.verified) {
    return { success: false, error: 'กรุณาเข้าสู่ระบบด้วยรหัส PIN ก่อน' };
  }

  if (!device.sessionFingerprint) {
    return { success: false, error: 'ไม่พบข้อมูลอุปกรณ์' };
  }

  let response: RegistrationResponseJSON;
  try {
    response = JSON.parse(responseJSON) as RegistrationResponseJSON;
  } catch {
    return { success: false, error: 'ข้อมูลลงทะเบียนไม่ถูกต้อง' };
  }

  const expectedChallenge = await consumePasskeyChallenge('registration');
  if (!expectedChallenge) {
    return { success: false, error: 'หมดเวลาลงทะเบียน กรุณาลองใหม่' };
  }

  try {
    const { rpId, origin } = await resolveWebAuthnContext();
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpId,
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return { success: false, error: 'ยืนยันลายนิ้วมือไม่สำเร็จ' };
    }

    const { credential } = verification.registrationInfo;

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('device_passkeys').upsert(
      {
        credential_id: credential.id,
        public_key: Buffer.from(credential.publicKey).toString('base64url'),
        counter: credential.counter,
        transports: credential.transports ?? [],
        device_label: deviceLabelFromPayload(device),
        session_fingerprint: device.sessionFingerprint,
        access_level: session.readOnly ? 'read_only' : 'full',
        registered_at: new Date().toISOString(),
        last_used_at: new Date().toISOString(),
      },
      { onConflict: 'credential_id' }
    );

    if (error) {
      console.error('Supabase Error:', error.message, error.details);
      return { success: false, error: 'บันทึกลายนิ้วมือไม่สำเร็จ' };
    }

    return { success: true };
  } catch (error) {
    console.error('[verifyPasskeyRegistration]', error);
    return { success: false, error: 'ลงทะเบียนลายนิ้วมือไม่สำเร็จ' };
  }
}

export async function getPasskeyLoginOptions(): Promise<
  { success: true; optionsJSON: string } | { success: false; error: string }
> {
  try {
    const { rpId } = await resolveWebAuthnContext();

    const options = await generateAuthenticationOptions({
      rpID: rpId,
      allowCredentials: [],
      userVerification: 'required',
    });

    await storePasskeyChallenge(options.challenge, 'authentication');

    return { success: true, optionsJSON: JSON.stringify(options) };
  } catch (error) {
    console.error('[getPasskeyLoginOptions]', error);
    return { success: false, error: 'ไม่สามารถเตรียมการเข้าด้วยลายนิ้วมือได้' };
  }
}

export async function verifyPasskeyLogin(
  responseJSON: string,
  device: ClientDevicePayload
): Promise<
  { success: true; isReadOnly: boolean } | { success: false; error: string }
> {
  let response: AuthenticationResponseJSON;
  try {
    response = JSON.parse(responseJSON) as AuthenticationResponseJSON;
  } catch {
    return { success: false, error: 'ข้อมูลเข้าสู่ระบบไม่ถูกต้อง' };
  }

  const expectedChallenge = await consumePasskeyChallenge('authentication');
  if (!expectedChallenge) {
    return { success: false, error: 'หมดเวลาเข้าสู่ระบบ กรุณาลองใหม่' };
  }

  try {
    const stored = await fetchPasskeyByCredentialId(response.id);
    if (!stored) {
      await recordLoginEvent({
        eventType: 'login_failure',
        status: 'failure',
        device,
        failureReason: 'Unknown passkey credential',
      });
      return { success: false, error: 'ไม่พบลายนิ้วมือที่ลงทะเบียนไว้' };
    }

    if (await isSessionFingerprintRevoked(stored.session_fingerprint)) {
      return { success: false, error: 'เครื่องนี้ถูกบังคับออกจากระบบแล้ว กรุณาใช้รหัส PIN' };
    }

    const { rpId, origin } = await resolveWebAuthnContext();
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpId,
      credential: {
        id: stored.credential_id,
        publicKey: Buffer.from(stored.public_key, 'base64url'),
        counter: stored.counter,
        transports: stored.transports as AuthenticatorTransport[],
      },
      requireUserVerification: true,
    });

    if (!verification.verified) {
      await recordLoginEvent({
        eventType: 'login_failure',
        status: 'failure',
        device,
        failureReason: 'Passkey verification failed',
      });
      return { success: false, error: 'ยืนยันลายนิ้วมือไม่สำเร็จ' };
    }

    const newCounter = verification.authenticationInfo.newCounter;
    const supabase = getSupabaseAdmin();
    const { error: updateError } = await supabase
      .from('device_passkeys')
      .update({
        counter: newCounter,
        last_used_at: new Date().toISOString(),
      })
      .eq('credential_id', stored.credential_id);

    if (updateError) {
      console.error('Supabase Error:', updateError.message, updateError.details);
    }

    const readOnly = stored.access_level === 'read_only';
    const cookieStore = await cookies();
    const deviceWithFp: ClientDevicePayload = {
      ...device,
      sessionFingerprint: stored.session_fingerprint,
    };

    await clearSessionRevocation(stored.session_fingerprint);
    setAuthCookies(cookieStore, readOnly, deviceWithFp);

    await recordLoginEvent({
      eventType: 'login_success',
      status: 'success',
      device: deviceWithFp,
      accessLevel: readOnly ? 'read_only' : 'full',
    });

    return { success: true, isReadOnly: readOnly };
  } catch (error) {
    console.error('[verifyPasskeyLogin]', error);
    await recordLoginEvent({
      eventType: 'login_failure',
      status: 'failure',
      device,
      failureReason: 'Passkey login exception',
    });
    return { success: false, error: 'เข้าสู่ระบบด้วยลายนิ้วมือไม่สำเร็จ' };
  }
}

export async function removePasskeyForCurrentDevice(): Promise<
  { success: true } | { success: false; error: string }
> {
  const session = await getAuthSessionInfo();
  if (!session.verified) {
    return { success: false, error: 'กรุณาเข้าสู่ระบบก่อน' };
  }

  const cookieStore = await cookies();
  const fingerprint = cookieStore.get(SESSION_FP_COOKIE)?.value;
  if (!fingerprint) {
    return { success: false, error: 'ไม่พบข้อมูลเครื่องนี้' };
  }

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('device_passkeys')
      .delete()
      .eq('session_fingerprint', fingerprint);

    if (error) {
      console.error('Supabase Error:', error.message, error.details);
      return { success: false, error: 'ลบลายนิ้วมือไม่สำเร็จ' };
    }

    return { success: true };
  } catch (error) {
    console.error('[removePasskeyForCurrentDevice]', error);
    return { success: false, error: 'ลบลายนิ้วมือไม่สำเร็จ' };
  }
}

export async function getCurrentDevicePasskeyStatus(): Promise<{
  enrolled: boolean;
  deviceLabel: string | null;
}> {
  const session = await getAuthSessionInfo();
  if (!session.verified) {
    return { enrolled: false, deviceLabel: null };
  }

  const cookieStore = await cookies();
  const fingerprint = cookieStore.get(SESSION_FP_COOKIE)?.value;
  if (!fingerprint) {
    return { enrolled: false, deviceLabel: null };
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('device_passkeys')
      .select('device_label')
      .eq('session_fingerprint', fingerprint)
      .order('registered_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Supabase Error:', error.message, error.details);
      return { enrolled: false, deviceLabel: null };
    }

    return {
      enrolled: Boolean(data),
      deviceLabel: data?.device_label ?? null,
    };
  } catch {
    return { enrolled: false, deviceLabel: null };
  }
}
