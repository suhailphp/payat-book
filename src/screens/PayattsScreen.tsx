import React, { useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useData } from '../data';
import { dstr, eventTotal, fmt } from '../lib';
import { C } from '../theme';
import { KasavuHeader } from '../components/Header';
import { Avatar, Btn, Empty, Row, SecTitle, StatusChip, Txt } from '../components/UI';
import { SearchableList } from '../components/SearchableList';
import { HostIcon } from '../components/Icons';
import { SettingsSheet } from '../sheets/SettingsSheet';
import { HostSheet } from '../sheets/HostSheet';
import type { RootNav } from '../nav';

/* Payatts tab: hosting only — "Pay a payat" lives in the Payments tab. */
export function PayattsScreen() {
  const nav = useNavigation<RootNav>();
  const { t, lang, events, txns } = useData();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hostOpen, setHostOpen] = useState(false);

  const mine = events
    .filter((e) => e.type === 'hosted')
    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.id - a.id);

  return (
    <View style={{ flex: 1, backgroundColor: C.cotton }}>
      <KasavuHeader onGear={() => setSettingsOpen(true)} />
      <SearchableList
        data={mine}
        keyOf={(e) => String(e.id)}
        searchKeys={['title']}
        placeholder={t('searchPayatts')}
        contentContainerStyle={{ padding: 16, paddingTop: 16, paddingBottom: 96 }}
        empty={<Empty title={t('emptyHostT')} desc={t('emptyHostD')} />}
        header={
          <View>
            <Btn label={t('hostBtn')} icon={<HostIcon />} onPress={() => setHostOpen(true)} style={{ marginTop: 0 }} />
            <SecTitle>{t('myPayatts')}</SecTitle>
          </View>
        }
        renderRow={(e, index, count) => {
          const open = e.status !== 'closed';
          return (
            <Row last={index === count - 1} onPress={() => nav.navigate('Event', { id: e.id })}>
              <Avatar emoji="🏠" />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt w={600} size={16.5} numberOfLines={1}>
                  {e.title}
                </Txt>
                <Txt size={13.5} color={C.inkSoft} numberOfLines={1}>
                  {dstr(e.date, lang)} · {open ? t('stOpen') : t('stFinished')}
                </Txt>
              </View>
              <StatusChip kind={open ? 'gold' : 'pos'} label={fmt(eventTotal(txns, e.id))} />
            </Row>
          );
        }}
      />
      <SettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <HostSheet visible={hostOpen} onClose={() => setHostOpen(false)} onCreated={(id) => nav.navigate('Event', { id })} />
    </View>
  );
}
