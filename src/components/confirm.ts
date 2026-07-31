import { Alert, Platform } from 'react-native';

/* One confirm helper for destructive actions. Alert.alert is a no-op on web,
   so fall back to window.confirm there. */
export function confirm(message: string, onOk: () => void, okLabel = 'OK') {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    if (typeof window !== 'undefined' && window.confirm(message)) onOk();
    return;
  }
  Alert.alert('', message, [
    { text: 'Cancel', style: 'cancel' },
    { text: okLabel, style: 'destructive', onPress: onOk },
  ]);
}
