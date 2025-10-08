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
