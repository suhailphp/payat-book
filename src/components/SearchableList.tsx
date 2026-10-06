import React, { useEffect, useState } from 'react';
import { FlatList, StyleProp, View, ViewStyle } from 'react-native';
import { useData } from '../data';
import { findRows, LETTER_INDEX_MIN, letterIndex, pageSlice, resultLabel, SEARCH_LIMIT } from '../lib';
import { C } from '../theme';
import { Btn, Card, Empty, LetterStrip, listCardWrap, SearchInput, Txt } from './UI';

/* One searchable, paginated, virtualized list (built for 1000+ rows):
   - search field appears only when the full dataset exceeds initialLimit
   - shows initialLimit rows, "Show more" reveals pageSize more at a time
   - searching always filters the FULL dataset, not the visible page, ranks
     the matches (searchKeys[0] is the name: prefix > word start > contains >
     other keys) and shows the match count
   - while narrowing (a query or a letter tab) the first page is SEARCH_LIMIT
   - letters: a strip of index-letter tabs over searchKeys[0], on long lists */
export function SearchableList<T>({
  data,
  keyOf,
  renderRow,
  searchKeys,
  initialLimit = 10,
  pageSize = 25,
  placeholder,
  letters = false,
  empty,
  header,
  footer,
  listStyle,
  contentContainerStyle,
}: {
  data: T[];
  keyOf: (item: T) => string;
  renderRow: (item: T, index: number, visibleCount: number) => React.ReactElement | null;
  searchKeys: string[];
  initialLimit?: number;
  pageSize?: number;
  placeholder?: string;
  letters?: boolean;
  empty: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  listStyle?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}) {
  const { t, tp } = useData();
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<string | null>(null);

  const tabs =
    letters && data.length > LETTER_INDEX_MIN
      ? letterIndex(data.map((d) => String((d as Record<string, unknown>)[searchKeys[0]] ?? '')))
      : [];
  /* a tab whose last name was just deleted/renamed simply stops applying */
  const letter = picked !== null && tabs.includes(picked) ? picked : null;
  const narrowing = !!q.trim() || letter !== null;
  const firstPage = narrowing ? Math.max(initialLimit, SEARCH_LIMIT) : initialLimit;
  const [shown, setShown] = useState(firstPage);

  useEffect(() => setShown(firstPage), [q, letter, firstPage]);

  const filtered = findRows(data, q, letter, searchKeys);
  const { rows, hasMore } = pageSlice(filtered, shown);

  return (
    <FlatList
      data={rows}
      keyExtractor={keyOf}
      keyboardShouldPersistTaps="handled"
      style={listStyle}
      contentContainerStyle={contentContainerStyle}
      ListHeaderComponent={
        <View>
          {header}
          {data.length > initialLimit ? (
            <View style={{ marginBottom: 10 }}>
              <SearchInput value={q} onChangeText={setQ} placeholder={placeholder} autoCorrect={false} />
              {tabs.length ? (
                <View style={{ marginTop: 10 }}>
                  <LetterStrip letters={tabs} value={letter} onChange={setPicked} allLabel={t('allLetters')} />
                </View>
              ) : null}
              {narrowing ? (
                <Txt size={13.5} color={C.inkSoft} num style={{ marginTop: 8 }}>
                  {resultLabel(filtered.length, t, tp)}
                </Txt>
              ) : null}
            </View>
          ) : null}
        </View>
      }
      renderItem={({ item, index }) => (
        <View style={listCardWrap(index, rows.length)}>{renderRow(item, index, rows.length)}</View>
      )}
      ListEmptyComponent={<Card>{narrowing && data.length ? <Empty desc={t('noMatch')} /> : empty}</Card>}
      ListFooterComponent={
        <View>
          {hasMore ? <Btn label={t('showMore')} kind="ghost" onPress={() => setShown((s) => s + pageSize)} /> : null}
          {footer}
        </View>
      }
    />
  );
}
