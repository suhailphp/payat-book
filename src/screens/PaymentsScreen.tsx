import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useData } from '../data';
import { dstr, filterPayments, fmt } from '../lib';
import { C } from '../theme';
import { KasavuHeader } from '../components/Header';
import { Avatar, Btn, Card, Empty, listCardWrap, Row, SearchInput, SecTitle, Txt } from '../components/UI';
import { PayHandsIcon, TrashIcon } from '../components/Icons';
import { SettingsSheet } from '../sheets/SettingsSheet';
import { PersonPickerSheet } from '../sheets/PersonPickerSheet';
import { PersonFormSheet } from '../sheets/PersonFormSheet';
import { EntrySheet, EntryCtx } from '../sheets/EntrySheet';
import { confirmSheet } from '../components/ConfirmSheet';
import { toast } from '../components/Toast';
import type { RootNav } from '../nav';

/* Payments tab: everything I gave at others' payatts (dir='out'). */
export function PaymentsScreen() {
  const nav = useNavigation<RootNav>();
  const { t, tp, lang, people, txns, removeTxn } = useData();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [q, setQ] = useState('');
  /* "Pay a payat" chain: picker → amount sheet (or new-person → amount sheet) */
  const [pickOpen, setPickOpen] = useState(false);
  const [newPersonOpen, setNewPersonOpen] = useState(false);
  const [entryCtx, setEntryCtx] = useState<EntryCtx | null>(null);

  const allPayments = filterPayments(txns, people, '');
  const recent = allPayments.slice(0, 5);
  const filtered = filterPayments(txns, people, q);

  const delTxn = async (id: number) => {
    if (!(await confirmSheet({ message: t('qDelEntry'), destructive: true }))) return;
    await removeTxn(id);
    toast(t('tDeleted'));
  };

  const paymentRow = (x: (typeof txns)[number], index: number, count: number, deletable: boolean) => {
    const p = people.find((pp) => pp.id === x.personId);
    if (!p) return null;
    return (
      <Row last={index === count - 1} onPress={() => nav.navigate('Person', { id: p.id })}>
        <Avatar name={p.name} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt w={700} size={16.5} color={C.green} num numberOfLines={1}>
            {tp('recentOut', { n: p.name, a: fmt(x.amount) })}
          </Txt>
          <Txt size={13.5} color={C.inkSoft} numberOfLines={1}>
            {dstr(x.date, lang)}
            {x.note ? ` · ${x.note}` : ''}
          </Txt>
        </View>
        {deletable ? (
          <Pressable
            onPress={() => delTxn(x.id)}
            accessibilityLabel="Delete"
            style={({ pressed }) => [st.mini, pressed && { backgroundColor: C.cotton }]}
          >
            <TrashIcon />
          </Pressable>
        ) : null}
      </Row>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.cotton }}>
      <KasavuHeader onGear={() => setSettingsOpen(true)} />
      <FlatList
        data={filtered}
        keyExtractor={(x) => String(x.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingTop: 16, paddingBottom: 96 }}
        ListHeaderComponent={
          <View>
            <Btn
              label={t('payBtn')}
              kind="gold"
              icon={<PayHandsIcon color={C.greenDeep} />}
              onPress={() => setPickOpen(true)}
              style={{ marginTop: 0 }}
            />
            <SecTitle>{t('recentPayments')}</SecTitle>
            <Card>
              {recent.length ? (
                recent.map((x, i) => <React.Fragment key={x.id}>{paymentRow(x, i, recent.length, false)}</React.Fragment>)
              ) : (
                <Empty title={t('emptyPayT')} desc={t('emptyPayD')} />
              )}
            </Card>
            <SecTitle>{t('allPayments')}</SecTitle>
            <View style={{ marginBottom: 10 }}>
              <SearchInput value={q} onChangeText={setQ} placeholder={t('searchPayments')} autoCorrect={false} />
            </View>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={listCardWrap(index, filtered.length)}>{paymentRow(item, index, filtered.length, true)}</View>
        )}
        ListEmptyComponent={
          <Card>
            {allPayments.length ? (
              <Empty desc={t('noMatch')} />
            ) : (
              <Empty title={t('emptyPayT')} desc={t('emptyPayD')} />
            )}
          </Card>
        }
      />
      <SettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
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

const st = StyleSheet.create({
  mini: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
