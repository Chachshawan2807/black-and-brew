export {};

/** Optional toast hook registered by inventory shell (quick action fallback). */
declare global {
  interface Window {
    notifyUser?: (message: string) => void;
  }
}
