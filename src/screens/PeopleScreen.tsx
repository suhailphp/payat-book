import React, { useState } from 'react';
import { FlatList, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useData } from '../data';
import { bal } from '../lib';
import { C } from '../theme';
import { KasavuHeader } from '../components/Header';
import { Avatar, BalChip, Card, Empty, Fab, listCardWrap, Row, SearchInput, Txt } from '../components/UI';
import { SettingsSheet } from '../sheets/SettingsSheet';
import { PersonFormSheet } from '../sheets/PersonFormSheet';
import type { RootNav } from '../nav';

export function PeopleScreen() {
  const nav = useNavigation<RootNav>();
  const { t, people, txns } = useData();
  const [q, setQ] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const list = people
    .filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <View style={{ flex: 1, backgroundColor: C.cotton }}>
      <KasavuHeader onGear={() => setSettingsOpen(true)} />
      <FlatList
        data={list}
        keyExtractor={(p) => String(p.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingTop: 22, paddingBottom: 96 }}
        ListHeaderComponent={
          <View style={{ paddingBottom: 10 }}>
            <SearchInput value={q} onChangeText={setQ} placeholder={t('searchPeople')} autoCorrect={false} />
          </View>
        }
        renderItem={({ item: p, index }) => (
          <View style={listCardWrap(index, list.length)}>
            <Row last={index === list.length - 1} onPress={() => nav.navigate('Person', { id: p.id })}>
              <Avatar name={p.name} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt w={600} size={16.5} numberOfLines={1}>
                  {p.name}
                </Txt>
                <Txt size={13.5} color={C.inkSoft} num numberOfLines={1}>
                  {p.phone || t('noNumber')}
                </Txt>
              </View>
              <BalChip b={bal(txns, p.id)} settledLabel={t('settled')} />
            </Row>
          </View>
        )}
        ListEmptyComponent={
          <Card>
            <Empty title={t('emptyPeopleT')} desc={t('emptyPeopleD')} />
          </Card>
        }
      />
      <Fab onPress={() => setAddOpen(true)} />
      <SettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <PersonFormSheet visible={addOpen} onClose={() => setAddOpen(false)} />
    </View>
  );
}
