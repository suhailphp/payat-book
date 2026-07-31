import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { dstr } from '../lib';
import type { Lang } from '../i18n';
import { C, FONT } from '../theme';
import { Txt } from './UI';

const isoLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/* Date field: native opens the platform date picker; web falls back to a
   plain YYYY-MM-DD input (the community datetimepicker throws on web). */
export function DateField({
  label,
  value,
  onChange,
  lang,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  lang: Lang;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [text, setText] = useState(value);

  useEffect(() => setText(value), [value]);

  return (
    <View style={{ marginBottom: 14 }}>
      <Txt w={700} size={13} color={C.inkSoft} style={{ letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 5 }}>
        {label}
      </Txt>
      {Platform.OS === 'web' ? (
        <TextInput
          value={text}
          onChangeText={(v) => {
            setText(v);
            if (/^\d{4}-\d{2}-\d{2}$/.test(v)) onChange(v);
          }}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={C.inkSoft}
          style={st.input}
        />
      ) : (
        <>
          <Pressable onPress={() => setShowPicker(true)} style={st.input}>
            <Txt num>{dstr(value, lang)}</Txt>
          </Pressable>
          {showPicker ? (
            <DateTimePicker
              value={new Date(value + 'T00:00')}
              mode="date"
              onChange={(_e, d) => {
                setShowPicker(false);
                if (d) onChange(isoLocal(d));
              }}
            />
          ) : null}
        </>
      )}
    </View>
  );
}

const st = StyleSheet.create({
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
});
