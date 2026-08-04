import React, { useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useData } from '../data';
import { bal } from '../lib';
import { C } from '../theme';
import { KasavuHeader } from '../components/Header';
import { Avatar, BalChip, Empty, Fab, Row, Txt } from '../components/UI';
import { SearchableList } from '../components/SearchableList';
import { SettingsSheet } from '../sheets/SettingsSheet';
import { PersonFormSheet } from '../sheets/PersonFormSheet';
import type { RootNav } from '../nav';

export function PeopleScreen() {
  const nav = useNavigation<RootNav>();
  const { t, people, txns } = useData();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const list = [...people].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <View style={{ flex: 1, backgroundColor: C.cotton }}>
      <KasavuHeader onGear={() => setSettingsOpen(true)} />
      <SearchableList
        data={list}
        keyOf={(p) => String(p.id)}
        searchKeys={['name', 'ref']}
        placeholder={t('searchPeople')}
        contentContainerStyle={{ padding: 16, paddingTop: 22, paddingBottom: 96 }}
        empty={<Empty title={t('emptyPeopleT')} desc={t('emptyPeopleD')} />}
        renderRow={(p, index, count) => (
          <Row last={index === count - 1} onPress={() => nav.navigate('Person', { id: p.id })}>
            <Avatar name={p.name} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt w={600} size={16.5} numberOfLines={1}>
                {p.name}
              </Txt>
              <Txt size={13.5} color={C.inkSoft} num numberOfLines={1}>
                {[p.phone || t('noNumber'), p.ref].filter(Boolean).join(' · ')}
              </Txt>
            </View>
            <BalChip b={bal(txns, p.id)} settledLabel={t('settled')} />
          </Row>
        )}
      />
      <Fab onPress={() => setAddOpen(true)} />
      <SettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <PersonFormSheet visible={addOpen} onClose={() => setAddOpen(false)} />
    </View>
  );
}
