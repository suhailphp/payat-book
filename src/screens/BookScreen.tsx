import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
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

/* Column geometry (dp). # + Name are frozen left, Balance frozen right; the five
   entry cells in between share one horizontal offset. */
const ROW_H = 58;
const HEAD_H = 38;
const W_SNO = 40;
const W_NAME = 136;
const W_CELL = 74;
const W_BAL = 98;
const W_LEFT = W_SNO + W_NAME;
const MID_W = W_CELL * 5;

type Sort = 'name' | 'balance' | 'recent';
type Filter = 'all' | 'receive' | 'give' | 'settled';

/* one amount cell: coloured by direction (green = receivable/out, red = in);
   under it the date, or an "Opening" tag when this entry is the opening balance. */
function CellView({ cell, lang, openingLabel }: { cell: BookCell | undefined; lang: string; openingLabel: string }) {
  return (
    <View style={st.cell}>
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

/* One whole ledger row: frozen # + Name, the entry cells (shifted by the shared
   scrollX on the UI thread), frozen Balance. Memoised and free of inline props so
   scrolling never re-renders it — the horizontal shift is native-driven. */
type RowProps = {
  row: BookRow;
  index: number;
  translateX: Animated.AnimatedInterpolation<number>;
  lang: string;
  openingLabel: string;
  settledLabel: string;
  onOpen: (id: number) => void;
};
const LedgerRow = React.memo(function LedgerRow({
  row,
  index,
  translateX,
  lang,
  openingLabel,
  settledLabel,
  onOpen,
}: RowProps) {
  const bg = index % 2 === 0 ? C.paper : C.cotton;
  return (
    <View style={[st.row, { backgroundColor: bg }]}>
      <Pressable onPress={() => onOpen(row.person.id)} style={st.left}>
        <View style={st.snoCell}>
          <Txt size={13} color={C.inkSoft} num>
            {index + 1}
          </Txt>
        </View>
        <View style={st.nameCell}>
          <Txt w={600} size={14.5} numberOfLines={1}>
            {row.person.name}
          </Txt>
          {row.person.ref ? (
            <Txt size={11} color={C.inkSoft} numberOfLines={1}>
              {row.person.ref}
            </Txt>
          ) : null}
        </View>
      </Pressable>
      <View style={st.midClip}>
        <Animated.View style={[st.midInner, { transform: [{ translateX }] }]}>
          <CellView cell={row.entries[0]} lang={lang} openingLabel={openingLabel} />
          <CellView cell={row.entries[1]} lang={lang} openingLabel={openingLabel} />
          <CellView cell={row.entries[2]} lang={lang} openingLabel={openingLabel} />
          <CellView cell={row.entries[3]} lang={lang} openingLabel={openingLabel} />
          <CellView cell={row.entries[4]} lang={lang} openingLabel={openingLabel} />
        </Animated.View>
      </View>
      <View style={st.balCell}>
        {row.balance === 0 ? (
          <Txt w={700} size={12.5} color={C.inkSoft}>
            {settledLabel}
          </Txt>
        ) : (
          <Txt w={700} size={14.5} num color={row.balance > 0 ? C.green : C.red}>
            {fmt(row.balance)}
          </Txt>
        )}
      </View>
    </View>
  );
});

/* A ledger view of every person, styled like the handwritten book. A single
   FlatList owns vertical scroll (so frozen columns can never desync); a shared
   Animated scrollX, driven by one horizontal ScrollView over the middle, moves
   every row's entry cells together on the UI thread. Virtualised for 450+ rows. */
export function BookScreen() {
  const nav = useNavigation<RootNav>();
  const { t, tp, lang, people, txns, meta } = useData();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('name');
  const [filter, setFilter] = useState<Filter>('all');
  const [exporting, setExporting] = useState(false);

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

  /* one shared horizontal offset for every row + the header, driven on the UI
     thread so all columns shift in the same frame */
  const scrollX = useRef(new Animated.Value(0)).current;
  const translateX = useRef(Animated.multiply(scrollX, -1)).current;
  const onHScroll = useMemo(
    () => Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true }),
    [scrollX]
  );

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

  const openPerson = useCallback((id: number) => nav.navigate('Person', { id }), [nav]);
  const openingLabel = t('bookOpening');
  const settledLabel = t('settled');

  const getItemLayout = useCallback(
    (_: ArrayLike<BookRow> | null | undefined, index: number) => ({ length: ROW_H, offset: ROW_H * index, index }),
    []
  );
  const keyExtractor = useCallback((r: BookRow) => String(r.person.id), []);
  const renderItem = useCallback(
    ({ item, index }: { item: BookRow; index: number }) => (
      <LedgerRow
        row={item}
        index={index}
        translateX={translateX}
        lang={lang}
        openingLabel={openingLabel}
        settledLabel={settledLabel}
        onOpen={openPerson}
      />
    ),
    [translateX, lang, openingLabel, settledLabel, openPerson]
  );

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
            <Pressable key={key} onPress={() => setFilter(key)} style={[st.chip, filter === key ? st.chipOn : st.chipOff]}>
              <Txt w={700} size={13.5} color={filter === key ? '#fff' : C.inkSoft}>
                {label}
              </Txt>
            </Pressable>
          ))}
        </ScrollView>
        <View style={st.totals}>
          <Txt w={600} size={13} color={C.greenDeep} num numberOfLines={1}>
            {tp('totalsLine', { n: tot.count, r: fmt(tot.recv), g: fmt(tot.give) })}
          </Txt>
        </View>
      </View>

      {/* table */}
      <View style={{ flex: 1, marginTop: 10 }}>
        {/* header row (widths match the body columns exactly) */}
        <View style={{ flexDirection: 'row' }}>
          <View style={[st.headCell, { width: W_SNO, borderRightWidth: 1, borderRightColor: C.gold }]}>
            <Txt w={700} size={12} color={C.greenDeep} style={st.headLbl}>
              {t('bookSno')}
            </Txt>
          </View>
          <View style={[st.headCell, { width: W_NAME, alignItems: 'flex-start', paddingHorizontal: 8 }]}>
            <Txt w={700} size={12} color={C.greenDeep} style={st.headLbl}>
              {t('fName')}
            </Txt>
          </View>
          <View style={[st.headCell, { flex: 1 }]}>
            <Txt w={700} size={12} color={C.greenDeep} style={st.headLbl}>
              {t('bookEntries')}
            </Txt>
          </View>
          <View style={[st.headCell, { width: W_BAL, borderLeftWidth: 1, borderLeftColor: C.gold }]}>
            <Txt w={700} size={12} color={C.greenDeep} style={st.headLbl}>
              {t('bookBalance')}
            </Txt>
          </View>
        </View>
        <View style={st.rule4} />
        <View style={st.rule1} />

        {/* body: one vertical FlatList; a transparent horizontal ScrollView over
            the middle drives the shared scrollX (vertical scroll via the frozen
            columns, horizontal via the entries — they never desync) */}
        <View style={{ flex: 1 }}>
          <FlatList
            data={rows}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            getItemLayout={getItemLayout}
            showsVerticalScrollIndicator
            initialNumToRender={14}
            maxToRenderPerBatch={12}
            windowSize={9}
            ListEmptyComponent={<Empty desc={q.trim() ? t('noMatch') : t('emptyPeopleD')} />}
          />
          {rows.length ? (
            <Animated.ScrollView
              horizontal
              style={st.hDriver}
              contentContainerStyle={{ width: MID_W }}
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              onScroll={onHScroll}
            >
              <View style={{ width: MID_W, height: '100%' }} />
            </Animated.ScrollView>
          ) : null}
        </View>
      </View>

      <SettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
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
  headLbl: { letterSpacing: 0.6, textTransform: 'uppercase', fontFamily: FONT.bold },
  headCell: { height: HEAD_H, backgroundColor: C.goldSoft, alignItems: 'center', justifyContent: 'center' },
  rule4: { height: 4, backgroundColor: C.gold },
  rule1: { height: 1, backgroundColor: C.gold, marginTop: 2 },
  /* horizontal-scroll driver over the middle only */
  hDriver: { position: 'absolute', left: W_LEFT, right: W_BAL, top: 0, bottom: 0 },
  row: { flexDirection: 'row', height: ROW_H },
  left: { flexDirection: 'row', width: W_LEFT },
  snoCell: {
    width: W_SNO,
    height: ROW_H,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.goldSoft,
    borderRightWidth: 1,
    borderRightColor: C.gold,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  nameCell: {
    width: W_NAME,
    height: ROW_H,
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  midClip: { flex: 1, height: ROW_H, overflow: 'hidden', borderBottomWidth: 1, borderBottomColor: C.line },
  midInner: { width: MID_W, height: ROW_H, flexDirection: 'row' },
  cell: { width: W_CELL, height: ROW_H, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  balCell: {
    width: W_BAL,
    height: ROW_H,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderLeftWidth: 1,
    borderLeftColor: C.gold,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
});
