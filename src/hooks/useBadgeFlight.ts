import { RefObject, useLayoutEffect } from 'react';

const BADGE_FLIGHT_DURATION_MS = 600;
const BADGE_FLIGHT_EASING = 'cubic-bezier(0.3, 0.7, 0.3, 1)';

export const BADGE_FLIGHT_SETTLE_MS = BADGE_FLIGHT_DURATION_MS + 100;

export const useBadgeFlight = (
  isActive: boolean,
  sourceRef: RefObject<HTMLElement>,
  badgeRef: RefObject<HTMLElement>
) => {
  useLayoutEffect(() => {
    const source = sourceRef.current;
    const badge = badgeRef.current;
    if (!isActive || !source || !badge) return;

    const from = source.getBoundingClientRect();
    const to = badge.getBoundingClientRect();
    const deltaX = from.left + from.width / 2 - (to.left + to.width / 2);
    const deltaY = from.top + from.height / 2 - (to.top + to.height / 2);
    const scale = from.width / to.width;

    badge.style.transition = 'none';
    badge.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${scale})`;
    badge.getBoundingClientRect();
    badge.style.transition = `transform ${BADGE_FLIGHT_DURATION_MS}ms ${BADGE_FLIGHT_EASING}`;
    badge.style.transform = 'none';
  }, [isActive]);
};
