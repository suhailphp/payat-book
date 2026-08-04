import React, { useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useData } from '../data';
import { bookRow, dstr, fmt, type BookCell, type BookRow } from '../lib';
import { STR } from '../i18n';
import { C, FONT } from '../theme';
import { KasavuHeader } from '../components/Header';
import { Empty, SearchInput, Seg, Txt } from '../components/UI';
import { SaveIcon } from '../components/Icons';
import { SettingsSheet } from '../sheets/SettingsSheet';
import { exportBookPdf } from '../bookPdf';
import { toast } from '../components/Toast';
import type { RootNav } from '../nav';

const OB_NOTES = [STR.en.obNote, STR.ml.obNote];

/* Column geometry (dp). Left frozen = # + Name; right frozen = Balance;
   the middle (opening + 5 entry cells) scrolls horizontally. */
const ROW_H = 58;
const HEAD_H = 38;
const W_SNO = 40;
const W_NAME = 136;
const W_CELL = 74;
const W_BAL = 98;
const MID_W = W_CELL * 5;

type Sort = 'name' | 'balance' | 'recent';
type Filter = 'all' | 'receive' | 'give' | 'settled';

/* A ledger view of every person, styled like the handwritten book: frozen
   #/Name on the left, frozen Balance on the right, a horizontally-scrollable
   run of the last five entries in between. Virtualised for 450+ rows. */
export function BookScreen() {
  const nav = useNavigation<RootNav>();
  const { t, tp, lang, people, txns, meta } = useData();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('name');
  const [filter, setFilter] = useState<Filter>('all');
  const [exporting, setExporting] = useState(false);
  /* the table body FlatLists need an explicit height to virtualise (the middle
     one lives inside a horizontal ScrollView, which won't bound it otherwise). */
  const [tableH, setTableH] = useState(0);
  const bodyH = Math.max(0, tableH - HEAD_H - 7); // minus header + double gold rule

  const allRows = useMemo(() => people.map((p) => bookRow(p, txns, OB_NOTES)), [people, txns]);

  const rows = useMemo(() => {
    let r = allRows;
    if (filter === 'receive') r = r.filter((x) => x.balance > 0);
    else if (filter === 'give') r = r.filter((x) => x.balance < 0);
    else if (filter === 'settled') r = r.filter((x) => x.balance === 0);
    const needle = q.trim().toLowerCase();
    if (needle) r = r.filter((x) => `${x.person.name} ${x.person.ref}`.toLowerCase().includes(needle));
    const out = [...r];
    if (sort === 'name') out.sort((a, b) => a.person.name.localeCompare(b.person.name));
    else if (sort === 'balance') out.sort((a, b) => b.balance - a.balance);
    else out.sort((a, b) => (b.lastDate || '').localeCompare(a.lastDate || '') || b.person.id - a.person.id);
    return out;
  }, [allRows, filter, q, sort]);

  const tot = useMemo(() => {
    let recv = 0;
    let give = 0;
    for (const r of rows) {
      if (r.balance > 0) recv += r.balance;
      else if (r.balance < 0) give += -r.balance;
    }
    return { recv, give, count: rows.length };
  }, [rows]);

  /* vertical scroll sync across the three frozen/scrolling columns. The lastY
     guard swallows the echo when a driven list re-emits the same offset. */
  const leftRef = useRef<FlatList>(null);
  const midRef = useRef<FlatList>(null);
  const rightRef = useRef<FlatList>(null);
  const lastY = useRef(0);
  const syncV = (y: number, self: React.RefObject<FlatList | null>) => {
    if (Math.abs(y - lastY.current) < 0.5) return;
    lastY.current = y;
    [leftRef, midRef, rightRef].forEach((r) => {
      if (r !== self) r.current?.scrollToOffset({ offset: y, animated: false });
    });
  };

  const doExport = async () => {
    if (exporting || !rows.length) return;
    setExporting(true);
    try {
      await exportBookPdf(rows, tot, meta.ownerName ?? '', lang, t, tp);
    } catch (e) {
      toast(tp('backupFailed', { e: String((e as Error)?.message ?? e) }));
    } finally {
      setExporting(false);
    }
  };

  const getItemLayout = (_: unknown, index: number) => ({ length: ROW_H, offset: ROW_H * index, index });
  const altBg = (i: number) => (i % 2 === 0 ? C.paper : C.cotton);

  const openPerson = (id: number) => nav.navigate('Person', { id });

  return (
    <View style={{ flex: 1, backgroundColor: C.cotton }}>
      <KasavuHeader
        onGear={() => setSettingsOpen(true)}
        actions={
          <Pressable
            onPress={doExport}
            disabled={exporting || !rows.length}
            accessibilityLabel={t('exportPdf')}
            style={({ pressed }) => [st.hbtn, pressed && { backgroundColor: C.cotton }, (exporting || !rows.length) && { opacity: 0.4 }]}
          >
            <SaveIcon size={24} color={C.greenDeep} />
          </Pressable>
        }
      />

      {/* controls */}
      <View style={{ paddingHorizontal: 12, paddingTop: 12, gap: 10 }}>
        <SearchInput value={q} onChangeText={setQ} placeholder={t('searchPeople')} autoCorrect={false} />
        <Seg
          options={[
            { value: 'name', label: t('sortName') },
            { value: 'balance', label: t('sortBalance') },
            { value: 'recent', label: t('sortRecent') },
          ]}
          value={sort}
          onChange={(v) => setSort(v as Sort)}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 12 }}>
          {(
            [
              ['all', t('filterAll')],
              ['receive', t('filterToReceive')],
              ['give', t('filterToGive')],
              ['settled', t('filterSettled')],
            ] as [Filter, string][]
          ).map(([key, label]) => (
            <Pressable
              key={key}
              onPress={() => setFilter(key)}
              style={[st.chip, filter === key ? st.chipOn : st.chipOff]}
            >
              <Txt w={700} size={13.5} color={filter === key ? '#fff' : C.inkSoft}>
                {label}
              </Txt>
            </Pressable>
          ))}
        </ScrollView>
        {/* totals strip, pinned (recomputed for the current filter) */}
        <View style={st.totals}>
          <Txt w={600} size={13} color={C.greenDeep} num numberOfLines={1}>
            {tp('totalsLine', { n: tot.count, r: fmt(tot.recv), g: fmt(tot.give) })}
          </Txt>
        </View>
      </View>

      {/* table */}
      <View
        style={{ flex: 1, flexDirection: 'row', marginTop: 10 }}
        onLayout={(e) => setTableH(e.nativeEvent.layout.height)}
      >
        {/* frozen left: # + Name */}
        <View style={{ width: W_SNO + W_NAME }}>
          <View style={[st.headRow, { flexDirection: 'row' }]}>
            <View style={[st.snoCell, { height: HEAD_H }]}>
              <Txt w={700} size={12} color={C.greenDeep} style={st.headLbl}>
                {t('bookSno')}
              </Txt>
            </View>
            <View style={[st.cell, { width: W_NAME, height: HEAD_H, alignItems: 'flex-start' }]}>
              <Txt w={700} size={12} color={C.greenDeep} style={st.headLbl}>
                {t('fName')}
              </Txt>
            </View>
          </View>
          <GoldRule />
          <FlatList
            ref={leftRef}
            style={{ height: bodyH }}
            data={rows}
            keyExtractor={(r) => `l${r.person.id}`}
            getItemLayout={getItemLayout}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={(e) => syncV(e.nativeEvent.contentOffset.y, leftRef)}
            initialNumToRender={16}
            windowSize={11}
            renderItem={({ item, index }) => (
              <Pressable onPress={() => openPerson(item.person.id)} style={{ flexDirection: 'row', height: ROW_H, backgroundColor: altBg(index) }}>
                <View style={[st.snoCell, { height: ROW_H }]}>
                  <Txt size={13} color={C.inkSoft} num>
                    {index + 1}
                  </Txt>
                </View>
                <View style={[st.cell, { width: W_NAME, height: ROW_H, alignItems: 'flex-start', justifyContent: 'center' }]}>
                  <Txt w={600} size={14.5} numberOfLines={1}>
                    {item.person.name}
                  </Txt>
                  {item.person.ref ? (
                    <Txt size={11} color={C.inkSoft} numberOfLines={1}>
                      {item.person.ref}
                    </Txt>
                  ) : null}
                </View>
              </Pressable>
            )}
            ListEmptyComponent={<Empty desc={q.trim() ? t('noMatch') : t('emptyPeopleD')} />}
          />
        </View>

        {/* scrollable middle: the 5 most-recent entries (opening included, labelled) */}
        <View style={{ flex: 1 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator scrollEventThrottle={16}>
            <View style={{ width: MID_W }}>
              <View style={[st.headRow, { flexDirection: 'row' }]}>
                <View style={[st.cell, { width: MID_W, height: HEAD_H }]}>
                  <Txt w={700} size={12} color={C.greenDeep} style={st.headLbl}>
                    {t('bookEntries')}
                  </Txt>
                </View>
              </View>
              <GoldRule width={MID_W} />
              <FlatList
                ref={midRef}
                style={{ height: bodyH }}
                data={rows}
                keyExtractor={(r) => `m${r.person.id}`}
                getItemLayout={getItemLayout}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={(e) => syncV(e.nativeEvent.contentOffset.y, midRef)}
                initialNumToRender={16}
                windowSize={11}
                renderItem={({ item, index }) => (
                  <View style={{ flexDirection: 'row', height: ROW_H, width: MID_W, backgroundColor: altBg(index) }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <MoneyCell key={i} width={W_CELL} cell={item.entries[i]} lang={lang} openingLabel={t('bookOpening')} />
                    ))}
                  </View>
                )}
              />
            </View>
          </ScrollView>
        </View>

        {/* frozen right: Balance */}
        <View style={{ width: W_BAL }}>
          <View style={[st.headRow, st.balCol, { height: HEAD_H, justifyContent: 'center' }]}>
            <Txt w={700} size={12} color={C.greenDeep} style={st.headLbl}>
              {t('bookBalance')}
            </Txt>
          </View>
          <GoldRule width={W_BAL} />
          <FlatList
            ref={rightRef}
            style={{ height: bodyH }}
            data={rows}
            keyExtractor={(r) => `r${r.person.id}`}
            getItemLayout={getItemLayout}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={(e) => syncV(e.nativeEvent.contentOffset.y, rightRef)}
            initialNumToRender={16}
            windowSize={11}
            renderItem={({ item, index }) => (
              <View style={[st.balCol, { height: ROW_H, justifyContent: 'center', backgroundColor: altBg(index) }]}>
                {item.balance === 0 ? (
                  <Txt w={700} size={12.5} color={C.inkSoft}>
                    {t('settled')}
                  </Txt>
                ) : (
                  <Txt w={700} size={14.5} num color={item.balance > 0 ? C.green : C.red}>
                    {fmt(item.balance)}
                  </Txt>
                )}
              </View>
            )}
          />
        </View>
      </View>

      <SettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </View>
  );
}

/* double gold rule (kasavu) under the header row */
function GoldRule({ width }: { width?: number }) {
  return (
    <View style={{ width }}>
      <View style={{ height: 4, backgroundColor: C.gold }} />
      <View style={{ height: 1, backgroundColor: C.gold, marginTop: 2 }} />
    </View>
  );
}

/* one amount cell: coloured by direction (green = receivable/out, red = in),
   the app's established convention; under it the date, or an "Opening" tag when
   this entry is the opening balance. Blank when empty. */
function MoneyCell({
  width,
  cell,
  lang,
  openingLabel,
}: {
  width: number;
  cell: BookCell | null | undefined;
  lang: string;
  openingLabel: string;
}) {
  return (
    <View style={[st.cell, { width, height: ROW_H }]}>
      {cell ? (
        <>
          <Txt w={700} size={13} num color={cell.dir === 'out' ? C.green : C.red}>
            {fmt(cell.amount)}
          </Txt>
          {cell.isOpening ? (
            <Txt w={600} size={9.5} color={C.gold}>
              {openingLabel}
            </Txt>
          ) : cell.date ? (
            <Txt size={10} color={C.inkSoft} num>
              {dstr(cell.date, lang)}
            </Txt>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  hbtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  chip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5 },
  chipOn: { backgroundColor: C.green, borderColor: C.green },
  chipOff: { backgroundColor: C.paper, borderColor: C.line },
  totals: {
    backgroundColor: C.goldSoft,
    borderWidth: 1,
    borderColor: C.gold,
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  headRow: { backgroundColor: C.goldSoft },
  headLbl: { letterSpacing: 0.6, textTransform: 'uppercase', fontFamily: FONT.bold },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  snoCell: {
    width: W_SNO,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.goldSoft,
    borderRightWidth: 1,
    borderRightColor: C.gold,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  balCol: {
    alignItems: 'center',
    paddingHorizontal: 6,
    borderLeftWidth: 1,
    borderLeftColor: C.gold,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
});
