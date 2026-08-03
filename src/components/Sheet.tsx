import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Keyboard,
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
import { useReducedMotion } from '../hooks/useReducedMotion';

/* Bottom sheet matching the PWA: scrim, rounded top, drag-handle bar,
   slide-up animation. */
export function Sheet({
  visible,
  onClose,
  title,
  children,
  footer,
  scrollable = true,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /* Pinned below the scroll area, outside it, so the primary action button
     is never clipped by the keyboard and needs no scrolling to reach. */
  footer?: React.ReactNode;
  /* false = plain View content (for sheets holding their own FlatList) */
  scrollable?: boolean;
}) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const y = useRef(new Animated.Value(height)).current;
  const [shown, setShown] = useState(visible);
  const [kb, setKb] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (visible) {
      setShown(true);
      Animated.timing(y, { toValue: 0, duration: reduced ? 0 : 220, useNativeDriver: true }).start();
    } else if (shown) {
      Animated.timing(y, { toValue: height, duration: reduced ? 0 : 200, useNativeDriver: true }).start(() =>
        setShown(false)
      );
    }
  }, [visible]);

  /* RN Modal opens its own full-screen Android window that adjustResize doesn't
     reach, so the keyboard would overlap the sheet. Track the keyboard ourselves
     and lift the whole sheet to sit right above it (works on iOS too). We derive
     the lift from the keyboard's absolute top (`screenY`) against the physical
     screen, not its `height`: under a full-screen (statusBarTranslucent) Modal a
     3-button nav bar sits below the keyboard, and `height` excludes it — which
     would under-lift the sheet by the nav-bar height and clip the footer. */
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = (e: { endCoordinates?: { height?: number; screenY?: number } }) => {
      const c = e.endCoordinates;
      const screenH = Dimensions.get('screen').height;
      const lift =
        c?.screenY != null && c.screenY > 0 ? Math.max(0, screenH - c.screenY) : c?.height ?? 0;
      setKb(lift);
    };
    const s = Keyboard.addListener(showEvt, onShow);
    const h = Keyboard.addListener(hideEvt, () => setKb(0));
    return () => {
      s.remove();
      h.remove();
    };
  }, []);

  if (!shown) return null;
  /* keep the sheet between the status bar and the keyboard; inner scroll views
     handle any overflow so the focused field is always reachable. Use the
     physical screen height to match the full-screen Modal + screenY-based lift. */
  const screenH = Dimensions.get('screen').height;
  const maxHeight = Math.min(screenH * 0.88, screenH - kb - insets.top - 10);
  const padBottom = 20 + (kb > 0 ? 0 : insets.bottom);
  /* When a footer is pinned it carries the bottom safe-area padding; the
     scroll area only needs a little breathing room before it. */
  const scrollPadBottom = footer ? 12 : padBottom;
  const heading = title ? (
    <Txt w={700} size={19} style={{ marginBottom: 14 }}>
      {title}
    </Txt>
  ) : null;
  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={st.scrim} onPress={onClose} />
      <Animated.View style={[st.sheet, { bottom: kb, transform: [{ translateY: y }], maxHeight }]}>
        <View style={st.handle} />
        {scrollable ? (
          <ScrollView
            /* flexShrink lets the ScrollView give up height to the pinned
               footer and become scrollable inside the maxHeight-capped sheet —
               without it the content keeps its full height and just gets
               clipped, hiding whatever sits at the bottom. */
            style={st.scroll}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: scrollPadBottom, flexGrow: 1 }}
          >
            {heading}
            {children}
          </ScrollView>
        ) : (
          <View style={[st.scroll, { paddingHorizontal: 18, paddingBottom: scrollPadBottom }]}>
            {heading}
            {children}
          </View>
        )}
        {footer ? <View style={{ paddingHorizontal: 18, paddingTop: 4, paddingBottom: padBottom }}>{footer}</View> : null}
      </Animated.View>
      <ToastHost />
    </Modal>
  );
}

const st = StyleSheet.create({
  scroll: { flexShrink: 1 },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.scrim },
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
