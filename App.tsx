import React, { useEffect } from 'react';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  BalooChettan2_400Regular,
  BalooChettan2_500Medium,
  BalooChettan2_600SemiBold,
  BalooChettan2_700Bold,
} from '@expo-google-fonts/baloo-chettan-2';
import { DataProvider, useData } from './src/data';
import { DriveAutoBackup } from './src/DriveAutoBackup';
import { C, FONT } from './src/theme';
import { HomeIcon, DashboardIcon, PeopleIcon, EnvIcon, PayHandsIcon } from './src/components/Icons';
import { ToastHost } from './src/components/Toast';
import { ConfirmHost } from './src/components/ConfirmSheet';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { BookScreen } from './src/screens/BookScreen';
import { AboutScreen } from './src/screens/AboutScreen';
import { PeopleScreen } from './src/screens/PeopleScreen';
import { PersonScreen } from './src/screens/PersonScreen';
import { PayattsScreen } from './src/screens/PayattsScreen';
import { PaymentsScreen } from './src/screens/PaymentsScreen';
import { EventScreen } from './src/screens/EventScreen';
import { navigationRef, RootParams, TabParams } from './src/nav';
import { notificationsSupported, setupNotifications } from './src/notifications';
import * as ExpoNotifications from 'expo-notifications';

SplashScreen.preventAutoHideAsync().catch(() => {});

const Tab = createBottomTabNavigator<TabParams>();
const Stack = createNativeStackNavigator<RootParams>();

function Tabs() {
  const { t } = useData();
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.green,
        tabBarInactiveTintColor: C.inkSoft,
        /* Lift the bar above the system nav area: on 3-button-nav devices
           insets.bottom is the tall nav bar, on gesture-nav it's the slim
           hint. The paper background fills the whole height (including the
           inset) so there's no gap stripe, and the 6px keeps the labels off
           the nav bar. Explicit height + paddingBottom override React
           Navigation's own inset handling, so gesture phones don't double-pad. */
        tabBarStyle: {
          backgroundColor: C.paper,
          borderTopColor: C.line,
          borderTopWidth: 1,
          height: 62 + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom + 6,
        },
        /* minHeight gives the single-line label box room for descenders: on
           web React Navigation truncates the label with overflow:hidden, and
           Baloo Chettan 2's tight metrics leave the intrinsic line box ~11px,
           shearing the tails of p/y/g ("People", "Payatts", "Payments").
           (On web only lineHeight/padding don't grow that box — minHeight does;
           native labels already fit, so this is a harmless floor there.) */
        tabBarLabelStyle: { fontFamily: FONT.semibold, fontSize: 12.5, minHeight: 16 },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{ title: t('tabDashboard'), tabBarIcon: ({ color }) => <DashboardIcon color={color} /> }}
      />
      <Tab.Screen
        name="BookTab"
        component={BookScreen}
        options={{ title: t('tabBookPage'), tabBarIcon: ({ color }) => <HomeIcon color={color} /> }}
      />
      <Tab.Screen
        name="PeopleTab"
        component={PeopleScreen}
        options={{ title: t('tabPeople'), tabBarIcon: ({ color }) => <PeopleIcon color={color} /> }}
      />
      <Tab.Screen
        name="PayattsTab"
        component={PayattsScreen}
        options={{ title: t('tabPayatts'), tabBarIcon: ({ color }) => <EnvIcon color={color} /> }}
      />
      <Tab.Screen
        name="PaymentsTab"
        component={PaymentsScreen}
        options={{ title: t('tabPayments'), tabBarIcon: ({ color }) => <PayHandsIcon size={26} color={color} /> }}
      />
    </Tab.Navigator>
  );
}

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: C.cotton, card: C.paper, primary: C.green },
};

/* A tapped reminder lands on the Payments tab (where invitations live). */
function goToPayments() {
  if (navigationRef.isReady()) {
    navigationRef.navigate('Tabs', { screen: 'PaymentsTab' });
  } else {
    setTimeout(goToPayments, 400);
  }
}

function Root() {
  const { ready, meta } = useData();
  const [fontsLoaded] = useFonts({
    BalooChettan2_400Regular,
    BalooChettan2_500Medium,
    BalooChettan2_600SemiBold,
    BalooChettan2_700Bold,
  });

  useEffect(() => {
    if (ready && fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [ready, fontsLoaded]);

  useEffect(() => {
    if (!notificationsSupported) return;
    setupNotifications().catch(() => {});
    /* warm start: user taps a reminder while the app is alive */
    const sub = ExpoNotifications.addNotificationResponseReceivedListener(() => goToPayments());
    /* cold start: app launched from a reminder tap */
    ExpoNotifications.getLastNotificationResponseAsync?.()
      .then((r) => {
        if (r) goToPayments();
      })
      .catch(() => {});
    return () => sub.remove();
  }, []);

  if (!ready || !fontsLoaded) return null;

  if (!meta.ownerName) return <OnboardingScreen />;

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen name="Person" component={PersonScreen} />
        <Stack.Screen name="Event" component={EventScreen} />
        <Stack.Screen name="About" component={AboutScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <DataProvider>
        <StatusBar style="dark" />
        <Root />
        <DriveAutoBackup />
        <ConfirmHost />
        <ToastHost />
      </DataProvider>
    </SafeAreaProvider>
  );
}
