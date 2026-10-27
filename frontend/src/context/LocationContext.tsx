import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type LocationPermissionState = 'prompt' | 'granted' | 'denied' | 'unsupported' | 'checking';

export interface LocationCoordinates {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  timestamp?: number;
}

interface LocationContextType {
  coords: LocationCoordinates;
  permissionState: LocationPermissionState;
  isLocating: boolean;
  errorMessage: string | null;
  hasPrompted: boolean;
  requestExplicitLocation: (forcePrompt?: boolean) => Promise<{ success: boolean; coords?: LocationCoordinates; error?: string }>;
  showPermissionModal: boolean;
  openPermissionModal: () => void;
  closePermissionModal: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [coords, setCoords] = useState<LocationCoordinates>(() => {
    try {
      const saved = sessionStorage.getItem('netseed_last_known_coords');
      return saved ? JSON.parse(saved) : { latitude: null, longitude: null, accuracy: null };
    } catch {
      return { latitude: null, longitude: null, accuracy: null };
    }
  });

  const [permissionState, setPermissionState] = useState<LocationPermissionState>('checking');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasPrompted, setHasPrompted] = useState<boolean>(false);
  const [showPermissionModal, setShowPermissionModal] = useState<boolean>(false);

  // Monitor permission query status where supported (Chrome, Edge, Firefox, Android)
  const checkPermissionState = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setPermissionState('unsupported');
      return;
    }

    if ('permissions' in navigator && navigator.permissions?.query) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        setPermissionState(permission.state as LocationPermissionState);

        permission.onchange = () => {
          setPermissionState(permission.state as LocationPermissionState);
          if (permission.state === 'granted') {
            requestExplicitLocation(false);
          }
        };
      } catch {
        // Permissions API not supported or query restricted
        setPermissionState('prompt');
      }
    } else {
      setPermissionState('prompt');
    }
  }, []);

  useEffect(() => {
    checkPermissionState();
  }, [checkPermissionState]);

  const requestExplicitLocation = useCallback(
    async (forcePrompt = true): Promise<{ success: boolean; coords?: LocationCoordinates; error?: string }> => {
      if (typeof window === 'undefined' || !navigator.geolocation) {
        const err = 'Geolocation is not supported by your browser or device.';
        setErrorMessage(err);
        setPermissionState('unsupported');
        return { success: false, error: err };
      }

      setIsLocating(true);
      setErrorMessage(null);
      setHasPrompted(true);

      return new Promise((resolve) => {
        const timeoutMs = 8000;
        let isSettled = false;

        const timer = setTimeout(() => {
          if (!isSettled) {
            isSettled = true;
            setIsLocating(false);
            const err = 'Location request timed out. Please verify GPS is enabled.';
            setErrorMessage(err);
            resolve({ success: false, error: err });
          }
        }, timeoutMs);

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!isSettled) {
              isSettled = true;
              clearTimeout(timer);
              setIsLocating(false);
              const captured: LocationCoordinates = {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
                timestamp: pos.timestamp,
              };
              setCoords(captured);
              setPermissionState('granted');
              setErrorMessage(null);
              setShowPermissionModal(false);
              try {
                sessionStorage.setItem('netseed_last_known_coords', JSON.stringify(captured));
              } catch {}
              resolve({ success: true, coords: captured });
            }
          },
          (err) => {
            if (!isSettled) {
              isSettled = true;
              clearTimeout(timer);
              setIsLocating(false);
              let msg = 'Unable to retrieve location.';
              if (err.code === err.PERMISSION_DENIED) {
                setPermissionState('denied');
                msg = 'Location permission was denied. Please allow location access in your browser or device settings.';
              } else if (err.code === err.POSITION_UNAVAILABLE) {
                msg = 'Location information is unavailable. Verify that device GPS is switched on.';
              } else if (err.code === err.TIMEOUT) {
                msg = 'Location request timed out.';
              }
              setErrorMessage(msg);
              resolve({ success: false, error: msg });
            }
          },
          {
            enableHighAccuracy: true,
            timeout: timeoutMs,
            maximumAge: 10000,
          }
        );
      });
    },
    []
  );

  return (
    <LocationContext.Provider
      value={{
        coords,
        permissionState,
        isLocating,
        errorMessage,
        hasPrompted,
        requestExplicitLocation,
        showPermissionModal,
        openPermissionModal: () => setShowPermissionModal(true),
        closePermissionModal: () => setShowPermissionModal(false),
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};
