// TypeScript declarations for Plausible Analytics
declare global {
  interface Window {
    plausible?: (event: string, options?: PlausibleOptions) => void;
  }
}

interface PlausibleOptions {
  props?: Record<string, string | number>;
  callback?: () => void;
}

export {};
