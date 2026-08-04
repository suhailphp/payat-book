import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useData } from '../data';
import { fmt, type Forecast } from '../lib';
import { C, RADIUS, SHADOW } from '../theme';
import { HostIcon } from './Icons';
import { CountUp } from './anim';
import { Txt } from './UI';

/* Compact – [If 80% come] + stepper. 10% steps, 10–100%. Its buttons capture
   their own taps so an enclosing "open detail" Pressable doesn't also fire. */
export function AttendanceStepper({
  attendance,
  onChange,
}: {
  attendance: number;
  onChange: (a: number) => void;
}) {
  const { tp } = useData();
  const pct = Math.round(attendance * 100);
  const step = (delta: number) => onChange(Math.max(0.1, Math.min(1, Math.round((attendance + delta) * 10) / 10)));
  return (
    <View style={st.stepper}>
      <Pressable
        onPress={() => step(-0.1)}
        disabled={pct <= 10}
        accessibilityLabel="−10%"
        style={({ pressed }) => [st.stepBtn, pressed && { backgroundColor: C.greenTint }, pct <= 10 && { opacity: 0.35 }]}
      >
        <Txt w={700} size={22} color={C.greenDeep}>
          −
        </Txt>
      </Pressable>
      <Txt w={600} size={14.5} color={C.ink} num style={{ flex: 1, textAlign: 'center' }}>
        {tp('forecastAttendance', { p: pct })}
      </Txt>
      <Pressable
        onPress={() => step(0.1)}
        disabled={pct >= 100}
        accessibilityLabel="+10%"
        style={({ pressed }) => [st.stepBtn, pressed && { backgroundColor: C.greenTint }, pct >= 100 && { opacity: 0.35 }]}
      >
        <Txt w={700} size={22} color={C.greenDeep}>
          ＋
        </Txt>
      </Pressable>
    </View>
  );
}

/* "If I host now" forecast card — gold-bordered (estimate, not real money),
   one hero number with the range as a quiet footnote. Tappable → detail sheet. */
export function ForecastCard({
  forecast,
  attendance,
  onAttendance,
  onPress,
}: {
  forecast: Forecast;
  attendance: number;
  onAttendance: (a: number) => void;
  onPress: () => void;
}) {
  const { t, tp } = useData();
  return (
    <Pressable onPress={onPress} style={st.card}>
      <View style={st.strip}>
        <HostIcon size={18} color={C.greenDeep} />
        <Txt w={700} size={14.5} color={C.greenDeep} style={{ letterSpacing: 0.3 }}>
          {t('forecastTitle')}
        </Txt>
      </View>
      <View style={{ padding: 16, alignItems: 'center' }}>
        <CountUp value={forecast.expected} format={fmt} w={700} size={32} color={C.greenDeep} />
        <Txt size={13.5} color={C.inkSoft} style={{ marginTop: 2, textAlign: 'center' }}>
          {tp('forecastFrom', { n: forecast.peopleCount })}
        </Txt>
        <Txt size={13} color={C.inkSoft} num style={{ marginTop: 6, textAlign: 'center' }}>
          {tp('forecastRangeLbl', { low: fmt(forecast.low), high: fmt(forecast.high) })}
        </Txt>
        <View style={{ alignSelf: 'stretch', marginTop: 12 }}>
          <AttendanceStepper attendance={attendance} onChange={onAttendance} />
        </View>
        <Txt size={12.5} color={C.inkSoft} style={{ marginTop: 12, textAlign: 'center' }}>
          {t(forecast.observed > 0 ? 'forecastNoteLearned' : 'forecastNote')}
        </Txt>
      </View>
    </Pressable>
  );
}

const st = StyleSheet.create({
  card: {
    backgroundColor: C.paper,
    borderWidth: 2,
    borderColor: C.gold,
    borderRadius: RADIUS,
    overflow: 'hidden',
    ...SHADOW,
  },
  strip: {
    backgroundColor: C.goldSoft,
    paddingVertical: 9,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.gold,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.cotton,
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 12,
    padding: 4,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
