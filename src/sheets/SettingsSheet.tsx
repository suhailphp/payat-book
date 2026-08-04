import React from 'react';
import { Linking, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useData } from '../data';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';
import { Btn, Field, Row, Seg, Txt } from '../components/UI';
import { ChevronRightIcon, InfoIcon, SaveIcon } from '../components/Icons';
import { toast } from '../components/Toast';
import { getPermissionGranted, notificationsSupported, requestPermission } from '../notifications';
import { appVersionLabel } from '../appVersion';
import type { RootNav } from '../nav';

export function SettingsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const nav = useNavigation<RootNav>();
  const { t, lang, setLang, meta, setMeta } = useData();
  const [permGranted, setPermGranted] = React.useState(true);

  React.useEffect(() => {
    if (visible && notificationsSupported) getPermissionGranted().then(setPermGranted);
  }, [visible]);

  /* retry path when reminders were denied: re-ask, else open OS settings */
  const retryNotifications = async () => {
    const granted = await requestPermission();
    setPermGranted(granted);
    if (!granted) Linking.openSettings().catch(() => {});
  };

  const [name, setName] = React.useState(meta.ownerName ?? '');

  React.useEffect(() => {
    if (visible) setName(meta.ownerName ?? '');
  }, [visible, meta.ownerName]);

  const saveName = async () => {
    const n = name.trim();
    if (!n || n === meta.ownerName) return;
    await setMeta('ownerName', n);
    toast(t('tSaved'));
  };

  const goto = (screen: 'Backup' | 'About') => {
    onClose();
    nav.navigate(screen);
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t('settingsT')}>
      <Field
        label={t('yourName')}
        value={name}
        onChangeText={setName}
        onBlur={saveName}
        onSubmitEditing={saveName}
        autoCorrect={false}
      />
      <View style={{ marginBottom: 14 }}>
        <Txt w={700} size={13} color={C.inkSoft} style={{ letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 5 }}>
          {t('language')}
        </Txt>
        <Seg
          options={[
            { value: 'en', label: 'English' },
            { value: 'ml', label: 'മലയാളം' },
          ]}
          value={lang}
          onChange={(v) => setLang(v as 'en' | 'ml')}
        />
      </View>

      {/* backup lives on its own page now — this row navigates there */}
      <Row onPress={() => goto('Backup')}>
        <SaveIcon color={C.greenDeep} />
        <Txt w={600} size={16} style={{ flex: 1, marginLeft: 12 }}>
          {t('backupPage')}
        </Txt>
        <ChevronRightIcon />
      </Row>

      {notificationsSupported && !permGranted ? (
        <View style={{ marginTop: 14 }}>
          <Txt size={13.5} color={C.inkSoft}>
            {t('notifOff')}
          </Txt>
          <Btn label={t('notifExplain')} kind="gold" onPress={retryNotifications} />
        </View>
      ) : null}

      <Row onPress={() => goto('About')} last>
        <InfoIcon color={C.greenDeep} />
        <Txt w={600} size={16} style={{ flex: 1, marginLeft: 12 }}>
          {t('about')}
        </Txt>
        <ChevronRightIcon />
      </Row>

      <Txt size={12} color={C.inkSoft} num style={{ textAlign: 'center', marginTop: 20, opacity: 0.7 }}>
        {appVersionLabel()}
      </Txt>
    </Sheet>
  );
}
