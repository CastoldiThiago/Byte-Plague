export function isDevMode(): boolean {
  // Dev mode when URL has ?dev=1 or localStorage.devMode === '1'
  try {
    const url = typeof window !== 'undefined' ? new URL(window.location.href) : null;
    if (url && url.searchParams.get('dev') === '1') return true;
    if (typeof localStorage !== 'undefined' && localStorage.getItem('devMode') === '1') return true;
  } catch (e) {
    // ignore
  }
  return false;
}

export function enableDevMode(): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem('devMode', '1');
  } catch (e) {}
}

export function disableDevMode(): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem('devMode');
  } catch (e) {}
}
