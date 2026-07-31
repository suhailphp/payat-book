import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, FONT } from '../theme';

/* Module-level toast store so a ToastHost can live both at app root and
   inside sheet Modals (a root-level toast would be hidden behind a Modal). */
type Listener = (msg: string) => void;
const listeners = new Set<Listener>();

export function toast(msg: string) {
  listeners.forEach((l) => l(msg));
}

export function ToastHost() {
  const [msg, setMsg] = useState('');
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const l: Listener = (m) => {
      setMsg(m);
      if (timer.current) clearTimeout(timer.current);
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start();
      }, 2200);
    };
    listeners.add(l);
    return () => {
      listeners.delete(l);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [opacity]);

  return (
    <Animated.View style={[st.toast, { opacity, bottom: 84 + insets.bottom, pointerEvents: 'none' }]}>
      <Animated.Text numberOfLines={1} style={st.text}>
        {msg}
      </Animated.Text>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: C.ink,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    maxWidth: '92%',
    zIndex: 40,
  },
  text: { color: '#fff', fontSize: 15, fontFamily: FONT.semibold },
});
