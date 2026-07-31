import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '../theme';
import { Txt } from './UI';
import { ToastHost } from './Toast';

/* Bottom sheet matching the PWA: scrim, rounded top, drag-handle bar,
   slide-up animation. */
export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const y = useRef(new Animated.Value(height)).current;
  const [shown, setShown] = useState(visible);

  useEffect(() => {
    if (visible) {
      setShown(true);
      Animated.timing(y, { toValue: 0, duration: 220, useNativeDriver: true }).start();
    } else if (shown) {
      Animated.timing(y, { toValue: height, duration: 200, useNativeDriver: true }).start(() => setShown(false));
    }
  }, [visible]);

  if (!shown) return null;
  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={st.scrim} onPress={onClose} />
        <Animated.View style={[st.sheet, { transform: [{ translateY: y }], maxHeight: height * 0.88 }]}>
          <View style={st.handle} />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 20 + insets.bottom }}
          >
            {title ? (
              <Txt w={700} size={19} style={{ marginBottom: 14 }}>
                {title}
              </Txt>
            ) : null}
            {children}
          </ScrollView>
        </Animated.View>
        <ToastHost />
      </KeyboardAvoidingView>
    </Modal>
  );
}

const st = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: C.scrim },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: C.paper,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 10,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: C.line,
    alignSelf: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
});
