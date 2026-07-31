import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useData } from '../data';
import { dstr, eventTotal, fmt } from '../lib';
import { C } from '../theme';
import { KasavuHeader } from '../components/Header';
import { Avatar, Btn, Card, Empty, Row, SecTitle, StatusChip, Txt } from '../components/UI';
import { HostIcon, PayIcon } from '../components/Icons';
import { SettingsSheet } from '../sheets/SettingsSheet';
import { HostSheet } from '../sheets/HostSheet';
import { PersonPickerSheet } from '../sheets/PersonPickerSheet';
import { PersonFormSheet } from '../sheets/PersonFormSheet';
import { EntrySheet, EntryCtx } from '../sheets/EntrySheet';
import type { RootNav } from '../nav';

export function PayattsScreen() {
  const nav = useNavigation<RootNav>();
  const { t, lang, events, txns } = useData();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hostOpen, setHostOpen] = useState(false);
  /* "Pay a payat" chain: picker → amount sheet (or new-person → amount sheet) */
  const [pickOpen, setPickOpen] = useState(false);
  const [newPersonOpen, setNewPersonOpen] = useState(false);
  const [entryCtx, setEntryCtx] = useState<EntryCtx | null>(null);

  const mine = events
    .filter((e) => e.type === 'hosted')
    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.id - a.id);

  return (
    <View style={{ flex: 1, backgroundColor: C.cotton }}>
      <KasavuHeader title={t('tabPayatts')} onGear={() => setSettingsOpen(true)} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 16, paddingBottom: 96 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Btn flex label={t('hostBtn')} icon={<HostIcon />} onPress={() => setHostOpen(true)} />
          <Btn flex label={t('payBtn')} kind="gold" icon={<PayIcon />} onPress={() => setPickOpen(true)} />
        </View>

        <SecTitle>{t('myPayatts')}</SecTitle>
        <Card>
          {mine.length ? (
            mine.map((e, i) => {
              const open = e.status !== 'closed';
              return (
                <Row key={e.id} last={i === mine.length - 1} onPress={() => nav.navigate('Event', { id: e.id })}>
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
            })
          ) : (
            <Empty title={t('emptyHostT')} desc={t('emptyHostD')} />
          )}
        </Card>
      </ScrollView>

      <SettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <HostSheet visible={hostOpen} onClose={() => setHostOpen(false)} onCreated={(id) => nav.navigate('Event', { id })} />
      <PersonPickerSheet
        visible={pickOpen}
        title={t('whoPay')}
        onClose={() => setPickOpen(false)}
        onPick={(id) => {
          setPickOpen(false);
          setEntryCtx({ personId: id, dir: 'out' });
        }}
        onNew={() => {
          setPickOpen(false);
          setNewPersonOpen(true);
        }}
      />
      <PersonFormSheet
        visible={newPersonOpen}
        onClose={() => setNewPersonOpen(false)}
        quiet
        onSaved={(id) => setEntryCtx({ personId: id, dir: 'out' })}
      />
      <EntrySheet ctx={entryCtx} onClose={() => setEntryCtx(null)} />
    </View>
  );
}
