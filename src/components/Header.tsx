import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { C } from '../theme';
import { BrandLogo } from './BrandLogo';
import { BackIcon, GearIcon } from './Icons';
import { useReducedMotion } from '../hooks/useReducedMotion';
import type { RootNav } from '../nav';

/* one subtle gold shimmer sweep across the kasavu stripe, once per app open */
let shimmerPlayed = false;

/* White header crowned with the double gold "kasavu" stripe: a 4px gold bar
   and a 1px gold hairline beneath it. Every screen shows the brand logo
   (tap → Book tab); the gear sits rightmost, contextual actions beside it. */
export function KasavuHeader({
  onBack,
  onGear,
  actions,
}: {
  onBack?: () => void;
  onGear?: () => void;
  actions?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<RootNav>();
  const reduced = useReducedMotion();
  const [stripeW, setStripeW] = useState(0);
  const sweep = useRef(new Animated.Value(0)).current;
  const [showSweep, setShowSweep] = useState(!shimmerPlayed);

  useEffect(() => {
    if (shimmerPlayed || stripeW === 0) return;
    shimmerPlayed = true;
    if (reduced) {
      setShowSweep(false);
      return;
    }
    Animated.timing(sweep, { toValue: 1, duration: 2000, useNativeDriver: true }).start(() =>
      setShowSweep(false)
    );
  }, [stripeW, reduced, sweep]);

  return (
    <View>
      <View style={[st.bar, { paddingTop: insets.top + 8 }]}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            accessibilityLabel="Back"
            style={({ pressed }) => [st.hbtn, { marginLeft: -8 }, pressed && { backgroundColor: C.cotton }]}
          >
            <BackIcon />
          </Pressable>
        ) : null}
        <View style={{ flex: 1, alignItems: 'flex-start' }}>
          <Pressable
            onPress={() => nav.navigate('Tabs', { screen: 'HomeTab' })}
            hitSlop={12}
            accessibilityLabel="Payat Book"
          >
            <BrandLogo />
          </Pressable>
        </View>
        {actions}
        {onGear ? (
          <Pressable
            onPress={onGear}
            accessibilityLabel="Settings"
            style={({ pressed }) => [st.hbtn, pressed && { backgroundColor: C.cotton }]}
          >
            <GearIcon />
          </Pressable>
        ) : null}
      </View>
      <View style={st.kasavu} onLayout={(ev) => setStripeW(ev.nativeEvent.layout.width)}>
        <View style={st.kasavuBar} />
        <View style={st.kasavuHairline} />
        {showSweep && stripeW > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              st.sweep,
              {
                transform: [
                  { translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-90, stripeW] }) },
                ],
              },
            ]}
          />
        ) : null}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  bar: {
    backgroundColor: C.paper,
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 56,
  },
  hbtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  kasavu: { height: 7, backgroundColor: 'transparent', overflow: 'hidden' },
  kasavuBar: { height: 4, backgroundColor: C.gold },
  kasavuHairline: { height: 1, backgroundColor: C.gold, marginTop: 2 },
  sweep: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 90,
    backgroundColor: 'rgba(255, 250, 230, 0.35)',
  },
});
