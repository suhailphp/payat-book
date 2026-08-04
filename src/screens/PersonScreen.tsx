import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useData } from '../data';
import { bal, dstr, fmt, Txn } from '../lib';
import { C, RADIUS, SHADOW } from '../theme';
import { KasavuHeader } from '../components/Header';
import { Btn, Empty, Row, SecTitle, Txt } from '../components/UI';
import { SearchableList } from '../components/SearchableList';
import { EditIcon, WaIcon } from '../components/Icons';
import { PersonFormSheet } from '../sheets/PersonFormSheet';
import { EntrySheet, EntryCtx } from '../sheets/EntrySheet';
import { SettingsSheet } from '../sheets/SettingsSheet';
import { shareOnWhatsApp } from '../share';
import type { RootNav, RootParams } from '../nav';

type HistItem = Txn & { evTitle: string };

export function PersonScreen() {
  const nav = useNavigation<RootNav>();
  const route = useRoute<RouteProp<RootParams, 'Person'>>();
  const pid = route.params.id;
  const { t, tp, lang, people, events, txns, meta } = useData();
  const [editOpen, setEditOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [entryCtx, setEntryCtx] = useState<EntryCtx | null>(null);

  const p = people.find((x) => x.id === pid);

  useEffect(() => {
    if (!p) nav.goBack();
  }, [p, nav]);
  if (!p) return null;

  const b = bal(txns, pid);
  const state = b > 0 ? tp('shouldGiveYou', { n: p.name }) : b < 0 ? tp('youShouldGive', { n: p.name }) : t('allSettled');
  const hist: HistItem[] = txns
    .filter((x) => x.personId === pid)
    .sort((a, b2) => (b2.date || '').localeCompare(a.date || '') || b2.id - a.id)
    .map((x) => ({ ...x, evTitle: events.find((e) => e.id === x.eventId)?.title ?? '' }));

  return (
    <View style={{ flex: 1, backgroundColor: C.cotton }}>
      <KasavuHeader
        onBack={() => nav.goBack()}
        onGear={() => setSettingsOpen(true)}
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
      <SearchableList
        data={hist}
        keyOf={(x) => String(x.id)}
        searchKeys={['note', 'evTitle']}
        placeholder={t('searchName')}
        contentContainerStyle={{ padding: 16, paddingTop: 22, paddingBottom: 96 }}
        empty={<Empty title={t('emptyHistT')} desc={tp('emptyHistD', { n: p.name })} />}
        header={
          <View>
            <View style={st.balcard}>
              <Txt w={700} size={20} style={{ textAlign: 'center' }}>
                {p.name}
              </Txt>
              {p.phone ? (
                <Txt size={14} color={C.inkSoft} num style={{ textAlign: 'center' }}>
                  {p.phone}
                </Txt>
              ) : null}
              {p.ref ? (
                <Txt size={13} color={C.inkSoft} style={{ textAlign: 'center' }}>
                  {p.ref}
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
              <Btn
                label={t('shareWA')}
                kind="wa"
                icon={<WaIcon />}
                onPress={() => shareOnWhatsApp(p, txns, lang, meta.ownerName)}
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Btn flex label={t('theyGave')} kind="ghost" onPress={() => setEntryCtx({ personId: pid, dir: 'in' })} />
                <Btn flex label={t('iGave')} kind="ghost" onPress={() => setEntryCtx({ personId: pid, dir: 'out' })} />
              </View>
            </View>
            <SecTitle>{t('history')}</SecTitle>
          </View>
        }
        renderRow={(x, index, count) => (
          <Row
            last={index === count - 1}
            onPress={() => setEntryCtx({ personId: x.personId, dir: x.dir, eventId: x.eventId ?? undefined, txn: x })}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt w={700} size={16.5} color={x.dir === 'in' ? C.red : C.green} num>
                {x.dir === 'in' ? tp('ReceivedCap', { a: fmt(x.amount) }) : tp('GaveCap', { a: fmt(x.amount) })}
              </Txt>
              <Txt size={13.5} color={C.inkSoft} numberOfLines={1} style={{ marginTop: 1 }}>
                {dstr(x.date, lang)}
                {x.evTitle ? ` · ${x.evTitle}` : ''}
                {x.note ? ` · ${x.note}` : ''}
              </Txt>
            </View>
          </Row>
        )}
      />
      <PersonFormSheet visible={editOpen} onClose={() => setEditOpen(false)} person={p} onDeleted={() => nav.goBack()} />
      <SettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
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
});
