import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { dstr } from '../lib';
import type { Lang } from '../i18n';
import { C, FONT } from '../theme';
import { Txt } from './UI';
import { CalendarIcon } from './Icons';

const isoLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/* The one date input for the whole app. Value in/out is always the
   normalized YYYY-MM-DD string we store.
   Native: themed field showing the localized date (dstr) with a calendar
   icon; tap opens the platform date picker.
   Web: <input type="date"> styled to match the themed fields. */
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

  return (
    <View style={{ marginBottom: 14 }}>
      <Txt w={700} size={13} color={C.inkSoft} style={{ letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 5 }}>
        {label}
      </Txt>
      {Platform.OS === 'web' ? (
        <input
          type="date"
          value={value}
          onChange={(e) => {
            if (e.target.value) onChange(e.target.value);
          }}
          style={{
            backgroundColor: C.cotton,
            border: `1.5px solid ${C.line}`,
            borderRadius: 12,
            padding: '13px 14px',
            fontSize: 17,
            fontFamily: `${FONT.medium}, sans-serif`,
            color: C.ink,
            width: '100%',
            boxSizing: 'border-box',
            outline: 'none',
          }}
        />
      ) : (
        <>
          <Pressable
            onPress={() => setShowPicker(true)}
            accessibilityLabel={label}
            style={({ pressed }) => [st.field, pressed && { borderColor: C.green }]}
          >
            <Txt num>{dstr(value, lang)}</Txt>
            <CalendarIcon />
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
  field: {
    backgroundColor: C.cotton,
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
