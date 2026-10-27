import React, { useState } from 'react';
import { useLocation } from '../context/LocationContext';
import { Button } from './Button';
import {
  MapPin,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  X,
  Compass,
  Navigation
} from 'lucide-react';

interface LocationAccessPromptProps {
  variant?: 'banner' | 'card' | 'modal' | 'pill';
  onGranted?: () => void;
  className?: string;
}

export const LocationAccessPrompt: React.FC<LocationAccessPromptProps> = ({
  variant = 'banner',
  onGranted,
  className = '',
}) => {
  const {
    coords,
    permissionState,
    isLocating,
    errorMessage,
    requestExplicitLocation,
    showPermissionModal,
    closePermissionModal,
  } = useLocation();

  const [showTroubleshoot, setShowTroubleshoot] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const handleRequest = async () => {
    const res = await requestExplicitLocation(true);
    if (res.success && onGranted) {
      onGranted();
    }
  };

  // If location is already verified and granted:
  if (permissionState === 'granted' && coords.latitude !== null) {
    if (variant === 'pill') {
      return (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold ${className}`}>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>GPS Active {coords.accuracy ? `(±${Math.round(coords.accuracy)}m)` : ''}</span>
        </div>
      );
    }
    return (
      <div className={`flex items-center justify-between p-3 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs shadow-xs ${className}`}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <div className="font-bold flex items-center gap-1.5">
              <span>Location Access Granted</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-300 font-semibold">
                Verified
              </span>
            </div>
            <div className="text-[11px] text-emerald-700/80 dark:text-emerald-400/90">
              Campus geofence and attendance coordinates actively synchronized {coords.accuracy ? `(Accurate to ${Math.round(coords.accuracy)}m)` : ''}.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If user dismissed this session in banner mode:
  if (isDismissed && variant === 'banner') {
    return null;
  }

  // Troubleshooter instructions for browsers
  const renderTroubleshoot = () => (
    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-[11px] space-y-2 text-slate-600 dark:text-slate-300 font-sans">
      <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
        <HelpCircle className="w-3.5 h-3.5 text-sky-500" />
        <span>How to allow location access in your browser or device:</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <strong className="block text-slate-900 dark:text-slate-100 mb-0.5">Google Chrome / MS Edge:</strong>
          Click the padlock or tune icon in the address bar (left of the website URL) → Set <em>Location</em> to <strong>Allow</strong> → Refresh page.
        </div>
        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <strong className="block text-slate-900 dark:text-slate-100 mb-0.5">Safari (iOS / iPhone):</strong>
          Go to <em>Settings</em> → <em>Safari</em> → <em>Location</em> → Select <strong>Allow</strong>. Ensure device <em>Location Services</em> are turned ON in Privacy settings.
        </div>
        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <strong className="block text-slate-900 dark:text-slate-100 mb-0.5">Android (Chrome / WebView):</strong>
          Tap the three dots (⋮) → <em>Settings</em> → <em>Site settings</em> → <em>Location</em> → Enable location. Also ensure device GPS toggle is turned ON.
        </div>
        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <strong className="block text-slate-900 dark:text-slate-100 mb-0.5">Mozilla Firefox:</strong>
          Click the permission icon on the left side of the address bar → Clear "Blocked Temporarily" → Click "Allow Location" below.
        </div>
      </div>
    </div>
  );

  // CARD VARIANT (Used on Login Page or Settings)
  if (variant === 'card') {
    const isDenied = permissionState === 'denied';
    return (
      <div className={`p-4 rounded-2xl border transition-all ${
        isDenied
          ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60'
          : 'bg-sky-50/70 dark:bg-sky-950/20 border-sky-200 dark:border-sky-800/60'
      } ${className}`}>
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-xl shrink-0 ${
            isDenied
              ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
              : 'bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 animate-pulse'
          }`}>
            {isDenied ? <AlertTriangle className="w-5 h-5" /> : <Navigation className="w-5 h-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>{isDenied ? 'Location Access Blocked' : 'Device Location Access Required'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-sky-200/80 dark:bg-sky-900/80 text-sky-900 dark:text-sky-200">
                  Campus Geofence
                </span>
              </h4>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              netSEED Hub requires GPS location to verify office campus attendance and ensure security compliance during authentication.
            </p>

            {errorMessage && (
              <div className="mt-2 text-[11px] text-rose-600 dark:text-rose-400 font-medium bg-rose-50 dark:bg-rose-950/30 p-2 rounded-lg border border-rose-200 dark:border-rose-900/50">
                {errorMessage}
              </div>
            )}

            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                variant={isDenied ? 'secondary' : 'primary'}
                onClick={handleRequest}
                isLoading={isLocating}
                className="text-xs font-bold"
              >
                <Compass className="w-3.5 h-3.5 mr-1.5" />
                {isLocating ? 'Detecting GPS Location...' : isDenied ? 'Retry Location Request' : 'Allow Location Access'}
              </Button>
              <button
                type="button"
                onClick={() => setShowTroubleshoot(!showTroubleshoot)}
                className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1"
              >
                <span>{showTroubleshoot ? 'Hide Help' : 'Help & Permissions'}</span>
                {showTroubleshoot ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {showTroubleshoot && renderTroubleshoot()}
          </div>
        </div>
      </div>
    );
  }

  // BANNER VARIANT (Top notification across application)
  return (
    <div className={`relative px-4 py-3 rounded-2xl border transition-all ${
      permissionState === 'denied'
        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
        : 'bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200'
    } shadow-xs ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs shrink-0 text-sky-600 dark:text-sky-400">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-xs flex items-center gap-1.5">
              <span>Explicit Location Access Notice</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white/80 dark:bg-slate-800 font-mono font-medium">
                {permissionState.toUpperCase()}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
              {permissionState === 'denied'
                ? 'Location was denied in your browser settings. Please enable location for attendance marking.'
                : 'Click "Allow Location Access" so netSEED Hub can verify your office attendance geofence.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="primary"
            onClick={handleRequest}
            isLoading={isLocating}
            className="text-xs font-bold py-1.5"
          >
            <Navigation className="w-3.5 h-3.5 mr-1" />
            {isLocating ? 'Detecting...' : 'Allow Location'}
          </Button>
          <button
            type="button"
            onClick={() => setShowTroubleshoot(!showTroubleshoot)}
            className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 px-2 py-1"
            title="Permission help"
          >
            Help
          </button>
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            title="Dismiss notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showTroubleshoot && renderTroubleshoot()}
    </div>
  );
};
