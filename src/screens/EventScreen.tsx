import React, { useEffect, useState } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useData } from '../data';
import { bal, dstr, eventTotal, fmt, pageSlice, Person, searchFilter, Txn } from '../lib';
import { C, RADIUS, SHADOW } from '../theme';
import { KasavuHeader } from '../components/Header';
import { Avatar, BalChip, Btn, Card, Empty, listCardWrap, MiniAddBtn, Row, SearchInput, SecTitle, StatusChip, Txt } from '../components/UI';
import { PlusIcon, TrashIcon } from '../components/Icons';
import { PersonPickerSheet } from '../sheets/PersonPickerSheet';
import { PersonFormSheet } from '../sheets/PersonFormSheet';
import { EntrySheet, EntryCtx } from '../sheets/EntrySheet';
import { SettingsSheet } from '../sheets/SettingsSheet';
import { confirmSheet } from '../components/ConfirmSheet';
import { toast } from '../components/Toast';
import type { RootNav, RootParams } from '../nav';

type PaidItem = Txn & { name: string };
type SectionItem = Person | PaidItem;
const INITIAL_LIMIT = 10;
const PAGE_SIZE = 25;

/* Hosting screen: collections for one payat, pending-balance list,
   finish/reopen, late payments after finishing. Both sections use the
   shared search + pagination helpers (search appears past 10 rows). */
export function EventScreen() {
  const nav = useNavigation<RootNav>();
  const route = useRoute<RouteProp<RootParams, 'Event'>>();
  const eid = route.params.id;
  const { t, tp, lang, people, events, txns, setEventStatus, removeEvent, removeTxn } = useData();
  const [pickOpen, setPickOpen] = useState(false);
  const [newPersonOpen, setNewPersonOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [entryCtx, setEntryCtx] = useState<EntryCtx | null>(null);
  const [pendingQ, setPendingQ] = useState('');
  const [paidQ, setPaidQ] = useState('');
  const [shownPending, setShownPending] = useState(INITIAL_LIMIT);
  const [shownPaid, setShownPaid] = useState(INITIAL_LIMIT);

  useEffect(() => setShownPending(INITIAL_LIMIT), [pendingQ]);
  useEffect(() => setShownPaid(INITIAL_LIMIT), [paidQ]);

  const e = events.find((x) => x.id === eid);
  useEffect(() => {
    if (!e) nav.goBack();
  }, [e, nav]);
  if (!e) return null;

  const nameOf = new Map(people.map((p) => [p.id, p.name]));
  const allPaid: PaidItem[] = txns
    .filter((x) => x.eventId === eid)
    .sort((a, b) => b.id - a.id)
    .map((x) => ({ ...x, name: nameOf.get(x.personId) ?? '' }));
  const total = eventTotal(txns, eid);
  const open = e.status !== 'closed';
  const addLabel = open ? t('addCollection') : t('addLate');
  const paidIds = new Set(allPaid.map((x) => x.personId));
  const allPending = people
    .filter((p) => bal(txns, p.id) > 0 && !paidIds.has(p.id))
    .sort((a, b) => bal(txns, b.id) - bal(txns, a.id));

  const pendingPage = pageSlice(searchFilter(allPending, pendingQ, ['name']), shownPending);
  const paidPage = pageSlice(searchFilter(allPaid, paidQ, ['name', 'note']), shownPaid);

  const toggleStatus = async () => {
    await setEventStatus(eid, open ? 'closed' : 'open');
    toast(open ? t('tFinished') : t('tReopened'));
  };

  const delEvent = async () => {
    if (!(await confirmSheet({ message: t('qDelPayat'), destructive: true }))) return;
    await removeEvent(eid);
    toast(t('tDeleted'));
  };

  const delTxn = async (id: number) => {
    if (!(await confirmSheet({ message: t('qDelEntry'), destructive: true }))) return;
    await removeTxn(id);
    toast(t('tDeleted'));
  };

  const sections = [
    { key: 'pending' as const, title: t('pendingSec'), data: pendingPage.rows as SectionItem[], hasMore: pendingPage.hasMore },
    { key: 'paid' as const, title: t('paidSec'), data: paidPage.rows as SectionItem[], hasMore: paidPage.hasMore },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.cotton }}>
      <KasavuHeader
        onBack={() => nav.goBack()}
        onGear={() => setSettingsOpen(true)}
        actions={
          <Pressable
            onPress={delEvent}
            accessibilityLabel="Delete"
            style={({ pressed }) => [st.hbtn, pressed && { backgroundColor: C.cotton }]}
          >
            <TrashIcon size={24} color={C.greenDeep} />
          </Pressable>
        }
      />
      <SectionList
        sections={sections}
        keyExtractor={(item) => `${'personId' in item ? 'x' : 'p'}${item.id}`}
        keyboardShouldPersistTaps="handled"
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ padding: 16, paddingTop: 22, paddingBottom: 96 }}
        ListHeaderComponent={
          <View style={st.balcard}>
            <Txt w={700} size={20} style={{ textAlign: 'center' }}>
              {e.title}
            </Txt>
            <Txt size={14.5} color={C.inkSoft} style={{ textAlign: 'center' }}>
              {dstr(e.date, lang)} · {t('youHosted')}
            </Txt>
            <Txt w={700} size={35} num color={C.green} style={{ textAlign: 'center', marginTop: 6 }}>
              {fmt(total)}
            </Txt>
            <Txt size={14.5} color={C.inkSoft} num style={{ textAlign: 'center' }}>
              {tp('collected', { c: `${allPaid.length} ${allPaid.length === 1 ? t('ppl1') : t('ppl')}` })}
            </Txt>
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 6 }}>
              <StatusChip kind={open ? 'gold' : 'zero'} label={open ? t('stOpen') : t('stFinished')} />
            </View>
            <Btn label={addLabel} icon={<PlusIcon />} onPress={() => setPickOpen(true)} />
            <Btn label={open ? t('finish') : t('reopen')} kind="ghost" onPress={toggleStatus} />
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View>
            <SecTitle>{section.title}</SecTitle>
            {(section.key === 'pending' ? allPending : allPaid).length > INITIAL_LIMIT ? (
              <View style={{ marginBottom: 10 }}>
                <SearchInput
                  value={section.key === 'pending' ? pendingQ : paidQ}
                  onChangeText={section.key === 'pending' ? setPendingQ : setPaidQ}
                  placeholder={section.key === 'pending' ? t('searchPeople') : t('searchName')}
                  autoCorrect={false}
                />
              </View>
            ) : null}
          </View>
        )}
        renderSectionFooter={({ section }) => (
          <View>
            {section.data.length === 0 ? (
              <Card>
                {section.key === 'pending' ? (
                  <Empty desc={allPending.length ? t('noMatch') : t('emptyPendD')} />
                ) : allPaid.length ? (
                  <Empty desc={t('noMatch')} />
                ) : (
                  <Empty title={t('emptyEvT')} desc={tp('emptyEvD', { b: addLabel })} />
                )}
              </Card>
            ) : null}
            {section.hasMore ? (
              <Btn
                label={t('showMore')}
                kind="ghost"
                onPress={() =>
                  section.key === 'pending'
                    ? setShownPending((s) => s + PAGE_SIZE)
                    : setShownPaid((s) => s + PAGE_SIZE)
                }
              />
            ) : null}
          </View>
        )}
        renderItem={({ item, index, section }) => {
          if (section.key === 'pending') {
            const p = item as Person;
            return (
              <View style={listCardWrap(index, section.data.length)}>
                <Row last={index === section.data.length - 1}>
                  <Avatar name={p.name} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Txt w={600} size={16.5} numberOfLines={1}>
                      {p.name}
                    </Txt>
                    <View style={{ flexDirection: 'row', marginTop: 2 }}>
                      <BalChip b={bal(txns, p.id)} settledLabel={t('settled')} />
                    </View>
                  </View>
                  <MiniAddBtn
                    label={t('addCollection')}
                    onPress={() => setEntryCtx({ personId: p.id, dir: 'in', eventId: eid })}
                  />
                </Row>
              </View>
            );
          }
          const x = item as PaidItem;
          return (
            <View style={listCardWrap(index, section.data.length)}>
              <Row last={index === section.data.length - 1}>
                <Avatar name={x.name || '?'} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt w={600} size={16.5} numberOfLines={1}>
                    {x.name}
                  </Txt>
                  <Txt size={13.5} color={C.inkSoft} numberOfLines={1}>
                    {dstr(x.date, lang)}
                    {x.note ? ` · ${x.note}` : ''}
                  </Txt>
                </View>
                <Txt w={700} size={16} num>
                  {fmt(x.amount)}
                </Txt>
                <Pressable
                  onPress={() => delTxn(x.id)}
                  accessibilityLabel="Delete"
                  style={({ pressed }) => [st.mini, pressed && { backgroundColor: C.cotton }]}
                >
                  <TrashIcon />
                </Pressable>
              </Row>
            </View>
          );
        }}
      />

      <PersonPickerSheet
        visible={pickOpen}
        title={t('whoGave')}
        onClose={() => setPickOpen(false)}
        onPick={(id) => {
          setPickOpen(false);
          setEntryCtx({ personId: id, dir: 'in', eventId: eid });
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
        onSaved={(id) => setEntryCtx({ personId: id, dir: 'in', eventId: eid })}
      />
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
  mini: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
