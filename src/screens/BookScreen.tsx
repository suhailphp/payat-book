import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, SectionList, SectionListProps, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useData } from '../data';
import { bookRow, dstr, fmt, type BookCell, type BookRow } from '../lib';
import { STR } from '../i18n';
import { C, FONT } from '../theme';
import { KasavuHeader } from '../components/Header';
import { Empty, SearchInput, Txt } from '../components/UI';
import { CollapseIcon, ExpandIcon, FunnelIcon, SaveIcon } from '../components/Icons';
import { SettingsSheet } from '../sheets/SettingsSheet';
import { BookOptionsSheet, type Filter, type Sort } from '../sheets/BookOptionsSheet';
import { exportBookPdf } from '../bookPdf';
import { toast } from '../components/Toast';
import type { RootNav } from '../nav';

const OB_NOTES = [STR.en.obNote, STR.ml.obNote];

/* Column geometry (dp). # + Name are frozen left, Balance frozen right; the five
   entry cells in between share one horizontal offset. */
const ROW_H = 58;
const HEAD_H = 38;
const HEADER_H = HEAD_H + 7; // header row + the 4px/1px gold rules beneath it
const W_SNO = 40;
const W_NAME = 136;
const W_CELL = 74;
const W_BAL = 98;
const W_LEFT = W_SNO + W_NAME;
const MID_W = W_CELL * 5;

/* Native-driven vertical scroll (drives the collapsing-controls offset). */
const AnimatedSectionList = Animated.createAnimatedComponent(
  SectionList as React.ComponentType<SectionListProps<BookRow>>
);

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

/* The sticky table header — pinned at the top of the scroll area while the
   controls above it scroll away. */
function TableHeader({ t }: { t: (k: string) => string }) {
  return (
    <View style={{ backgroundColor: C.cotton }}>
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
    </View>
  );
}

/* A ledger view of every person, styled like the handwritten book. One
   SectionList owns vertical scroll: the controls (search + options + totals)
   ride in ListHeaderComponent and scroll away, while the table header is a
   sticky section header. A shared Animated scrollX, driven by one horizontal
   ScrollView over the middle band, moves every row's entry cells together on
   the UI thread. */
export function BookScreen() {
  const nav = useNavigation<RootNav>();
  const { t, tp, lang, people, txns, meta, setMeta } = useData();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('name');
  const [filter, setFilter] = useState<Filter>('all');
  const [exporting, setExporting] = useState(false);
  const [controlsH, setControlsH] = useState(96);

  const fullPage = meta.bookFullPage === '1';
  const filtersActive = sort !== 'name' || filter !== 'all';

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

  /* one shared horizontal offset for every row, driven on the UI thread */
  const scrollX = useRef(new Animated.Value(0)).current;
  const translateX = useRef(Animated.multiply(scrollX, -1)).current;
  const onHScroll = useMemo(
    () => Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true }),
    [scrollX]
  );

  /* vertical scroll → collapse the controls: keep the horizontal driver overlay
     riding exactly over the rows (translated down by the still-visible controls
     height, so it never covers the toolbar or the sticky header) */
  const scrollY = useRef(new Animated.Value(0)).current;
  const onVScroll = useMemo(
    () => Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true }),
    [scrollY]
  );
  const overlayShift = useMemo(
    () =>
      fullPage
        ? new Animated.Value(0)
        : scrollY.interpolate({
            inputRange: [0, Math.max(1, controlsH)],
            outputRange: [controlsH, 0],
            extrapolate: 'clamp',
          }),
    [fullPage, controlsH, scrollY]
  );

  const doExport = async () => {
    if (exporting || !rows.length) return;
    setExporting(true);
    try {
      await exportBookPdf(rows, tot, meta.ownerName ?? '', lang, t, tp);
    } catch (e) {
      /* never silent: surface the real reason and always re-enable below */
      toast(tp('pdfFailed', { e: String((e as Error)?.message ?? e) }));
    } finally {
      setExporting(false);
    }
  };

  const toggleFullPage = () => setMeta('bookFullPage', fullPage ? '' : '1');

  const openPerson = useCallback((id: number) => nav.navigate('Person', { id }), [nav]);
  const openingLabel = t('bookOpening');
  const settledLabel = t('settled');

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

  /* controls block (search + options button + totals) — scrolls away */
  const controls = fullPage ? undefined : (
    <View onLayout={(e) => setControlsH(e.nativeEvent.layout.height)} style={st.controls}>
      <View style={st.toolbar}>
        <SearchInput
          value={q}
          onChangeText={setQ}
          placeholder={t('searchPeople')}
          autoCorrect={false}
          style={st.searchCompact}
        />
        <Pressable onPress={() => setOptionsOpen(true)} accessibilityLabel={t('bookSortFilter')} style={st.funnelBtn}>
          <FunnelIcon size={22} color={C.greenDeep} />
          {filtersActive ? <View style={st.dot} /> : null}
        </Pressable>
      </View>
      <Txt size={12.5} color={C.inkSoft} num numberOfLines={1} style={{ marginTop: 8 }}>
        {tp('totalsLine', { n: tot.count, r: fmt(tot.recv), g: fmt(tot.give) })}
      </Txt>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.cotton }}>
      <KasavuHeader
        onGear={() => setSettingsOpen(true)}
        actions={
          <>
            <Pressable onPress={toggleFullPage} accessibilityLabel={t('bookFullScreen')} style={st.hbtn}>
              {fullPage ? <CollapseIcon size={22} color={C.greenDeep} /> : <ExpandIcon size={22} color={C.greenDeep} />}
            </Pressable>
            <Pressable
              onPress={doExport}
              disabled={exporting || !rows.length}
              accessibilityLabel={t('exportPdf')}
              style={({ pressed }) => [
                st.hbtn,
                pressed && { backgroundColor: C.cotton },
                (exporting || !rows.length) && { opacity: 0.4 },
              ]}
            >
              <SaveIcon size={24} color={C.greenDeep} />
            </Pressable>
          </>
        }
      />

      <View style={{ flex: 1 }}>
        <AnimatedSectionList
          sections={rows.length ? [{ data: rows }] : []}
          renderItem={renderItem as any}
          renderSectionHeader={() => <TableHeader t={t} />}
          ListHeaderComponent={controls}
          keyExtractor={keyExtractor as any}
          stickySectionHeadersEnabled
          onScroll={onVScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator
          initialNumToRender={14}
          maxToRenderPerBatch={12}
          windowSize={9}
          ListEmptyComponent={<Empty desc={q.trim() ? t('noMatch') : t('emptyPeopleD')} />}
        />

        {/* invisible horizontal driver over the middle band → shared scrollX.
            Rides over the rows only (translated down by the visible controls). */}
        {rows.length ? (
          <Animated.View style={[st.hDriver, { transform: [{ translateY: overlayShift }] }]} pointerEvents="box-none">
            <Animated.ScrollView
              horizontal
              style={{ flex: 1 }}
              contentContainerStyle={{ width: MID_W }}
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              onScroll={onHScroll}
            >
              <View style={{ width: MID_W, height: '100%' }} />
            </Animated.ScrollView>
          </Animated.View>
        ) : null}
      </View>

      {exporting ? (
        <View style={st.pdfOverlay}>
          <View style={st.pdfCard}>
            <ActivityIndicator color={C.green} />
            <Txt size={14} w={600} color={C.greenDeep} style={{ marginTop: 10 }}>
              {t('pdfExporting')}
            </Txt>
          </View>
        </View>
      ) : null}

      <BookOptionsSheet
        visible={optionsOpen}
        sort={sort}
        filter={filter}
        onSort={setSort}
        onFilter={setFilter}
        onClose={() => setOptionsOpen(false)}
      />
      <SettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </View>
  );
}

const st = StyleSheet.create({
  hbtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  controls: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 10 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchCompact: { flex: 1, height: 40, paddingVertical: 0, fontSize: 15 },
  funnelBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.line,
    backgroundColor: C.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: C.gold,
    borderWidth: 1,
    borderColor: C.paper,
  },
  headLbl: { letterSpacing: 0.6, textTransform: 'uppercase', fontFamily: FONT.bold },
  headCell: { height: HEAD_H, backgroundColor: C.goldSoft, alignItems: 'center', justifyContent: 'center' },
  rule4: { height: 4, backgroundColor: C.gold },
  rule1: { height: 1, backgroundColor: C.gold, marginTop: 2 },
  /* horizontal-scroll driver over the middle band only; top starts just below
     the sticky header, translateY keeps it over the rows as controls collapse */
  hDriver: { position: 'absolute', left: W_LEFT, right: W_BAL, top: HEADER_H, bottom: 0 },
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
  pdfOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(32,41,31,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfCard: {
    backgroundColor: C.paper,
    borderRadius: 14,
    paddingVertical: 22,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
});
