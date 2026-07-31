import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import { BubbleItem, fmt, initials, packBubbles } from '../lib';
import { C } from '../theme';
import { Card, Txt } from './UI';
import { useReducedMotion } from '../hooks/useReducedMotion';

const CARD_H = 230;
const TEXT_PAD = 30;

/* One packed, gently floating bubble. Per-bubble randomized periods and
   phase offsets make the motion organic; reduced motion renders static. */
function Bubble({
  p,
  index,
  onPress,
}: {
  p: BubbleItem & { x: number; y: number };
  index: number;
  onPress: () => void;
}) {
  const reduced = useReducedMotion();
  const pop = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(1)).current;
  const oscY = useRef(new Animated.Value(0)).current;
  const oscX = useRef(new Animated.Value(0)).current;
  /* randomized once per bubble: float periods and start phases */
  const rand = useRef({
    dy: 2400 + Math.random() * 1200,
    dx: 2800 + Math.random() * 1600,
    delayY: Math.random() * 700,
    delayX: Math.random() * 900,
  }).current;

  useEffect(() => {
    if (reduced) {
      pop.setValue(1);
      return;
    }
    Animated.spring(pop, {
      toValue: 1,
      delay: index * 70,
      friction: 6,
      tension: 80,
      useNativeDriver: true,
    }).start();
    const ease = Easing.inOut(Easing.sin);
    const wave = (v: Animated.Value, dur: number, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: dur / 2, delay, easing: ease, useNativeDriver: true }),
          Animated.timing(v, { toValue: -1, duration: dur, easing: ease, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: dur / 2, easing: ease, useNativeDriver: true }),
        ]),
        { resetBeforeIteration: false }
      );
    const loopY = wave(oscY, rand.dy, rand.delayY);
    const loopX = wave(oscX, rand.dx, rand.delayX);
    loopY.start();
    loopX.start();
    return () => {
      loopY.stop();
      loopX.stop();
    };
  }, [reduced, index, pop, oscY, oscX, rand]);

  const pos = p.b > 0;
  const wrapW = Math.max(p.d, 84);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: p.x - wrapW / 2,
        top: p.y - p.d / 2,
        width: wrapW,
        alignItems: 'center',
        opacity: pop,
        transform: [
          { translateY: reduced ? 0 : oscY.interpolate({ inputRange: [-1, 1], outputRange: [-7, 7] }) },
          { translateX: reduced ? 0 : oscX.interpolate({ inputRange: [-1, 1], outputRange: [-4, 4] }) },
          { scale: Animated.multiply(pop, press) },
        ],
      }}
    >
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          if (!reduced)
            Animated.timing(press, { toValue: 0.94, duration: 80, useNativeDriver: true }).start();
        }}
        onPressOut={() => {
          if (!reduced) Animated.timing(press, { toValue: 1, duration: 120, useNativeDriver: true }).start();
        }}
        accessibilityLabel={p.name}
        style={{ alignItems: 'center' }}
      >
        <View
          style={{
            width: p.d,
            height: p.d,
            borderRadius: p.d / 2,
            backgroundColor: pos ? C.greenTint : C.redTint,
            borderWidth: 2,
            borderColor: pos ? C.green : C.red,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Txt w={700} size={Math.max(16, p.d / 4)} color={pos ? C.greenDeep : C.red}>
            {initials(p.name)}
          </Txt>
        </View>
        <Txt size={11} color={C.inkSoft} numberOfLines={1} style={{ marginTop: 2, maxWidth: wrapW }}>
          {p.name}
        </Txt>
        <Txt w={700} size={12} color={pos ? C.greenDeep : C.red} num style={{ marginTop: -4 }}>
          {fmt(p.b)}
        </Txt>
      </Pressable>
    </Animated.View>
  );
}

/* Dashboard centerpiece: the people with the largest balances as floating
   bubbles, sized by |balance|, colored by direction. */
export function BalanceBubbles({
  items,
  onPressPerson,
}: {
  items: BubbleItem[];
  onPressPerson: (id: number) => void;
}) {
  const [width, setWidth] = useState(0);
  const placed = width > 0 ? packBubbles(items, width, CARD_H, 10, TEXT_PAD) : [];

  return (
    <Card style={{ height: CARD_H, overflow: 'hidden' }}>
      <View style={{ flex: 1 }} onLayout={(ev) => setWidth(ev.nativeEvent.layout.width)}>
        {placed.map((p, i) => (
          <Bubble key={p.id} p={p} index={i} onPress={() => onPressPerson(p.id)} />
        ))}
      </View>
    </Card>
  );
}
