import React from 'react';
import { View } from 'react-native';
import { useData } from '../data';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';
import { Row, Txt } from '../components/UI';
import { CheckIcon } from '../components/Icons';

export type Sort = 'name' | 'balance' | 'recent';
export type Filter = 'all' | 'receive' | 'give' | 'settled';

const SORTS: { value: Sort; key: string }[] = [
  { value: 'name', key: 'sortName' },
  { value: 'balance', key: 'sortBalance' },
  { value: 'recent', key: 'sortRecent' },
];
const FILTERS: { value: Filter; key: string }[] = [
  { value: 'all', key: 'filterAll' },
  { value: 'receive', key: 'filterToReceive' },
  { value: 'give', key: 'filterToGive' },
  { value: 'settled', key: 'filterSettled' },
];

const GroupLabel = ({ children }: { children: React.ReactNode }) => (
  <Txt w={700} size={13} color={C.inkSoft} style={{ letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 6, marginBottom: 2 }}>
    {children}
  </Txt>
);

/* Combined sort + filter for the Book page — moved off the page into this sheet
   so the toolbar is a single compact row. Both are single-select and apply live;
   the sheet stays open so he can set both, then dismiss. */
export function BookOptionsSheet({
  visible,
  sort,
  filter,
  onSort,
  onFilter,
  onClose,
}: {
  visible: boolean;
  sort: Sort;
  filter: Filter;
  onSort: (s: Sort) => void;
  onFilter: (f: Filter) => void;
  onClose: () => void;
}) {
  const { t } = useData();
  const pick = <T,>(value: T, current: T, label: string, last: boolean, onPress: () => void) => (
    <Row key={label} last={last} onPress={onPress}>
      <Txt w={value === current ? 700 : 500} size={16.5} style={{ flex: 1 }}>
        {label}
      </Txt>
      {value === current ? <CheckIcon size={20} color={C.green} /> : <View style={{ width: 20 }} />}
    </Row>
  );

  return (
    <Sheet visible={visible} onClose={onClose} title={t('bookSortFilter')}>
      <GroupLabel>{t('sortLbl')}</GroupLabel>
      {SORTS.map((o, i) => pick(o.value, sort, t(o.key), i === SORTS.length - 1, () => onSort(o.value)))}
      <GroupLabel>{t('filterLbl')}</GroupLabel>
      {FILTERS.map((o, i) => pick(o.value, filter, t(o.key), i === FILTERS.length - 1, () => onFilter(o.value)))}
    </Sheet>
  );
}
