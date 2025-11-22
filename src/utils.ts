/**
 * Deep equality comparison for any two values
 * Handles primitives, arrays, objects, and nested structures
 */
export function deepEqual(a: any, b: any): boolean {
  // Same reference or both null/undefined
  if (a === b) return true;
  
  // One is null/undefined, the other isn't
  if (a == null || b == null) return false;
  
  // Different types
  if (typeof a !== typeof b) return false;
  
  // Handle primitives
  if (typeof a !== 'object') return a === b;
  
  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  
  // One is array, other isn't
  if (Array.isArray(a) || Array.isArray(b)) return false;
  
  // Handle objects
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  
  return true;
}

/**
 * Deep copy for any value
 * Handles primitives, arrays, objects, and nested structures
 */
export function deepCopy<T>(obj: T): T {
  // Handle primitives and null/undefined
  if (obj == null || typeof obj !== 'object') return obj;
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => deepCopy(item)) as T;
  }
  
  // Handle objects
  const copy = {} as T;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      copy[key] = deepCopy(obj[key]);
    }
  }
  
  return copy;
}

/**
 * Format a date string to a standardized display format using UTC
 * This ensures all users see the same date regardless of their timezone
 */
export function formatDateUTC(dateString: string): string {
  try {
    const date = new Date(dateString);
    // Use UTC methods to avoid timezone conversion
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    
    // Create a new date object in UTC for consistent formatting
    const utcDate = new Date(Date.UTC(year, month, day));
    
    return utcDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString; // Return original string if formatting fails
  }
}

/**
 * Get a standardized date string in YYYY-MM-DD format using UTC
 * This ensures consistent date comparison across timezones
 */
export function getStandardizedDateString(dateString: string): string {
  try {
    const date = new Date(dateString);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error getting standardized date string:', error);
    return dateString;
  }
}

/**
 * Check if a date is today using UTC to avoid timezone issues
 */
export function isTodayUTC(date: Date): boolean {
  const now = new Date();
  return (
    date.getUTCFullYear() === now.getUTCFullYear() &&
    date.getUTCMonth() === now.getUTCMonth() &&
    date.getUTCDate() === now.getUTCDate()
  );
}

/**
 * Check if a date string represents today or a date in the past (in UTC)
 * This ensures consistent date checking across timezones
 */
export function isTodayOrBefore(dateString: string): boolean {
  let date: Date;
  
  if (dateString.includes('T') || dateString.includes(' ')) {
    date = new Date(dateString);
  } else {
    date = new Date(dateString + 'T00:00:00Z');
  }
  
  if (isNaN(date.getTime())) {
    return false;
  }
  
  const now = new Date();
  const puzzleDate = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  ));
  const today = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  ));
  
  return puzzleDate <= today;
}

/**
 * Detect if the current platform is iOS
 */
export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
