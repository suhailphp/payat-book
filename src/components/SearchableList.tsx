import React, { useEffect, useState } from 'react';
import { FlatList, StyleProp, View, ViewStyle } from 'react-native';
import { useData } from '../data';
import { pageSlice, searchFilter } from '../lib';
import { Btn, Card, Empty, listCardWrap, SearchInput } from './UI';

/* One searchable, paginated, virtualized list (built for 1000+ rows):
   - search field appears only when the full dataset exceeds initialLimit
   - shows initialLimit rows, "Show more" reveals pageSize more at a time
   - searching always filters the FULL dataset, not the visible page */
export function SearchableList<T>({
  data,
  keyOf,
  renderRow,
  searchKeys,
  initialLimit = 10,
  pageSize = 25,
  placeholder,
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
  empty: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  listStyle?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}) {
  const { t } = useData();
  const [q, setQ] = useState('');
  const [shown, setShown] = useState(initialLimit);

  useEffect(() => setShown(initialLimit), [q, initialLimit]);

  const filtered = searchFilter(data, q, searchKeys);
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
            </View>
          ) : null}
        </View>
      }
      renderItem={({ item, index }) => (
        <View style={listCardWrap(index, rows.length)}>{renderRow(item, index, rows.length)}</View>
      )}
      ListEmptyComponent={<Card>{q.trim() && data.length ? <Empty desc={t('noMatch')} /> : empty}</Card>}
      ListFooterComponent={
        <View>
          {hasMore ? <Btn label={t('showMore')} kind="ghost" onPress={() => setShown((s) => s + pageSize)} /> : null}
          {footer}
        </View>
      }
    />
  );
}
