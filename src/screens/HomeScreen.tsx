import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useData } from '../data';
import {
  bubbleItems,
  dayCountLabel,
  daysSince,
  DEFAULT_ATTENDANCE,
  dstr,
  eventTotal,
  fmt,
  hostForecast,
  monthBuckets,
  monthKey,
  monthTotals,
  pendingInvitations,
  today,
  topBalances,
  totals,
  waitingLongest,
} from '../lib';
import { C, RADIUS, SHADOW } from '../theme';
import { KasavuHeader } from '../components/Header';
import { Avatar, BalChip, Btn, Card, Empty, Row, SecTitle, Txt } from '../components/UI';
import { InvitationChip } from '../components/InvitationChip';
import { AddInvitationFlow } from '../components/AddInvitationFlow';
import { PlusIcon } from '../components/Icons';
import { MonthChart } from '../components/MonthChart';
import { BalanceBubbles } from '../components/BalanceBubbles';
import { ForecastCard } from '../components/ForecastCard';
import { ForecastSheet } from '../sheets/ForecastSheet';
import { CountUp, StaggerIn } from '../components/anim';
import { SettingsSheet } from '../sheets/SettingsSheet';
import { PersonPickerSheet } from '../sheets/PersonPickerSheet';
import { PersonFormSheet } from '../sheets/PersonFormSheet';
import { EntrySheet, EntryCtx } from '../sheets/EntrySheet';
import { exportBackup } from '../backup';
import { toast } from '../components/Toast';
import type { RootNav } from '../nav';

/* Book tab = the ledger dashboard: position, pending, recent, act fast. */
export function HomeScreen() {
  const nav = useNavigation<RootNav>();
  const { t, tp, lang, people, events, txns, invitations, meta, setMeta } = useData();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [invFlowOpen, setInvFlowOpen] = useState(false);
  const [forecastOpen, setForecastOpen] = useState(false);
  /* ongoing-payat collection chain */
  const [collectFor, setCollectFor] = useState<number | null>(null);
  const [collectNewFor, setCollectNewFor] = useState<number | null>(null);
  const [entryCtx, setEntryCtx] = useState<EntryCtx | null>(null);

  /* attendance rate for the host forecast, seeded from meta, persisted debounced */
  const [attendance, setAttendance] = useState(() => {
    const a = Number(meta.attendanceRate);
    return a >= 0.1 && a <= 1 ? a : DEFAULT_ATTENDANCE;
  });
  const attTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const changeAttendance = (a: number) => {
    setAttendance(a);
    if (attTimer.current) clearTimeout(attTimer.current);
    attTimer.current = setTimeout(() => setMeta('attendanceRate', String(a)), 500);
  };

  const pos = totals(people, txns);
  const forecast = hostForecast(people, txns, attendance);
  const hasData = txns.length > 0;
  const thisMonth = monthTotals(txns, monthKey(today()));
  const buckets = monthBuckets(txns, today(), 6);
  const top = topBalances(people, txns, 5);
  const bubbles = bubbleItems(people, txns, 8);
  const waiting = waitingLongest(people, txns, 3);
  const pendingInvs = pendingInvitations(invitations);
  const invTop5 = pendingInvs.slice(0, 5);
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
      await exportBackup(people, events, txns, invitations);
      await setMeta('lastBackup', String(Date.now()));
      toast(t('tBackupSaved'));
    } catch (e) {
      toast(tp('backupFailed', { e: String((e as Error)?.message ?? e) }));
    }
  };

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

  /* stagger index across the conditionally-rendered dashboard blocks */
  let ai = 0;

  return (
    <View style={{ flex: 1, backgroundColor: C.cotton }}>
      <KasavuHeader onGear={() => setSettingsOpen(true)} />
      <ScrollView contentContainerStyle={st.main}>
        {/* 1 · greeting */}
        {meta.ownerName ? (
          <StaggerIn index={ai++} style={{ marginBottom: 14 }}>
            <Txt w={700} size={22} color={C.greenDeep}>
              {tp('greeting', { n: meta.ownerName })}
            </Txt>
            <Txt size={13.5} color={C.inkSoft} num>
              {dstr(today(), lang)}
            </Txt>
          </StaggerIn>
        ) : null}

        {/* 2 · the book spread (signature — unchanged) + net line */}
        <StaggerIn index={ai++}>
        <View style={st.spread}>
          <View style={st.page}>
            <Txt w={700} size={13} color={C.inkSoft} style={st.lbl}>
              {t('toReceive')}
            </Txt>
            <CountUp value={pos.recv} format={fmt} w={700} size={29} color={C.green} style={{ marginTop: 2 }} />
            <Txt size={13} color={C.inkSoft} num>
              {pos.cr} {pos.cr === 1 ? t('ppl1') : t('ppl')}
            </Txt>
          </View>
          <View style={st.page}>
            <Txt w={700} size={13} color={C.inkSoft} style={st.lbl}>
              {t('toGive')}
            </Txt>
            <CountUp value={pos.give} format={fmt} w={700} size={29} color={C.red} style={{ marginTop: 2 }} />
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
        </StaggerIn>

        {/* 3 · invitations: header always shows with a compact add button;
            the list (top 5, overdue first) only when any are pending */}
        <StaggerIn index={ai++}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <SecTitle>{t('invitations')}</SecTitle>
            <Pressable
              onPress={() => setInvFlowOpen(true)}
              hitSlop={12}
              accessibilityLabel={t('addInvitation')}
              style={({ pressed }) => [
                { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, marginBottom: 6 },
                pressed && { backgroundColor: C.greenTint },
              ]}
            >
              <Txt w={700} size={13.5} color={C.greenDeep}>
                ＋ {t('addInvitation')}
              </Txt>
            </Pressable>
          </View>
          {invTop5.length ? (
            <Card>
              {invTop5.map((inv, i) => {
                const host = people.find((p) => p.id === inv.hostId);
                return (
                  <Row
                    key={inv.id}
                    last={i === invTop5.length - 1}
                    onPress={() => nav.navigate('Tabs', { screen: 'PaymentsTab' })}
                  >
                    <Avatar name={host?.name || '?'} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Txt w={600} size={16.5} numberOfLines={1}>
                        {host?.name ?? ''}
                      </Txt>
                      <Txt size={13.5} color={C.inkSoft} numberOfLines={1}>
                        {dstr(inv.date, lang)}
                        {inv.note ? ` · ${inv.note}` : ''}
                      </Txt>
                    </View>
                    <InvitationChip date={inv.date} />
                  </Row>
                );
              })}
            </Card>
          ) : null}
          {pendingInvs.length > 5 ? (
            <Btn label={t('showMore')} kind="ghost" onPress={() => nav.navigate('Tabs', { screen: 'PaymentsTab' })} />
          ) : null}
        </StaggerIn>

        {/* 3a · "if I host now" forecast — above the bubbles, only when someone owes */}
        {forecast.peopleCount > 0 ? (
          <StaggerIn index={ai++}>
            <ForecastCard
              forecast={forecast}
              attendance={attendance}
              onAttendance={changeAttendance}
              onPress={() => setForecastOpen(true)}
            />
          </StaggerIn>
        ) : null}

        {/* 3b · balance bubbles — the centerpiece */}
        {bubbles.length ? (
          <StaggerIn index={ai++}>
            <SecTitle>{t('bubblesTitle')}</SecTitle>
            <BalanceBubbles items={bubbles} onPressPerson={(id) => nav.navigate('Person', { id })} />
          </StaggerIn>
        ) : null}

        {/* 3b · waiting longest */}
        {waiting.length ? (
          <StaggerIn index={ai++}>
            <SecTitle>{t('pendingLong')}</SecTitle>
            <Card>
              {waiting.map((r, i) => (
                <Row
                  key={r.person.id}
                  last={i === waiting.length - 1}
                  onPress={() => nav.navigate('Person', { id: r.person.id })}
                >
                  <Avatar name={r.person.name} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Txt w={600} size={16.5} numberOfLines={1}>
                      {r.person.name}
                    </Txt>
                    <Txt size={13.5} color={C.inkSoft} num>
                      {dayCountLabel(daysSince(r.lastDate, today()), 'daysAgo1', 'daysAgo', t, tp)}
                    </Txt>
                  </View>
                  <BalChip b={r.b} settledLabel={t('settled')} />
                </Row>
              ))}
            </Card>
          </StaggerIn>
        ) : null}

        {/* 4 · ongoing payat */}
        {ongoing ? (
          <StaggerIn index={ai++}>
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
          </StaggerIn>
        ) : null}

        {hasData ? (
          <>
            {/* 5 · this month */}
            <StaggerIn index={ai++}>
              <SecTitle>{t('thisMonth')}</SecTitle>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={[st.stat, { flex: 1 }]}>
                  <Txt w={700} size={12.5} color={C.inkSoft} style={st.lbl}>
                    {t('statReceived')}
                  </Txt>
                  <CountUp value={thisMonth.in} format={fmt} w={700} size={22} color={C.green} />
                </View>
                <View style={[st.stat, { flex: 1 }]}>
                  <Txt w={700} size={12.5} color={C.inkSoft} style={st.lbl}>
                    {t('statGiven')}
                  </Txt>
                  <CountUp value={thisMonth.out} format={fmt} w={700} size={22} color={C.red} />
                </View>
              </View>
            </StaggerIn>

            {/* 6 · last 6 months */}
            <StaggerIn index={ai++}>
              <SecTitle>{t('last6Months')}</SecTitle>
              <Card style={{ padding: 14 }}>
                <MonthChart buckets={buckets} lang={lang} receivedLabel={t('statReceived')} givenLabel={t('statGiven')} />
              </Card>
            </StaggerIn>

            {/* 7 · top balances */}
            {top.receive.length ? (
              <StaggerIn index={ai++}>
                <SecTitle>{t('topToReceive')}</SecTitle>
                {topList(top.receive)}
                {pos.cr > 5 ? (
                  <Btn label={t('showMore')} kind="ghost" onPress={() => nav.navigate('Tabs', { screen: 'PeopleTab' })} />
                ) : null}
              </StaggerIn>
            ) : null}
            {top.give.length ? (
              <StaggerIn index={ai++}>
                <SecTitle>{t('topToGive')}</SecTitle>
                {topList(top.give)}
                {pos.cg > 5 ? (
                  <Btn label={t('showMore')} kind="ghost" onPress={() => nav.navigate('Tabs', { screen: 'PeopleTab' })} />
                ) : null}
              </StaggerIn>
            ) : null}
          </>
        ) : null}

        {/* 9 · backup banner */}
        {needBackup ? (
          <StaggerIn index={ai++}>
          <View style={st.banner}>
            <Txt size={14.5}>📒 {t('keepSafe')} </Txt>
            <Pressable onPress={backupNow}>
              <Txt w={700} size={14.5} color={C.greenDeep} style={{ textDecorationLine: 'underline' }}>
                {t('backupNow')}
              </Txt>
            </Pressable>
          </View>
          </StaggerIn>
        ) : null}

        {/* 8 · recent entries */}
        <StaggerIn index={ai++}>
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
        </StaggerIn>
      </ScrollView>

      <SettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
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
      <AddInvitationFlow open={invFlowOpen} onClose={() => setInvFlowOpen(false)} />
      <ForecastSheet
        visible={forecastOpen}
        forecast={forecast}
        attendance={attendance}
        onAttendance={changeAttendance}
        onClose={() => setForecastOpen(false)}
        onPickPerson={(id) => {
          setForecastOpen(false);
          nav.navigate('Person', { id });
        }}
      />
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
