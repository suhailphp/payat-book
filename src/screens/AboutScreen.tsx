import React, { useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { useData } from '../data';
import { formatIntlPhone } from '../lib';
import { appVersionLabel } from '../appVersion';
import { C, SHADOW } from '../theme';
import { KasavuHeader } from '../components/Header';
import { Card, Row, Txt } from '../components/UI';
import { ChevronRightIcon, EnvIcon, WaIcon } from '../components/Icons';
import { StaggerIn } from '../components/anim';
import { toast } from '../components/Toast';
import { SettingsSheet } from '../sheets/SettingsSheet';
import { AUTHOR_EMAIL, AUTHOR_NAME, AUTHOR_WHATSAPP } from '../config/author';
import type { RootNav } from '../nav';

/* Short centered kasavu stripe (the header's double-gold motif as a divider) */
const KasavuDivider = () => (
  <View style={{ width: 60, alignSelf: 'center' }}>
    <View style={{ height: 4, backgroundColor: C.gold }} />
    <View style={{ height: 1, backgroundColor: C.gold, marginTop: 2 }} />
  </View>
);

function ContactRow({
  icon,
  label,
  value,
  last,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  last?: boolean;
  onPress: () => void;
}) {
  const { t } = useData();
  const copy = async () => {
    await Clipboard.setStringAsync(value);
    toast(t('copied'));
  };
  return (
    <Pressable onPress={onPress} onLongPress={copy} delayLongPress={400}>
      <Row last={last}>
        <View style={st.iconCircle}>{icon}</View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt w={700} size={12.5} color={C.inkSoft} style={{ letterSpacing: 0.5, textTransform: 'uppercase' }}>
            {label}
          </Txt>
          <Txt w={600} size={16} num numberOfLines={1}>
            {value}
          </Txt>
        </View>
        <ChevronRightIcon />
      </Row>
    </Pressable>
  );
}

export function AboutScreen() {
  const nav = useNavigation<RootNav>();
  const { t } = useData();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const version = appVersionLabel();
  const phoneDisplay = formatIntlPhone(AUTHOR_WHATSAPP);

  return (
    <View style={{ flex: 1, backgroundColor: C.cotton }}>
      <KasavuHeader onBack={() => nav.goBack()} onGear={() => setSettingsOpen(true)} />
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 36, paddingBottom: 48 }}>
        {/* portrait in the kasavu double ring */}
        <StaggerIn index={0} style={{ alignItems: 'center' }}>
          <View style={st.portraitOuter}>
            <View style={st.portraitRing}>
              <Image source={require('../../assets/author-art.jpg')} style={st.portrait} resizeMode="cover" />
            </View>
          </View>
        </StaggerIn>

        {/* identity: literal name, translated title */}
        <StaggerIn index={1} style={{ alignItems: 'center', marginTop: 18 }}>
          <Txt w={700} size={22}>
            {AUTHOR_NAME}
          </Txt>
          <Txt size={15} color={C.inkSoft}>
            {t('authorTitle')}
          </Txt>
          <Txt size={15} color={C.inkSoft} style={{ textAlign: 'center', maxWidth: 300, marginTop: 12 }}>
            {t('authorCta')}
          </Txt>
        </StaggerIn>

        {/* contact card */}
        <StaggerIn index={2} style={{ marginTop: 22 }}>
          <Card>
            <ContactRow
              icon={<WaIcon size={22} color={C.green} />}
              label={t('contactWhatsApp')}
              value={phoneDisplay}
              onPress={() => Linking.openURL(`https://wa.me/${AUTHOR_WHATSAPP.replace(/[^\d]/g, '')}`).catch(() => {})}
            />
            <ContactRow
              icon={<EnvIcon size={22} color={C.green} />}
              label={t('contactEmailLbl')}
              value={AUTHOR_EMAIL}
              last
              onPress={() => Linking.openURL(`mailto:${AUTHOR_EMAIL}`).catch(() => {})}
            />
          </Card>
        </StaggerIn>

        {/* divider + app block */}
        <StaggerIn index={3} style={{ marginTop: 28 }}>
          <KasavuDivider />
          <View style={{ alignItems: 'center', marginTop: 24 }}>
            <Image
              source={require('../../assets/icon.png')}
              style={{ width: 72, height: 72, borderRadius: 18 }}
              resizeMode="contain"
            />
            <Txt w={700} size={19} color={C.greenDeep} style={{ marginTop: 10 }}>
              Payat Book
            </Txt>
            <Txt size={13.5} color={C.inkSoft} num>
              {version}
            </Txt>
            <Txt size={14.5} color={C.inkSoft} style={{ marginTop: 6, textAlign: 'center' }}>
              {t('aboutTagline')}
            </Txt>
          </View>
          <Txt size={13} color={C.inkSoft} style={{ textAlign: 'center', marginTop: 28 }}>
            {t('aboutFooter')}
          </Txt>
        </StaggerIn>
      </ScrollView>
      <SettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </View>
  );
}

const st = StyleSheet.create({
  /* 1px hairline ring (148) → 4px gap → 3px gold ring (138) → 132 portrait */
  portraitOuter: {
    width: 148,
    height: 148,
    borderRadius: 74,
    borderWidth: 1,
    borderColor: C.gold,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW,
  },
  portraitRing: {
    width: 138,
    height: 138,
    borderRadius: 69,
    borderWidth: 3,
    borderColor: C.gold,
    overflow: 'hidden',
  },
  portrait: { width: 132, height: 132, borderRadius: 66 },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
