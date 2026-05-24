function vibrate(p: number | number[]) {
  if (typeof navigator === 'undefined') return;
  const nav = navigator as Navigator & {
    vibrate?: (pattern: number | number[]) => boolean;
  };
  if (typeof nav.vibrate === 'function') {
    try {
      nav.vibrate(p);
    } catch {
      // ignore
    }
  }
}

export const haptic = {
  light: () => vibrate(6),
  medium: () => vibrate(14),
  tap: () => vibrate([8, 22, 8]),
  success: () => vibrate([12, 40, 12]),
};
