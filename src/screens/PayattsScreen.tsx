import React, { useState } from 'react';
import { FlatList, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useData } from '../data';
import { dstr, eventTotal, fmt } from '../lib';
import { C } from '../theme';
import { KasavuHeader } from '../components/Header';
import { Avatar, Btn, Card, Empty, listCardWrap, Row, SearchInput, SecTitle, StatusChip, Txt } from '../components/UI';
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
  const [q, setQ] = useState('');

  const mine = events
    .filter((e) => e.type === 'hosted')
    .filter((e) => e.title.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.id - a.id);

  return (
    <View style={{ flex: 1, backgroundColor: C.cotton }}>
      <KasavuHeader onGear={() => setSettingsOpen(true)} />
      <FlatList
        data={mine}
        keyExtractor={(e) => String(e.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingTop: 16, paddingBottom: 96 }}
        ListHeaderComponent={
          <View>
            <Btn label={t('hostBtn')} icon={<HostIcon />} onPress={() => setHostOpen(true)} style={{ marginTop: 0 }} />
            <View style={{ marginTop: 14 }}>
              <SearchInput value={q} onChangeText={setQ} placeholder={t('searchPayatts')} autoCorrect={false} />
            </View>
            <SecTitle>{t('myPayatts')}</SecTitle>
          </View>
        }
        renderItem={({ item: e, index }) => {
          const open = e.status !== 'closed';
          return (
            <View style={listCardWrap(index, mine.length)}>
              <Row last={index === mine.length - 1} onPress={() => nav.navigate('Event', { id: e.id })}>
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
            </View>
          );
        }}
        ListEmptyComponent={
          <Card>
            <Empty title={t('emptyHostT')} desc={t('emptyHostD')} />
          </Card>
        }
      />
      <SettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <HostSheet visible={hostOpen} onClose={() => setHostOpen(false)} onCreated={(id) => nav.navigate('Event', { id })} />
    </View>
  );
}
