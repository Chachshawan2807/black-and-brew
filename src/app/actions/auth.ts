'use server';

import { cookies } from 'next/headers';

export async function verifyPin(pin: string): Promise<{ success: boolean; error?: string }> {
  // 1. Tarpitting: หน่วงเวลา 1.5 วินาทีป้องกัน Brute-force Bot
  await new Promise(resolve => setTimeout(resolve, 1500));

  const systemPin = process.env.APP_PIN;
  if (!systemPin) {
    console.error('[AUTH_ACTION] APP_PIN environment variable is not defined.');
    return { success: false, error: 'System configuration error' };
  }

  if (pin === systemPin) {
    const cookieStore = await cookies();
    cookieStore.set('bb_auth_pin_verified', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 1 วัน
      path: '/'
    });
    return { success: true };
  }
  
  return { success: false, error: 'รหัส PIN ไม่ถูกต้อง' };
}

export async function checkAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get('bb_auth_pin_verified')?.value === 'true';
}

export async function clearAuth(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('bb_auth_pin_verified');
}
