import React, { useState } from 'react';
import { Image, Linking, ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';
import { useData } from '../data';
import { C } from '../theme';
import { KasavuHeader } from '../components/Header';
import { Btn, Txt } from '../components/UI';
import { WaIcon } from '../components/Icons';
import { SettingsSheet } from '../sheets/SettingsSheet';
import { AUTHOR_EMAIL, AUTHOR_NAME, AUTHOR_WHATSAPP } from '../config/author';
import type { RootNav } from '../nav';

export function AboutScreen() {
  const nav = useNavigation<RootNav>();
  const { t, tp } = useData();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <View style={{ flex: 1, backgroundColor: C.cotton }}>
      <KasavuHeader onBack={() => nav.goBack()} onGear={() => setSettingsOpen(true)} />
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 40, alignItems: 'center' }}>
        <Image
          source={require('../../assets/icon.png')}
          style={{ width: 120, height: 120, borderRadius: 28 }}
          resizeMode="contain"
        />
        <Txt w={700} size={24} color={C.greenDeep} style={{ marginTop: 16 }}>
          Payat Book
        </Txt>
        <Txt size={14} color={C.inkSoft} num>
          v{version}
        </Txt>
        <Txt size={15} color={C.inkSoft} style={{ marginTop: 18 }}>
          {tp('developedBy', { n: AUTHOR_NAME })}
        </Txt>
        <View style={{ alignSelf: 'stretch', marginTop: 10 }}>
          <Btn
            label={t('contactWA')}
            kind="wa"
            icon={<WaIcon />}
            onPress={() => Linking.openURL(`https://wa.me/${AUTHOR_WHATSAPP}`).catch(() => {})}
          />
          <Btn
            label={t('contactEmail')}
            kind="ghost"
            onPress={() => Linking.openURL(`mailto:${AUTHOR_EMAIL}`).catch(() => {})}
          />
        </View>
      </ScrollView>
      <SettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </View>
  );
}
