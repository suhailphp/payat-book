import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useData } from '../data';
import { dstr, eventTotal, fmt, monthBuckets, monthKey, monthTotals, today, topBalances, totals } from '../lib';
import { C, RADIUS, SHADOW } from '../theme';
import { KasavuHeader } from '../components/Header';
import { Avatar, BalChip, Btn, Card, Empty, Row, SecTitle, Txt } from '../components/UI';
import { HostIcon, PayHandsIcon, PeopleIcon, PlusIcon, SaveIcon } from '../components/Icons';
import { MonthChart } from '../components/MonthChart';
import { SettingsSheet } from '../sheets/SettingsSheet';
import { HostSheet } from '../sheets/HostSheet';
import { PersonPickerSheet } from '../sheets/PersonPickerSheet';
import { PersonFormSheet } from '../sheets/PersonFormSheet';
import { EntrySheet, EntryCtx } from '../sheets/EntrySheet';
import { exportBackup } from '../backup';
import { toast } from '../components/Toast';
import type { RootNav } from '../nav';

/* Book tab = the ledger dashboard: position, pending, recent, act fast. */
export function HomeScreen() {
  const nav = useNavigation<RootNav>();
  const { t, tp, lang, people, events, txns, meta, setMeta } = useData();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hostOpen, setHostOpen] = useState(false);
  const [addPersonOpen, setAddPersonOpen] = useState(false);
  /* pay chain */
  const [payPickOpen, setPayPickOpen] = useState(false);
  const [payNewPersonOpen, setPayNewPersonOpen] = useState(false);
  /* ongoing-payat collection chain */
  const [collectFor, setCollectFor] = useState<number | null>(null);
  const [collectNewFor, setCollectNewFor] = useState<number | null>(null);
  const [entryCtx, setEntryCtx] = useState<EntryCtx | null>(null);

  const pos = totals(people, txns);
  const hasData = txns.length > 0;
  const thisMonth = monthTotals(txns, monthKey(today()));
  const buckets = monthBuckets(txns, today(), 6);
  const top = topBalances(people, txns, 5);
  const ongoing = events
    .filter((e) => e.type === 'hosted' && e.status !== 'closed')
    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.id - a.id)[0];

  const needBackup =
    txns.length > 0 && (!meta.lastBackup || Date.now() - Number(meta.lastBackup) > 7 * 864e5);
  const recent = [...txns]
    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.id - a.id)
    .slice(0, 8);

  const backupNow = async () => {
    try {
      await exportBackup(people, events, txns);
      await setMeta('lastBackup', String(Date.now()));
      toast(t('tBackupSaved'));
    } catch (e) {
      toast(tp('backupFailed', { e: String((e as Error)?.message ?? e) }));
    }
  };

  const quickTile = (icon: React.ReactNode, label: string, onPress: () => void) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [st.tile, pressed && { backgroundColor: '#DCE9E0' }]}
      accessibilityLabel={label}
    >
      {icon}
      <Txt w={600} size={13.5} color={C.greenDeep} style={{ textAlign: 'center', marginTop: 6 }}>
        {label}
      </Txt>
    </Pressable>
  );

  const topList = (list: typeof top.receive) => (
    <Card>
      {list.map((r, i) => (
        <Row key={r.person.id} last={i === list.length - 1} onPress={() => nav.navigate('Person', { id: r.person.id })}>
          <Avatar name={r.person.name} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt w={600} size={16.5} numberOfLines={1}>
              {r.person.name}
            </Txt>
          </View>
          <BalChip b={r.b} settledLabel={t('settled')} />
        </Row>
      ))}
    </Card>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.cotton }}>
      <KasavuHeader onGear={() => setSettingsOpen(true)} />
      <ScrollView contentContainerStyle={st.main}>
        {/* 1 · greeting */}
        {meta.ownerName ? (
          <View style={{ marginBottom: 14 }}>
            <Txt w={700} size={22} color={C.greenDeep}>
              {tp('greeting', { n: meta.ownerName })}
            </Txt>
            <Txt size={13.5} color={C.inkSoft} num>
              {dstr(today(), lang)}
            </Txt>
          </View>
        ) : null}

        {/* 2 · the book spread (signature — unchanged) + net line */}
        <View style={st.spread}>
          <View style={st.page}>
            <Txt w={700} size={13} color={C.inkSoft} style={st.lbl}>
              {t('toReceive')}
            </Txt>
            <Txt w={700} size={29} color={C.green} num style={{ marginTop: 2 }}>
              {fmt(pos.recv)}
            </Txt>
            <Txt size={13} color={C.inkSoft} num>
              {pos.cr} {pos.cr === 1 ? t('ppl1') : t('ppl')}
            </Txt>
          </View>
          <View style={st.page}>
            <Txt w={700} size={13} color={C.inkSoft} style={st.lbl}>
              {t('toGive')}
            </Txt>
            <Txt w={700} size={29} color={C.red} num style={{ marginTop: 2 }}>
              {fmt(pos.give)}
            </Txt>
            <Txt size={13} color={C.inkSoft} num>
              {pos.cg} {pos.cg === 1 ? t('ppl1') : t('ppl')}
            </Txt>
          </View>
          <View style={st.spine} />
        </View>
        {hasData && pos.net !== 0 ? (
          <Txt
            w={600}
            size={13.5}
            color={pos.net > 0 ? C.greenDeep : C.red}
            num
            style={{ textAlign: 'center', marginTop: 8 }}
          >
            {pos.net > 0 ? tp('netReceive', { a: fmt(pos.net) }) : tp('netGive', { a: fmt(pos.net) })}
          </Txt>
        ) : null}

        {/* 3 · quick actions */}
        <SecTitle>{t('quickActions')}</SecTitle>
        <View style={st.tiles}>
          {quickTile(<HostIcon size={26} color={C.green} />, t('hostBtn'), () => setHostOpen(true))}
          {quickTile(<PayHandsIcon size={26} color={C.green} />, t('payBtn'), () => setPayPickOpen(true))}
          {quickTile(<PeopleIcon size={26} color={C.green} />, t('addPerson'), () => setAddPersonOpen(true))}
          {quickTile(<SaveIcon size={26} color={C.green} />, t('saveBackup'), backupNow)}
        </View>

        {/* 4 · ongoing payat */}
        {ongoing ? (
          <>
            <SecTitle>{t('ongoingPayat')}</SecTitle>
            <View style={st.ongoing}>
              <Pressable onPress={() => nav.navigate('Event', { id: ongoing.id })}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Avatar emoji="🏠" />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Txt w={700} size={17} numberOfLines={1}>
                      {ongoing.title}
                    </Txt>
                    <Txt size={13.5} color={C.inkSoft} num>
                      {tp('collected', {
                        c: `${txns.filter((x) => x.eventId === ongoing.id).length} ${
                          txns.filter((x) => x.eventId === ongoing.id).length === 1 ? t('ppl1') : t('ppl')
                        }`,
                      })}
                    </Txt>
                  </View>
                  <Txt w={700} size={22} color={C.green} num>
                    {fmt(eventTotal(txns, ongoing.id))}
                  </Txt>
                </View>
              </Pressable>
              <Btn label={t('addCollection')} icon={<PlusIcon />} onPress={() => setCollectFor(ongoing.id)} />
            </View>
          </>
        ) : null}

        {hasData ? (
          <>
            {/* 5 · this month */}
            <SecTitle>{t('thisMonth')}</SecTitle>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={[st.stat, { flex: 1 }]}>
                <Txt w={700} size={12.5} color={C.inkSoft} style={st.lbl}>
                  {t('statReceived')}
                </Txt>
                <Txt w={700} size={22} color={C.green} num>
                  {fmt(thisMonth.in)}
                </Txt>
              </View>
              <View style={[st.stat, { flex: 1 }]}>
                <Txt w={700} size={12.5} color={C.inkSoft} style={st.lbl}>
                  {t('statGiven')}
                </Txt>
                <Txt w={700} size={22} color={C.red} num>
                  {fmt(thisMonth.out)}
                </Txt>
              </View>
            </View>

            {/* 6 · last 6 months */}
            <SecTitle>{t('last6Months')}</SecTitle>
            <Card style={{ padding: 14 }}>
              <MonthChart buckets={buckets} lang={lang} receivedLabel={t('statReceived')} givenLabel={t('statGiven')} />
            </Card>

            {/* 7 · top balances */}
            {top.receive.length ? (
              <>
                <SecTitle>{t('topToReceive')}</SecTitle>
                {topList(top.receive)}
                {pos.cr > 5 ? (
                  <Btn label={t('showMore')} kind="ghost" onPress={() => nav.navigate('Tabs', { screen: 'PeopleTab' })} />
                ) : null}
              </>
            ) : null}
            {top.give.length ? (
              <>
                <SecTitle>{t('topToGive')}</SecTitle>
                {topList(top.give)}
                {pos.cg > 5 ? (
                  <Btn label={t('showMore')} kind="ghost" onPress={() => nav.navigate('Tabs', { screen: 'PeopleTab' })} />
                ) : null}
              </>
            ) : null}
          </>
        ) : null}

        {/* 9 · backup banner */}
        {needBackup ? (
          <View style={st.banner}>
            <Txt size={14.5}>📒 {t('keepSafe')} </Txt>
            <Pressable onPress={backupNow}>
              <Txt w={700} size={14.5} color={C.greenDeep} style={{ textDecorationLine: 'underline' }}>
                {t('backupNow')}
              </Txt>
            </Pressable>
          </View>
        ) : null}

        {/* 8 · recent entries */}
        <SecTitle>{t('recent')}</SecTitle>
        <Card>
          {recent.length ? (
            recent.map((x, i) => {
              const p = people.find((pp) => pp.id === x.personId);
              if (!p) return null;
              const ev = events.find((e) => e.id === x.eventId);
              return (
                <Row key={x.id} last={i === recent.length - 1} onPress={() => nav.navigate('Person', { id: p.id })}>
                  <Avatar name={p.name} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Txt w={700} size={16.5} color={x.dir === 'in' ? C.red : C.green} num numberOfLines={1}>
                      {x.dir === 'in'
                        ? tp('recentIn', { n: p.name, a: fmt(x.amount) })
                        : tp('recentOut', { n: p.name, a: fmt(x.amount) })}
                    </Txt>
                    <Txt size={13.5} color={C.inkSoft} numberOfLines={1}>
                      {dstr(x.date, lang)}
                      {ev ? ` · ${ev.title}` : ''}
                      {x.note ? ` · ${x.note}` : ''}
                    </Txt>
                  </View>
                </Row>
              );
            })
          ) : (
            <Empty title={t('emptyBookT')} desc={t('emptyBookD')} />
          )}
        </Card>
      </ScrollView>

      <SettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <HostSheet visible={hostOpen} onClose={() => setHostOpen(false)} onCreated={(id) => nav.navigate('Event', { id })} />
      <PersonFormSheet visible={addPersonOpen} onClose={() => setAddPersonOpen(false)} />
      {/* pay chain */}
      <PersonPickerSheet
        visible={payPickOpen}
        title={t('whoPay')}
        onClose={() => setPayPickOpen(false)}
        onPick={(id) => {
          setPayPickOpen(false);
          setEntryCtx({ personId: id, dir: 'out' });
        }}
        onNew={() => {
          setPayPickOpen(false);
          setPayNewPersonOpen(true);
        }}
      />
      <PersonFormSheet
        visible={payNewPersonOpen}
        onClose={() => setPayNewPersonOpen(false)}
        quiet
        onSaved={(id) => setEntryCtx({ personId: id, dir: 'out' })}
      />
      {/* ongoing-payat collection chain */}
      <PersonPickerSheet
        visible={collectFor !== null}
        title={t('whoGave')}
        onClose={() => setCollectFor(null)}
        onPick={(id) => {
          const eid = collectFor!;
          setCollectFor(null);
          setEntryCtx({ personId: id, dir: 'in', eventId: eid });
        }}
        onNew={() => {
          setCollectNewFor(collectFor);
          setCollectFor(null);
        }}
      />
      <PersonFormSheet
        visible={collectNewFor !== null}
        onClose={() => setCollectNewFor(null)}
        quiet
        onSaved={(id) => {
          const eid = collectNewFor!;
          setCollectNewFor(null);
          setEntryCtx({ personId: id, dir: 'in', eventId: eid });
        }}
      />
      <EntrySheet ctx={entryCtx} onClose={() => setEntryCtx(null)} />
    </View>
  );
}

const st = StyleSheet.create({
  main: { padding: 16, paddingTop: 22, paddingBottom: 96 },
  spread: {
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: RADIUS,
    flexDirection: 'row',
    overflow: 'hidden',
    position: 'relative',
    ...SHADOW,
  },
  page: { flex: 1, paddingVertical: 18, paddingHorizontal: 12, alignItems: 'center' },
  lbl: { letterSpacing: 0.8, textTransform: 'uppercase' },
  spine: {
    position: 'absolute',
    left: '50%',
    marginLeft: -2,
    top: 10,
    bottom: 10,
    width: 4,
    backgroundColor: C.gold,
    opacity: 0.85,
  },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    width: '48%',
    flexGrow: 1,
    minHeight: 88,
    backgroundColor: C.greenTint,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  ongoing: {
    backgroundColor: C.paper,
    borderWidth: 1.5,
    borderColor: C.gold,
    borderRadius: RADIUS,
    padding: 16,
    ...SHADOW,
  },
  stat: {
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: RADIUS,
    paddingVertical: 12,
    paddingHorizontal: 14,
    ...SHADOW,
  },
  banner: {
    marginTop: 14,
    backgroundColor: C.goldSoft,
    borderWidth: 1,
    borderColor: C.gold,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
});
