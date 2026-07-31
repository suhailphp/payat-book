import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleProp, ViewStyle } from 'react-native';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { Txt } from './UI';

/* Mount entrance: opacity 0→1 + translateY 12→0, 260ms, staggered by
   index (~70ms). Skipped entirely under reduced motion. */
export function StaggerIn({
  index = 0,
  style,
  children,
}: {
  index?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(0)).current;
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    if (reduced) {
      v.setValue(1);
      started.current = true;
      return;
    }
    started.current = true;
    Animated.timing(v, {
      toValue: 1,
      duration: 260,
      delay: index * 70,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [reduced, index, v]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: v,
          transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/* Count-up number: animates from the previous value to the new one over
   ~600ms. Tabular numerals (num) prevent width jitter. */
export function CountUp({
  value,
  format,
  ...txtProps
}: {
  value: number;
  format: (n: number) => string;
} & Omit<React.ComponentProps<typeof Txt>, 'children'>) {
  const reduced = useReducedMotion();
  const [disp, setDisp] = useState(0);
  const anim = useRef(new Animated.Value(0)).current;
  const from = useRef(0);

  useEffect(() => {
    if (reduced) {
      from.current = value;
      setDisp(value);
      return;
    }
    const start = from.current;
    from.current = value;
    anim.setValue(0);
    const id = anim.addListener(({ value: p }) => setDisp(Math.round(start + (value - start) * p)));
    Animated.timing(anim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      anim.removeListener(id);
      setDisp(value);
    });
    return () => anim.removeListener(id);
  }, [value, reduced, anim]);

  return (
    <Txt {...txtProps} num>
      {format(disp)}
    </Txt>
  );
}
