export interface ClientDevicePayload {
  userAgent: string;
  screenWidth: number;
  screenHeight: number;
  language: string;
  timezone: string;
  sessionFingerprint?: string;
}
