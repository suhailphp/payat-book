import React from 'react';
import { useWindowDimensions, View } from 'react-native';
import { useData } from '../data';
import { fmt, type Forecast } from '../lib';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';
import { SearchableList } from '../components/SearchableList';
import { AttendanceStepper } from '../components/ForecastCard';
import { Avatar, BalChip, Empty, Row, Txt } from '../components/UI';

/* Detail of the host forecast: each invited person, their balance, and the
   expected payback with a ×multiplier tag — gold when learned from their own
   history, plain grey when it's a fallback estimate. */
export function ForecastSheet({
  visible,
  forecast,
  attendance,
  onAttendance,
  onClose,
  onPickPerson,
}: {
  visible: boolean;
  forecast: Forecast;
  attendance: number;
  onAttendance: (a: number) => void;
  onClose: () => void;
  onPickPerson: (id: number) => void;
}) {
  const { t, tp } = useData();
  const { height } = useWindowDimensions();

  return (
    <Sheet visible={visible} onClose={onClose} title={t('forecastTitle')} scrollable={false}>
      <SearchableList
        data={forecast.perPerson}
        keyOf={(p) => String(p.personId)}
        searchKeys={['name']}
        placeholder={t('searchName')}
        listStyle={{ maxHeight: height * 0.5 }}
        empty={<Empty desc={t('noMatch')} />}
        header={
          <View style={{ marginBottom: 12 }}>
            <Txt size={13.5} color={C.inkSoft} num style={{ textAlign: 'center', marginBottom: 10 }}>
              {tp('forecastRangeLbl', { low: fmt(forecast.low), high: fmt(forecast.high) })}
            </Txt>
            <AttendanceStepper attendance={attendance} onChange={onAttendance} />
          </View>
        }
        renderRow={(p, index, count) => (
          <Row last={index === count - 1} onPress={() => onPickPerson(p.personId)}>
            <Avatar name={p.name} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt w={600} size={16.5} numberOfLines={1}>
                {p.name}
              </Txt>
              <View style={{ flexDirection: 'row', marginTop: 2 }}>
                <BalChip b={p.balance} settledLabel={t('settled')} />
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Txt w={700} size={16} color={C.greenDeep} num>
                {fmt(p.expected)}
              </Txt>
              <View
                style={{
                  marginTop: 3,
                  paddingVertical: 1,
                  paddingHorizontal: 7,
                  borderRadius: 999,
                  borderWidth: 1,
                  backgroundColor: p.fromHistory ? C.goldSoft : C.cotton,
                  borderColor: p.fromHistory ? C.gold : C.line,
                }}
              >
                <Txt w={700} size={12} color={p.fromHistory ? C.greenDeep : C.inkSoft} num>
                  ×{p.multiplier.toFixed(1)}
                </Txt>
              </View>
            </View>
          </Row>
        )}
      />
    </Sheet>
  );
}
