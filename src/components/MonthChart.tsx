import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';
import type { Lang } from '../i18n';
import { fmt, MonthBucket } from '../lib';
import { C } from '../theme';
import { Txt } from './UI';
import { useReducedMotion } from '../hooks/useReducedMotion';

/* ~160 total: 140 of bars + baseline, labels row below */
const CHART_H = 140;
const BAR_AREA_TOP = 8;
const BASELINE = CHART_H - 1;

const monthInitial = (key: string, lang: Lang): string => {
  const d = new Date(key + '-01T00:00');
  try {
    const short = d.toLocaleDateString(lang === 'ml' ? 'ml-IN' : 'en-IN', { month: 'short' });
    return Array.from(short)[0] ?? '';
  } catch {
    return key.slice(5);
  }
};

/* Grouped bar chart, last N months: received = green, given = gold.
   Drawn with react-native-svg directly so the web build stays safe.
   Tapping a month shows its totals in the caption line. */
export function MonthChart({
  buckets,
  lang,
  receivedLabel,
  givenLabel,
}: {
  buckets: MonthBucket[];
  lang: Lang;
  receivedLabel: string;
  givenLabel: string;
}) {
  const [width, setWidth] = useState(0);
  const [sel, setSel] = useState(buckets.length - 1);
  const reduced = useReducedMotion();

  /* bars grow from the baseline, staggered left→right (~420ms each);
     one driver value, per-group windows derived from it */
  const [progress, setProgress] = useState(0);
  const driver = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) {
      setProgress(1);
      return;
    }
    const id = driver.addListener(({ value }) => setProgress(value));
    Animated.timing(driver, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      driver.removeListener(id);
      setProgress(1);
    });
    return () => driver.removeListener(id);
  }, [reduced, driver]);
  const groupProgress = (i: number) => {
    const start = (i / Math.max(1, buckets.length - 1)) * 0.4;
    return Math.min(1, Math.max(0, (progress - start) / 0.6));
  };

  const max = Math.max(1, ...buckets.flatMap((b) => [b.in, b.out]));
  const groupW = width > 0 ? width / buckets.length : 0;
  const barW = Math.max(6, Math.min(16, (groupW - 20) / 2));
  const gap = 3;
  const scale = (v: number) => (v / max) * (BASELINE - BAR_AREA_TOP);

  const selected = buckets[sel] ?? buckets[buckets.length - 1];

  return (
    <View onLayout={(ev) => setWidth(ev.nativeEvent.layout.width)}>
      {width > 0 ? (
        <View>
          <Svg width={width} height={CHART_H}>
            <Line x1={0} y1={BASELINE + 0.5} x2={width} y2={BASELINE + 0.5} stroke={C.line} strokeWidth={1} />
            {buckets.map((b, i) => {
              const cx = i * groupW + groupW / 2;
              const g = groupProgress(i);
              const hIn = scale(b.in) * g;
              const hOut = scale(b.out) * g;
              return (
                <React.Fragment key={b.key}>
                  {b.in > 0 ? (
                    <Rect
                      x={cx - barW - gap / 2}
                      y={BASELINE - hIn}
                      width={barW}
                      height={hIn}
                      rx={4}
                      fill={C.green}
                      opacity={i === sel ? 1 : 0.75}
                    />
                  ) : null}
                  {b.out > 0 ? (
                    <Rect
                      x={cx + gap / 2}
                      y={BASELINE - hOut}
                      width={barW}
                      height={hOut}
                      rx={4}
                      fill={C.gold}
                      opacity={i === sel ? 1 : 0.75}
                    />
                  ) : null}
                </React.Fragment>
              );
            })}
          </Svg>
          {/* tap targets over each month group */}
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: CHART_H, flexDirection: 'row' }}>
            {buckets.map((b, i) => (
              <Pressable key={b.key} style={{ flex: 1 }} onPress={() => setSel(i)} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', marginTop: 4 }}>
            {buckets.map((b, i) => (
              <View key={b.key} style={{ flex: 1, alignItems: 'center' }}>
                <Txt w={i === sel ? 700 : 600} size={12} color={i === sel ? C.greenDeep : C.inkSoft}>
                  {monthInitial(b.key, lang)}
                </Txt>
              </View>
            ))}
          </View>
          <Txt size={13.5} color={C.inkSoft} num style={{ textAlign: 'center', marginTop: 8 }}>
            {receivedLabel} <Txt w={700} size={13.5} color={C.green} num>{fmt(selected.in)}</Txt>
            {'  ·  '}
            {givenLabel} <Txt w={700} size={13.5} color={C.red} num>{fmt(selected.out)}</Txt>
          </Txt>
        </View>
      ) : null}
    </View>
  );
}
