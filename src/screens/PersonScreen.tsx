import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useData } from '../data';
import { bal, dstr, fmt } from '../lib';
import { C, RADIUS, SHADOW } from '../theme';
import { KasavuHeader } from '../components/Header';
import { Btn, Card, Empty, Row, SecTitle, Txt } from '../components/UI';
import { EditIcon, TrashIcon, WaIcon } from '../components/Icons';
import { PersonFormSheet } from '../sheets/PersonFormSheet';
import { EntrySheet, EntryCtx } from '../sheets/EntrySheet';
import { confirm } from '../components/confirm';
import { toast } from '../components/Toast';
import { shareOnWhatsApp } from '../share';
import type { RootNav, RootParams } from '../nav';

export function PersonScreen() {
  const nav = useNavigation<RootNav>();
  const route = useRoute<RouteProp<RootParams, 'Person'>>();
  const pid = route.params.id;
  const { t, tp, lang, people, events, txns, removeTxn } = useData();
  const [editOpen, setEditOpen] = useState(false);
  const [entryCtx, setEntryCtx] = useState<EntryCtx | null>(null);

  const p = people.find((x) => x.id === pid);

  useEffect(() => {
    if (!p) nav.goBack();
  }, [p, nav]);
  if (!p) return null;

  const b = bal(txns, pid);
  const state = b > 0 ? tp('shouldGiveYou', { n: p.name }) : b < 0 ? tp('youShouldGive', { n: p.name }) : t('allSettled');
  const hist = txns
    .filter((x) => x.personId === pid)
    .sort((a, b2) => (b2.date || '').localeCompare(a.date || '') || b2.id - a.id);

  const delTxn = (id: number) =>
    confirm(t('qDelEntry'), async () => {
      await removeTxn(id);
      toast(t('tDeleted'));
    });

  return (
    <View style={{ flex: 1, backgroundColor: C.cotton }}>
      <KasavuHeader
        onBack={() => nav.goBack()}
        actions={
          <Pressable
            onPress={() => setEditOpen(true)}
            accessibilityLabel="Edit"
            style={({ pressed }) => [st.hbtn, pressed && { backgroundColor: C.cotton }]}
          >
            <EditIcon />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 22, paddingBottom: 96 }}>
        <View style={st.balcard}>
          <Txt w={700} size={20} style={{ textAlign: 'center' }}>
            {p.name}
          </Txt>
          {p.phone ? (
            <Txt size={14} color={C.inkSoft} num style={{ textAlign: 'center' }}>
              {p.phone}
            </Txt>
          ) : null}
          <Txt size={14.5} color={C.inkSoft} style={{ textAlign: 'center' }}>
            {state}
          </Txt>
          <Txt
            w={700}
            size={35}
            num
            color={b > 0 ? C.green : b < 0 ? C.red : C.ink}
            style={{ textAlign: 'center', marginTop: 6 }}
          >
            {fmt(b)}
          </Txt>
          <Btn label={t('shareWA')} kind="wa" icon={<WaIcon />} onPress={() => shareOnWhatsApp(p, txns, lang)} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Btn flex label={t('theyGave')} kind="ghost" onPress={() => setEntryCtx({ personId: pid, dir: 'in' })} />
            <Btn flex label={t('iGave')} kind="ghost" onPress={() => setEntryCtx({ personId: pid, dir: 'out' })} />
          </View>
        </View>

        <SecTitle>{t('history')}</SecTitle>
        <Card>
          {hist.length ? (
            hist.map((x, i) => {
              const ev = events.find((e) => e.id === x.eventId);
              return (
                <Row key={x.id} last={i === hist.length - 1}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Txt w={700} size={16.5} color={x.dir === 'in' ? C.red : C.green} num>
                      {x.dir === 'in' ? tp('ReceivedCap', { a: fmt(x.amount) }) : tp('GaveCap', { a: fmt(x.amount) })}
                    </Txt>
                    <Txt size={13.5} color={C.inkSoft} numberOfLines={1} style={{ marginTop: 1 }}>
                      {dstr(x.date, lang)}
                      {ev ? ` · ${ev.title}` : ''}
                      {x.note ? ` · ${x.note}` : ''}
                    </Txt>
                  </View>
                  <Pressable
                    onPress={() => delTxn(x.id)}
                    accessibilityLabel="Delete"
                    style={({ pressed }) => [st.mini, pressed && { backgroundColor: C.cotton }]}
                  >
                    <TrashIcon />
                  </Pressable>
                </Row>
              );
            })
          ) : (
            <Empty title={t('emptyHistT')} desc={tp('emptyHistD', { n: p.name })} />
          )}
        </Card>
      </ScrollView>
      <PersonFormSheet
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        person={p}
        onDeleted={() => nav.goBack()}
      />
      <EntrySheet ctx={entryCtx} onClose={() => setEntryCtx(null)} />
    </View>
  );
}

const st = StyleSheet.create({
  hbtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  balcard: {
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: RADIUS,
    padding: 20,
    ...SHADOW,
  },
  mini: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
