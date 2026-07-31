import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { C, FAB_SHADOW, FONT, RADIUS, SHADOW } from '../theme';
import { fmt, initials } from '../lib';
import { PlusIcon } from './Icons';

type Weight = 400 | 500 | 600 | 700;
const family = (w: Weight) =>
  w === 700 ? FONT.bold : w === 600 ? FONT.semibold : w === 400 ? FONT.regular : FONT.medium;

export function Txt({
  w = 500,
  size = 17,
  color = C.ink,
  num = false,
  style,
  children,
  ...rest
}: {
  w?: Weight;
  size?: number;
  color?: string;
  num?: boolean;
  style?: StyleProp<TextStyle>;
  children?: React.ReactNode;
} & React.ComponentProps<typeof Text>) {
  return (
    <Text
      {...rest}
      style={[
        { fontFamily: family(w), fontSize: size, color, lineHeight: size * 1.5 },
        num && { fontVariant: ['tabular-nums'] },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export const Card = ({ style, children }: { style?: StyleProp<ViewStyle>; children?: React.ReactNode }) => (
  <View style={[st.card, style]}>{children}</View>
);

export function Row({
  onPress,
  last,
  children,
  style,
}: {
  onPress?: () => void;
  last?: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const inner = [st.row, !last && st.rowBorder, style];
  if (!onPress) return <View style={inner}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [inner, pressed && { backgroundColor: C.cotton }]}>
      {children}
    </Pressable>
  );
}

export const Avatar = ({ name, emoji }: { name?: string; emoji?: string }) => (
  <View style={[st.avatar, emoji ? { borderRadius: 12 } : null]}>
    <Txt w={700} size={18} color={C.greenDeep}>
      {emoji ?? initials(name || '?')}
    </Txt>
  </View>
);

/* Balance chip: green "₹X ▸" to receive, red "◂ ₹X" to give, outline = settled. */
export function BalChip({ b, settledLabel }: { b: number; settledLabel: string }) {
  if (b > 0)
    return (
      <View style={[st.chip, { backgroundColor: C.greenTint }]}>
        <Txt w={700} size={15} color={C.greenDeep} num>{fmt(b)} ▸</Txt>
      </View>
    );
  if (b < 0)
    return (
      <View style={[st.chip, { backgroundColor: C.redTint }]}>
        <Txt w={700} size={15} color={C.red} num>◂ {fmt(b)}</Txt>
      </View>
    );
  return (
    <View style={[st.chip, st.chipZero]}>
      <Txt w={700} size={15} color={C.inkSoft}>{settledLabel}</Txt>
    </View>
  );
}

export function StatusChip({ label, kind }: { label: string; kind: 'gold' | 'pos' | 'zero' | 'neg' }) {
  const bg = kind === 'gold' ? C.goldSoft : kind === 'pos' ? C.greenTint : kind === 'neg' ? C.redTint : C.cotton;
  const fg = kind === 'gold' ? C.greenDeep : kind === 'pos' ? C.greenDeep : kind === 'neg' ? C.red : C.inkSoft;
  return (
    <View
      style={[
        st.chip,
        { backgroundColor: bg },
        kind === 'gold' && { borderWidth: 1, borderColor: C.gold },
        kind === 'zero' && st.chipZero,
      ]}
    >
      <Txt w={700} size={15} color={fg} num>{label}</Txt>
    </View>
  );
}

export function Btn({
  label,
  onPress,
  kind = 'primary',
  icon,
  style,
  flex,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'ghost' | 'gold' | 'wa' | 'danger';
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  flex?: boolean;
}) {
  const bg = kind === 'primary' ? C.green : kind === 'wa' ? C.whatsapp : C.paper;
  const pressedBg = kind === 'primary' ? C.greenDeep : kind === 'wa' ? '#178F49' : C.cotton;
  const fg = kind === 'primary' || kind === 'wa' ? '#fff' : kind === 'danger' ? C.red : C.greenDeep;
  const border =
    kind === 'ghost'
      ? { borderWidth: 1.5, borderColor: C.green }
      : kind === 'gold'
        ? { borderWidth: 1.5, borderColor: C.gold }
        : kind === 'danger'
          ? { borderWidth: 1.5, borderColor: C.red }
          : null;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [st.btn, { backgroundColor: pressed ? pressedBg : bg }, border, flex && { flex: 1 }, style]}
    >
      {icon}
      <Txt w={700} size={16.5} color={fg} style={{ textAlign: 'center' }}>
        {label}
      </Txt>
    </Pressable>
  );
}

export const Empty = ({ title, desc }: { title?: string; desc: string }) => (
  <View style={{ paddingVertical: 32, paddingHorizontal: 20, alignItems: 'center' }}>
    {title ? (
      <Txt w={700} size={16.5} style={{ marginBottom: 4, textAlign: 'center' }}>
        {title}
      </Txt>
    ) : null}
    <Txt size={15} color={C.inkSoft} style={{ textAlign: 'center' }}>
      {desc}
    </Txt>
  </View>
);

export const SecTitle = ({ children }: { children: string }) => (
  <Txt
    w={700}
    size={13.5}
    color={C.inkSoft}
    style={{ letterSpacing: 1, textTransform: 'uppercase', marginTop: 26, marginBottom: 10, marginHorizontal: 2 }}
  >
    {children}
  </Txt>
);

export function Field({
  label,
  hint,
  ...input
}: { label: string; hint?: string } & TextInputProps) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Txt w={700} size={13} color={C.inkSoft} style={{ letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 5 }}>
        {label}
      </Txt>
      <TextInput
        placeholderTextColor={C.inkSoft}
        {...input}
        style={[st.input, input.style]}
      />
      {hint ? (
        <Txt size={13.5} color={C.inkSoft} style={{ marginTop: 6 }}>
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

export function Seg({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={st.seg}>
      {options.map((o) => (
        <Pressable
          key={o.value}
          onPress={() => onChange(o.value)}
          style={[st.segBtn, o.value === value && { backgroundColor: C.green }]}
        >
          <Txt w={700} size={15} color={o.value === value ? '#fff' : C.inkSoft}>
            {o.label}
          </Txt>
        </Pressable>
      ))}
    </View>
  );
}

export const SearchInput = (props: TextInputProps) => (
  <TextInput placeholderTextColor={C.inkSoft} {...props} style={[st.input, { paddingVertical: 12 }, props.style]} />
);

export function ChipBtn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={st.chipBtn}>
      <Txt w={700} size={14.5} color={C.greenDeep} num>
        {label}
      </Txt>
    </Pressable>
  );
}

/* Segmented card styling for virtualized list rows: each row draws the card's
   side borders; the first/last rows add the rounded top/bottom. Lets FlatList
   rows look like one PWA-style card without a wrapping <Card>. */
export const listCardWrap = (index: number, count: number): ViewStyle => ({
  backgroundColor: C.paper,
  borderColor: C.line,
  borderLeftWidth: 1,
  borderRightWidth: 1,
  overflow: 'hidden',
  ...(index === 0 && {
    borderTopWidth: 1,
    borderTopLeftRadius: RADIUS,
    borderTopRightRadius: RADIUS,
  }),
  ...(index === count - 1 && {
    borderBottomWidth: 1,
    borderBottomLeftRadius: RADIUS,
    borderBottomRightRadius: RADIUS,
  }),
});

export function Fab({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel="Add"
      style={({ pressed }) => [st.fab, { backgroundColor: pressed ? C.greenDeep : C.green }]}
    >
      <PlusIcon size={28} />
    </Pressable>
  );
}

export function MiniAddBtn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [st.addmini, { backgroundColor: pressed ? C.greenDeep : C.green }]}
    >
      <Txt w={700} size={14} color="#fff">
        ＋ {label}
      </Txt>
    </Pressable>
  );
}

const st = StyleSheet.create({
  card: {
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: RADIUS,
    overflow: 'hidden',
    ...SHADOW,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: C.line },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: C.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  chipZero: { backgroundColor: C.cotton, borderWidth: 1, borderColor: C.line },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 14,
    marginTop: 14,
    minHeight: 52,
  },
  input: {
    backgroundColor: C.cotton,
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    fontSize: 17,
    fontFamily: FONT.medium,
    color: C.ink,
  },
  seg: {
    flexDirection: 'row',
    backgroundColor: C.cotton,
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  segBtn: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  chipBtn: {
    borderWidth: 1.5,
    borderColor: C.gold,
    backgroundColor: C.goldSoft,
    paddingVertical: 8,
    paddingHorizontal: 13,
    borderRadius: 999,
  },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 18,
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...FAB_SHADOW,
  },
  addmini: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999 },
});
