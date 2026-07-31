import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '../data';
import { C } from '../theme';
import { BrandLogo } from '../components/BrandLogo';
import { GlobeIcon } from '../components/Icons';
import { Btn, Field, Txt } from '../components/UI';
import { toast } from '../components/Toast';

/* One-time welcome: asks the owner's name before the tabs appear.
   Language toggle lives here too so the very first screen is readable. */
export function OnboardingScreen() {
  const { t, lang, setLang, setMeta } = useData();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');

  const start = async () => {
    const n = name.trim();
    if (!n) {
      toast(t('tEnterName'));
      return;
    }
    await setMeta('ownerName', n);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: C.cotton }}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          padding: 24,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <BrandLogo height={56} />
        </View>
        <Txt w={700} size={22} color={C.greenDeep} style={{ textAlign: 'center', marginBottom: 20 }}>
          {t('welcome')}
        </Txt>
        <Field label={t('whatsYourName')} hint={t('nameHint')} value={name} onChangeText={setName} autoCorrect={false} />
        <Btn label={t('getStarted')} onPress={start} />
      </ScrollView>
      {/* compact language toggle, top-right, EN ⇄ ML */}
      <Pressable
        onPress={() => setLang(lang === 'en' ? 'ml' : 'en')}
        accessibilityLabel={t('langToggle')}
        hitSlop={8}
        style={({ pressed }) => [
          {
            position: 'absolute',
            top: insets.top + 8,
            right: 16,
            width: 44,
            height: 44,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
          },
          pressed && { backgroundColor: C.paper },
        ]}
      >
        <GlobeIcon />
      </Pressable>
    </KeyboardAvoidingView>
  );
}
