import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useData } from '../data';
import { dstr, filterPayments, fmt, Txn } from '../lib';
import { C } from '../theme';
import { KasavuHeader } from '../components/Header';
import { Avatar, Btn, Card, Empty, Row, SecTitle, Txt } from '../components/UI';
import { SearchableList } from '../components/SearchableList';
import { PayHandsIcon, TrashIcon } from '../components/Icons';
import { SettingsSheet } from '../sheets/SettingsSheet';
import { PersonPickerSheet } from '../sheets/PersonPickerSheet';
import { PersonFormSheet } from '../sheets/PersonFormSheet';
import { EntrySheet, EntryCtx } from '../sheets/EntrySheet';
import { confirmSheet } from '../components/ConfirmSheet';
import { toast } from '../components/Toast';
import type { RootNav } from '../nav';

type PaymentItem = Txn & { name: string };

/* Payments tab: everything I gave at others' payatts (dir='out'). */
export function PaymentsScreen() {
  const nav = useNavigation<RootNav>();
  const { t, tp, lang, people, txns, removeTxn } = useData();
  const [settingsOpen, setSettingsOpen] = useState(false);
  /* "Pay a payat" chain: picker → amount sheet (or new-person → amount sheet) */
  const [pickOpen, setPickOpen] = useState(false);
  const [newPersonOpen, setNewPersonOpen] = useState(false);
  const [entryCtx, setEntryCtx] = useState<EntryCtx | null>(null);

  const nameOf = new Map(people.map((p) => [p.id, p.name]));
  const allPayments: PaymentItem[] = filterPayments(txns, people, '').map((x) => ({
    ...x,
    name: nameOf.get(x.personId) ?? '',
  }));
  const recent = allPayments.slice(0, 5);

  const delTxn = async (id: number) => {
    if (!(await confirmSheet({ message: t('qDelEntry'), destructive: true }))) return;
    await removeTxn(id);
    toast(t('tDeleted'));
  };

  const paymentRow = (x: PaymentItem, index: number, count: number, deletable: boolean) => (
    <Row last={index === count - 1} onPress={() => nav.navigate('Person', { id: x.personId })}>
      <Avatar name={x.name || '?'} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt w={700} size={16.5} color={C.green} num numberOfLines={1}>
          {tp('recentOut', { n: x.name, a: fmt(x.amount) })}
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

  return (
    <View style={{ flex: 1, backgroundColor: C.cotton }}>
      <KasavuHeader onGear={() => setSettingsOpen(true)} />
      <SearchableList
        data={allPayments}
        keyOf={(x) => String(x.id)}
        searchKeys={['name', 'note']}
        placeholder={t('searchPayments')}
        contentContainerStyle={{ padding: 16, paddingTop: 16, paddingBottom: 96 }}
        empty={<Empty title={t('emptyPayT')} desc={t('emptyPayD')} />}
        header={
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
                recent.map((x, i) => (
                  <React.Fragment key={x.id}>{paymentRow(x, i, recent.length, false)}</React.Fragment>
                ))
              ) : (
                <Empty title={t('emptyPayT')} desc={t('emptyPayD')} />
              )}
            </Card>
            <SecTitle>{t('allPayments')}</SecTitle>
          </View>
        }
        renderRow={(item, index, count) => paymentRow(item, index, count, true)}
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
