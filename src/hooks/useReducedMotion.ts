import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/* True when the OS asks for reduced motion — all decorative animations
   must render their final state instantly. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const mq =
        typeof window !== 'undefined' && window.matchMedia
          ? window.matchMedia('(prefers-reduced-motion: reduce)')
          : null;
      if (!mq) return;
      setReduced(mq.matches);
      const onChange = (ev: MediaQueryListEvent) => setReduced(ev.matches);
      mq.addEventListener?.('change', onChange);
      return () => mq.removeEventListener?.('change', onChange);
    }
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduced(!!v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => setReduced(!!v));
    return () => {
      mounted = false;
      sub?.remove();
    };
  }, []);

  return reduced;
}
