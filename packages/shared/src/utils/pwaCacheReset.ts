/**
 * Completely resets PWA caches, unregisters service workers, and reloads the page.
 * Mandatory for iOS standalone WebClips which lack native browser refresh buttons.
 */
export async function forceResetPwaCache(): Promise<void> {
  try {
    // 1. Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    }

    // 2. Clear CacheStorage
    if ('caches' in window) {
      const cacheKeys = await window.caches.keys();
      for (const key of cacheKeys) {
        await window.caches.delete(key);
      }
    }

    // 3. Clear session storage
    window.sessionStorage.clear();

    // 4. Clear application cache keys from local storage (preserving credentials if desired)
    const preserveKeys = ['nyo_auth_session', 'nyo_admin_token'];
    const preservedValues: Record<string, string> = {};
    for (const key of preserveKeys) {
      const val = window.localStorage.getItem(key);
      if (val !== null) preservedValues[key] = val;
    }

    window.localStorage.clear();

    for (const [key, val] of Object.entries(preservedValues)) {
      window.localStorage.setItem(key, val);
    }
  } catch (err) {
    console.error('Error resetting PWA caches:', err);
  } finally {
    // Force hard reload bypassing cache
    window.location.reload();
  }
}
