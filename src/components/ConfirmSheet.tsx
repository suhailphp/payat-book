import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useData } from '../data';
import { C } from '../theme';
import { Sheet } from './Sheet';
import { Btn, Txt } from './UI';

/* Themed replacement for window.confirm / Alert.alert. Promise-based:
     const ok = await confirmSheet({ message: t('qDelEntry'), destructive: true });
   One ConfirmHost is mounted at app root; it opens its own Modal, so it
   stacks above any sheet that triggered it. Pure RN — identical on web. */

export type ConfirmOpts = {
  title?: string; // defaults to qConfirmTitle
  message: string;
  confirmLabel?: string; // defaults to qDelete
  destructive?: boolean; // red outline when true, green solid otherwise
};

type Pending = { opts: ConfirmOpts; resolve: (ok: boolean) => void };

let emit: ((p: Pending) => void) | null = null;

export function confirmSheet(opts: ConfirmOpts): Promise<boolean> {
  return new Promise((resolve) => {
    if (emit) emit({ opts, resolve });
    else resolve(false);
  });
}

export function ConfirmHost() {
  const { t } = useData();
  const [pending, setPending] = useState<Pending | null>(null);
  /* kept through the close animation so content doesn't vanish mid-slide */
  const [opts, setOpts] = useState<ConfirmOpts | null>(null);

  useEffect(() => {
    emit = (p) => {
      setPending((cur) => {
        cur?.resolve(false);
        return p;
      });
      setOpts(p.opts);
    };
    return () => {
      emit = null;
    };
  }, []);

  const finish = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };

  return (
    <Sheet
      visible={!!pending}
      onClose={() => finish(false)}
      title={opts?.title ?? t('qConfirmTitle')}
      scrollable={false}
    >
      {opts ? (
        <View>
          <Txt size={15.5} color={C.inkSoft} style={{ marginBottom: 4 }}>
            {opts.message}
          </Txt>
          <Btn
            label={opts.confirmLabel ?? t('qDelete')}
            kind={opts.destructive ? 'danger' : 'primary'}
            onPress={() => finish(true)}
          />
          <Pressable
            onPress={() => finish(false)}
            style={({ pressed }) => [
              {
                minHeight: 48,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 14,
                marginTop: 6,
              },
              pressed && { backgroundColor: C.cotton },
            ]}
          >
            <Txt w={600} size={16} color={C.inkSoft}>
              {t('qCancel')}
            </Txt>
          </Pressable>
        </View>
      ) : null}
    </Sheet>
  );
}
