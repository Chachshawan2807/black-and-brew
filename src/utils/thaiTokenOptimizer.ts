export function optimizeThaiTokens(text: string): string {
  if (!text) return text;
  
  // 1. Remove excessive whitespace
  let optimized = text.replace(/\s+/g, ' ').trim();
  
  // 2. Remove repetitive Thai characters (e.g., 55555 -> 555, ๆๆๆ -> ๆ)
  optimized = optimized.replace(/([ๆ5])\1{2,}/g, '$1$1$1');
  
  // 3. Compact punctuation
  optimized = optimized.replace(/\.{2,}/g, '..');
  
  return optimized;
}
