import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '../theme';
import { BrandLogo } from './BrandLogo';
import { BackIcon, GearIcon } from './Icons';

/* White header crowned with the double gold "kasavu" stripe: a 4px gold bar
   and a 1px gold hairline beneath it. Every screen shows the brand logo;
   detail screens add the back arrow, titles live in the content hero. */
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
          <BrandLogo />
        </View>
        {onGear ? (
          <Pressable
            onPress={onGear}
            accessibilityLabel="Settings"
            style={({ pressed }) => [st.hbtn, pressed && { backgroundColor: C.cotton }]}
          >
            <GearIcon />
          </Pressable>
        ) : null}
        {actions}
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
