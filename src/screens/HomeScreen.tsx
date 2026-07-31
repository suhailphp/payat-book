import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useData } from '../data';
import { bal, dstr, fmt, monthBuckets, monthKey, monthTotals, today, topBalances } from '../lib';
import { C, RADIUS, SHADOW } from '../theme';
import { KasavuHeader } from '../components/Header';
import { Avatar, BalChip, Btn, Card, Empty, Row, SecTitle, Txt } from '../components/UI';
import { PlusIcon } from '../components/Icons';
import { MonthChart } from '../components/MonthChart';
import { SettingsSheet } from '../sheets/SettingsSheet';
import { exportBackup } from '../backup';
import { toast } from '../components/Toast';
import type { RootNav } from '../nav';

export function HomeScreen() {
  const nav = useNavigation<RootNav>();
  const { t, tp, lang, people, events, txns, meta, setMeta } = useData();
  const [settingsOpen, setSettingsOpen] = useState(false);

  let recv = 0,
    give = 0,
    cr = 0,
    cg = 0;
  people.forEach((p) => {
    const b = bal(txns, p.id);
    if (b > 0) {
      recv += b;
      cr++;
    }
    if (b < 0) {
      give -= b;
      cg++;
    }
  });

  const hasData = txns.length > 0;
  const thisMonth = monthTotals(txns, monthKey(today()));
  const buckets = monthBuckets(txns, today(), 6);
  const top = topBalances(people, txns, 5);

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
    } catch {
      /* user cancelled share */
    }
  };

  const topList = (list: typeof top.receive) =>
    list.map((r, i) => (
      <Row key={r.person.id} last={i === list.length - 1} onPress={() => nav.navigate('Person', { id: r.person.id })}>
        <Avatar name={r.person.name} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt w={600} size={16.5} numberOfLines={1}>
            {r.person.name}
          </Txt>
        </View>
        <BalChip b={r.b} settledLabel={t('settled')} />
      </Row>
    ));

  return (
    <View style={{ flex: 1, backgroundColor: C.cotton }}>
      <KasavuHeader onGear={() => setSettingsOpen(true)} />
      <ScrollView contentContainerStyle={st.main}>
        {/* greeting */}
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

        {/* the "book spread": To Receive | To Give with a gold spine */}
        <View style={st.spread}>
          <View style={st.page}>
            <Txt w={700} size={13} color={C.inkSoft} style={st.lbl}>
              {t('toReceive')}
            </Txt>
            <Txt w={700} size={29} color={C.green} num style={{ marginTop: 2 }}>
              {fmt(recv)}
            </Txt>
            <Txt size={13} color={C.inkSoft} num>
              {cr} {cr === 1 ? t('ppl1') : t('ppl')}
            </Txt>
          </View>
          <View style={st.page}>
            <Txt w={700} size={13} color={C.inkSoft} style={st.lbl}>
              {t('toGive')}
            </Txt>
            <Txt w={700} size={29} color={C.red} num style={{ marginTop: 2 }}>
              {fmt(give)}
            </Txt>
            <Txt size={13} color={C.inkSoft} num>
              {cg} {cg === 1 ? t('ppl1') : t('ppl')}
            </Txt>
          </View>
          <View style={st.spine} />
        </View>

        {hasData ? (
          <>
            {/* this month */}
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

            {/* last 6 months */}
            <SecTitle>{t('last6Months')}</SecTitle>
            <Card style={{ padding: 14 }}>
              <MonthChart buckets={buckets} lang={lang} receivedLabel={t('statReceived')} givenLabel={t('statGiven')} />
            </Card>

            {/* top balances */}
            {top.receive.length ? (
              <>
                <SecTitle>{t('topToReceive')}</SecTitle>
                <Card>{topList(top.receive)}</Card>
              </>
            ) : null}
            {top.give.length ? (
              <>
                <SecTitle>{t('topToGive')}</SecTitle>
                <Card>{topList(top.give)}</Card>
              </>
            ) : null}
          </>
        ) : null}

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
        {txns.length === 0 ? (
          <Btn label={t('addFirst')} icon={<PlusIcon />} onPress={() => nav.navigate('Tabs', { screen: 'PeopleTab' })} />
        ) : null}
      </ScrollView>
      <SettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
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
