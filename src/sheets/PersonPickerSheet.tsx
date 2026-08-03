import React from 'react';
import { useWindowDimensions, View } from 'react-native';
import { useData } from '../data';
import { bal } from '../lib';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';
import { SearchableList } from '../components/SearchableList';
import { Avatar, BalChip, Btn, Empty, Row, Txt } from '../components/UI';
import { PlusIcon } from '../components/Icons';

/* Person picker with search and an inline "New person" escape hatch,
   used by "Pay a payat" and the hosting screen's add-collection flow. */
export function PersonPickerSheet({
  visible,
  title,
  onClose,
  onPick,
  onNew,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  onPick: (personId: number) => void;
  onNew: () => void;
}) {
  const { t, people, txns } = useData();
  const { height } = useWindowDimensions();

  const list = [...people].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      scrollable={false}
      footer={<Btn label={t('newPerson')} kind="ghost" icon={<PlusIcon color={C.greenDeep} />} onPress={onNew} />}
    >
      <SearchableList
        data={list}
        keyOf={(p) => String(p.id)}
        searchKeys={['name']}
        placeholder={t('searchName')}
        listStyle={{ maxHeight: height * 0.5 }}
        empty={<Empty desc={t('noMatch')} />}
        renderRow={(p, index, count) => (
          <Row last={index === count - 1} onPress={() => onPick(p.id)}>
            <Avatar name={p.name} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt w={600} size={16.5} numberOfLines={1}>
                {p.name}
              </Txt>
            </View>
            <BalChip b={bal(txns, p.id)} settledLabel={t('settled')} />
          </Row>
        )}
      />
    </Sheet>
  );
}
