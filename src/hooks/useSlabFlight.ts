import { useLayoutEffect, useRef } from 'react';

const FLIGHT_DURATION_MS = 750;
const FLIGHT_END_FALLBACK_MS = FLIGHT_DURATION_MS + 300;
const FLIGHT_EASING = 'cubic-bezier(0.5, 0, 0.2, 1)';
const FLIGHT_Z_INDEX = '50';

export const useSlabFlight = (targetRect: DOMRect | null, onFlightEnd?: () => void) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const onFlightEndRef = useRef(onFlightEnd);
  onFlightEndRef.current = onFlightEnd;

  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!targetRect || !element) return;

    const ownRect = element.getBoundingClientRect();
    const deltaX = targetRect.left - ownRect.left;
    const deltaY = targetRect.top - ownRect.top;
    const scale = targetRect.width / ownRect.width;

    let hasEnded = false;
    const endFlight = () => {
      if (hasEnded) return;
      hasEnded = true;
      onFlightEndRef.current?.();
    };

    const handleTransitionEnd = (event: TransitionEvent) => {
      if (event.target === element && event.propertyName === 'transform') endFlight();
    };

    element.style.transformOrigin = 'top left';
    element.style.zIndex = FLIGHT_Z_INDEX;
    element.getBoundingClientRect();
    element.style.transition = `transform ${FLIGHT_DURATION_MS}ms ${FLIGHT_EASING}`;
    element.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${scale})`;

    element.addEventListener('transitionend', handleTransitionEnd);
    const fallbackTimer = setTimeout(endFlight, FLIGHT_END_FALLBACK_MS);

    return () => {
      element.removeEventListener('transitionend', handleTransitionEnd);
      clearTimeout(fallbackTimer);
    };
  }, [targetRect]);

  return elementRef;
};
