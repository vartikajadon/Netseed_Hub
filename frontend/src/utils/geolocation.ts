/**
 * Geolocation Utility for netSEED Hub
 * Resiliently captures device coordinates for authentication audit trails (login & logout).
 */

export interface CapturedLocation {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error?: string | null;
}

/**
 * Returns true if the user belongs to staff roles (Admin, HR, Mentor),
 * who are strictly exempted from location prompts.
 */
export const isStaffUser = (): boolean => {
  try {
    const raw = localStorage.getItem('user_data');
    if (!raw) return false;
    const user = JSON.parse(raw);
    return Boolean(user?.role && ['SUPER_ADMIN', 'ADMIN', 'HR', 'MENTOR'].includes(user.role.toUpperCase()));
  } catch {
    return false;
  }
};

/**
 * Capture current GPS coordinates using the HTML5 Geolocation API.
 * Safely resolves within timeoutMs even if permission is denied, timed out,
 * or unavailable, ensuring authentication flows are never hard-blocked.
 * 
 * Strict rule: NEVER prompts ADMIN, HR, or MENTORS for location permission.
 */
export const captureCurrentLocation = async (timeoutMs = 1200): Promise<CapturedLocation> => {
  // 1. Immediately bypass location capture for Admin, HR, and Mentor roles
  if (isStaffUser()) {
    return {
      latitude: null,
      longitude: null,
      accuracy: null,
      error: 'Location capture disabled for staff roles (ADMIN, HR, MENTOR)',
    };
  }

  return new Promise(async (resolve) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      resolve({
        latitude: null,
        longitude: null,
        accuracy: null,
        error: 'Geolocation is not supported by your browser',
      });
      return;
    }

    // Fast path: reuse recent coordinates from session storage if valid (< 5 min)
    try {
      const cached = sessionStorage.getItem('netseed_last_known_coords');
      if (cached) {
        const parsed = JSON.parse(cached);
        const age = Date.now() - (parsed.timestamp || 0);
        if (parsed.latitude !== null && parsed.longitude !== null && age < 5 * 60 * 1000) {
          resolve({
            latitude: parsed.latitude,
            longitude: parsed.longitude,
            accuracy: parsed.accuracy ?? null,
            error: null,
          });
          return;
        }
      }
    } catch {}

    // Check if permission is pre-granted before triggering native prompt
    if ('permissions' in navigator && navigator.permissions?.query) {
      try {
        const permStatus = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        if (permStatus.state !== 'granted') {
          // Do not force a permission prompt on unsuspecting users
          resolve({
            latitude: null,
            longitude: null,
            accuracy: null,
            error: 'Location permission not pre-granted',
          });
          return;
        }
      } catch {
        // Fall through if permissions.query fails
      }
    }

    let isResolved = false;

    // Safety fallback timer in case browser does not trigger error callback promptly
    const timer = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        resolve({
          latitude: null,
          longitude: null,
          accuracy: null,
          error: 'Geolocation request timed out',
        });
      }
    }, timeoutMs);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timer);
          const locData: CapturedLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            error: null,
          };
          try {
            sessionStorage.setItem('netseed_last_known_coords', JSON.stringify({
              latitude: locData.latitude,
              longitude: locData.longitude,
              accuracy: locData.accuracy,
              timestamp: Date.now(),
            }));
          } catch {}
          resolve(locData);
        }
      },
      (err) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timer);
          resolve({
            latitude: null,
            longitude: null,
            accuracy: null,
            error: err.message || 'Location permission denied or unavailable',
          });
        }
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 60000,
      }
    );
  });
};
