import React, { useEffect, useState } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { useData } from '../data';
import { bal } from '../lib';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';
import { Avatar, BalChip, Btn, Empty, Row, SearchInput, Txt } from '../components/UI';
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
  const [q, setQ] = useState('');
  const { height } = useWindowDimensions();

  useEffect(() => {
    if (visible) setQ('');
  }, [visible]);

  const list = people
    .filter((p) => p.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <View style={{ paddingBottom: 10 }}>
        <SearchInput value={q} onChangeText={setQ} placeholder={t('searchName')} autoCorrect={false} />
      </View>
      <View style={{ borderWidth: 1, borderColor: C.line, borderRadius: 12, overflow: 'hidden' }}>
        <ScrollView style={{ maxHeight: height * 0.44 }} keyboardShouldPersistTaps="handled">
          {list.length ? (
            list.map((p, i) => (
              <Row key={p.id} last={i === list.length - 1} onPress={() => onPick(p.id)}>
                <Avatar name={p.name} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt w={600} size={16.5} numberOfLines={1}>
                    {p.name}
                  </Txt>
                </View>
                <BalChip b={bal(txns, p.id)} settledLabel={t('settled')} />
              </Row>
            ))
          ) : (
            <Empty desc={t('noMatch')} />
          )}
        </ScrollView>
      </View>
      <Btn label={t('newPerson')} kind="ghost" icon={<PlusIcon color={C.greenDeep} />} onPress={onNew} />
    </Sheet>
  );
}
