/**
 * Error Formatter Utility for netSEED Hub
 * Transforms raw technical, database, network, and validation errors
 * into clear, polite, and user-friendly messages.
 */

export function formatFieldLabel(fieldName: string): string {
  if (!fieldName) return 'Field';
  return fieldName
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .toLowerCase()
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/**
 * Formats any raw error, API response, or exception into a user-friendly message.
 */
export function toFriendlyErrorMessage(
  raw: any,
  status?: number,
  errorData?: any
): string {
  // 1. Extract base string message
  let msg = '';
  if (typeof raw === 'string') {
    msg = raw.trim();
  } else if (raw instanceof Error) {
    msg = (raw.message || '').trim();
  } else if (raw && typeof raw === 'object') {
    msg = raw.detail || raw.message || JSON.stringify(raw);
  }

  // 2. If errorData contains a structured Pydantic array of validation errors
  const detail = errorData?.detail || (Array.isArray(raw) ? raw : null);
  if (Array.isArray(detail) && detail.length > 0) {
    const formattedItems = detail.map((d: any) => {
      if (typeof d === 'string') return d;
      const fieldPath = Array.isArray(d.loc) ? d.loc.filter((part: any) => part !== 'body').join('.') : '';
      const label = formatFieldLabel(fieldPath || '');
      const rawMsg = d.msg || 'Invalid value';

      if (d.type === 'missing') {
        return `${label || 'Required field'} is required`;
      }
      if (rawMsg.includes('valid datetime') || rawMsg.includes('valid date')) {
        return `${label || 'Date'} must be a valid date/time format`;
      }
      if (rawMsg.includes('at least') || rawMsg.includes('greater than')) {
        return `${label || 'Field'}: ${rawMsg}`;
      }
      return label ? `${label}: ${rawMsg}` : rawMsg;
    });

    return formattedItems.join('. ') + '.';
  }

  // Unpack JSON string if error is double-encoded JSON like '{"detail":"..."}'
  if (msg.startsWith('{') && msg.endsWith('}')) {
    try {
      const parsed = JSON.parse(msg);
      if (typeof parsed.detail === 'string') {
        msg = parsed.detail;
      } else if (typeof parsed.message === 'string') {
        msg = parsed.message;
      }
    } catch {
      // Keep as-is
    }
  }

  // 3. Preserve critical application signals while making the wording helpful
  if (msg.includes('ACCESS_REVOKED')) {
    return 'ACCESS_REVOKED: Your account access has been suspended or deactivated. Please contact your HR administrator at hr@netlink.org for assistance.';
  }

  // 4. Network and connectivity issues
  const isNetworkIssue =
    status === 0 ||
    msg === 'Failed to fetch' ||
    msg.includes('NetworkError') ||
    msg.includes('net::ERR') ||
    msg.includes('Unable to connect to backend server');

  if (isNetworkIssue) {
    return 'Unable to connect to the server. Please check your internet connection and verify that the backend service is running.';
  }

  if (msg.includes('Received HTML instead of API response')) {
    return 'The server is temporarily taking longer than expected to respond. Please refresh the page in a moment.';
  }

  // 5. Database, connection pool, or SQLAlchemy crashes
  const isDatabaseError =
    msg.includes('tenant/user') ||
    msg.includes('pooler.supabase.com') ||
    msg.includes('OperationalError') ||
    msg.includes('sqlite3') ||
    msg.includes('SQLAlchemy') ||
    msg.includes('database is locked') ||
    msg.includes('FATAL:') ||
    msg.includes('sqlalche.me') ||
    msg.includes('psycopg') ||
    msg.includes('no such table') ||
    msg.includes('no such column');

  if (isDatabaseError) {
    return 'Our database is temporarily updating or undergoing maintenance. Please try again in a few moments.';
  }

  // 6. Authentication and credential issues (401)
  if (
    status === 401 ||
    msg.toLowerCase().includes('password does not match') ||
    msg.toLowerCase().includes('invalid credentials')
  ) {
    if (msg.toLowerCase().includes('must be at least')) {
      return 'Password must be at least 6 characters long.';
    }
    if (msg.toLowerCase().includes('current password')) {
      return 'Your current password does not match our records. Please try again.';
    }
    return 'Incorrect email or password. Please verify your credentials and try again.';
  }

  if (
    msg.toLowerCase().includes('not authenticated') ||
    msg.toLowerCase().includes('could not validate credentials') ||
    msg.toLowerCase().includes('signature has expired') ||
    msg.toLowerCase().includes('token has expired')
  ) {
    return 'Your login session has expired. Please sign in again to continue.';
  }

  // 7. Authorization issues (403)
  if (status === 403 || msg.toLowerCase().includes('forbidden') || msg.toLowerCase().includes('not authorized')) {
    return 'You do not have permission to perform this action or view this section.';
  }

  // 8. Not found issues (404)
  if (status === 404 || msg === 'Not Found' || msg === '{"detail":"Not Found"}') {
    if (msg.toLowerCase().includes('student')) {
      return 'The requested student record could not be found.';
    }
    if (msg.toLowerCase().includes('assessment')) {
      return 'The requested assessment could not be found.';
    }
    if (msg.toLowerCase().includes('batch')) {
      return 'The requested batch could not be found.';
    }
    return 'The requested information could not be found. It may have been moved or removed.';
  }

  // 9. Duplicate / Conflict issues (409)
  if (
    status === 409 ||
    msg.toLowerCase().includes('already exists') ||
    msg.toLowerCase().includes('unique constraint')
  ) {
    if (msg.toLowerCase().includes('roll')) {
      return 'A student with this roll number is already registered.';
    }
    if (msg.toLowerCase().includes('email')) {
      return 'An account with this email address already exists.';
    }
    return 'A record with these details already exists in the system.';
  }

  // 10. Attendance and Geofence specific errors
  if (msg.toLowerCase().includes('outside designated geofence') || msg.toLowerCase().includes('outside geofence')) {
    return 'You are currently outside the designated campus premises. Please punch attendance from within the campus boundary.';
  }

  if (msg.toLowerCase().includes('no face detected')) {
    return 'No face was detected. Please ensure your face is well-lit and directly facing the camera.';
  }

  if (msg.toLowerCase().includes('multiple faces detected')) {
    return 'Multiple faces were detected. Please ensure only you are visible in the camera frame.';
  }

  if (msg.toLowerCase().includes('face match failed') || msg.toLowerCase().includes('threshold')) {
    return 'Face verification could not match your registered biometric profile. Please ensure clear lighting without accessories.';
  }

  if (msg.toLowerCase().includes('liveness failed') || msg.toLowerCase().includes('anti-spoof')) {
    return 'Liveness verification could not be confirmed. Please follow the instructions and try again.';
  }

  // 11. Location and GPS permissions
  if (
    msg.toLowerCase().includes('geolocation') ||
    msg.toLowerCase().includes('location permission') ||
    msg.toLowerCase().includes('gps')
  ) {
    if (msg.toLowerCase().includes('denied')) {
      return 'Location access was denied. Please allow location permissions in your browser to record attendance.';
    }
    if (msg.toLowerCase().includes('timed out')) {
      return 'Location request took too long. Please ensure GPS is enabled on your device and try again.';
    }
    return 'Unable to access your location. Please check your device location settings.';
  }

  // 12. Generic server errors (500)
  if (status === 500 || msg.startsWith('Internal Server Error')) {
    return 'A temporary system error occurred. Please try again in a few moments.';
  }

  // 13. Fallback: Clean up any technical exception formatting
  let cleanMsg = msg
    .replace(/^error:\s*/i, '')
    .replace(/^exception:\s*/i, '')
    .replace(/\[sql:.*?\]/gis, '')
    .replace(/\(Background on this error at:.*?\)/gi, '')
    .trim();

  // If after cleaning it's empty or still looks like raw code
  if (!cleanMsg || cleanMsg.includes('Traceback (most recent call last)')) {
    return 'A temporary system error occurred. Please try again in a few moments.';
  }

  // Ensure first letter is capitalized and ends with a period if it looks like a sentence
  cleanMsg = cleanMsg.charAt(0).toUpperCase() + cleanMsg.slice(1);
  if (!cleanMsg.endsWith('.') && !cleanMsg.endsWith('!') && !cleanMsg.endsWith('?')) {
    cleanMsg += '.';
  }

  return cleanMsg;
}

