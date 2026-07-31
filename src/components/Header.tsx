import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { C } from '../theme';
import { BrandLogo } from './BrandLogo';
import { BackIcon, GearIcon } from './Icons';
import type { RootNav } from '../nav';

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
      <View style={st.kasavu}>
        <View style={st.kasavuBar} />
        <View style={st.kasavuHairline} />
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
  kasavu: { height: 7, backgroundColor: 'transparent' },
  kasavuBar: { height: 4, backgroundColor: C.gold },
  kasavuHairline: { height: 1, backgroundColor: C.gold, marginTop: 2 },
});
