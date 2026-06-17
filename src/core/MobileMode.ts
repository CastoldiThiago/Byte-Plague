export function isMobileDevice(): boolean {
  try {
    const url = typeof window !== 'undefined' ? new URL(window.location.href) : null;
    if (url) {
      const p = url.searchParams.get('mobile');
      if (p === '1') return true;
      if (p === '0') return false; // fuerza desktop aunque el dispositivo tenga touch
    }
    if (typeof navigator !== 'undefined' &&
        (navigator.maxTouchPoints > 0 || 'ontouchstart' in window)) return true;
  } catch (e) {
    // ignore
  }
  return false;
}
