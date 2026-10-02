import { useEffect, useState } from 'react';

export const useIdleFlag = (delayMilliseconds: number, resetSignals: unknown[]): boolean => {
  const [isIdle, setIsIdle] = useState(false);

  useEffect(() => {
    setIsIdle(false);
    const timer = setTimeout(() => setIsIdle(true), delayMilliseconds);
    return () => clearTimeout(timer);
  }, resetSignals);

  return isIdle;
}
