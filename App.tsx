import React, { useEffect } from 'react';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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
import { C, FONT } from './src/theme';
import { HomeIcon, PeopleIcon, EnvIcon, PayHandsIcon } from './src/components/Icons';
import { ToastHost } from './src/components/Toast';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { PeopleScreen } from './src/screens/PeopleScreen';
import { PersonScreen } from './src/screens/PersonScreen';
import { PayattsScreen } from './src/screens/PayattsScreen';
import { PaymentsScreen } from './src/screens/PaymentsScreen';
import { EventScreen } from './src/screens/EventScreen';
import type { RootParams, TabParams } from './src/nav';

SplashScreen.preventAutoHideAsync().catch(() => {});

const Tab = createBottomTabNavigator<TabParams>();
const Stack = createNativeStackNavigator<RootParams>();

function Tabs() {
  const { t } = useData();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.green,
        tabBarInactiveTintColor: C.inkSoft,
        tabBarStyle: { backgroundColor: C.paper, borderTopColor: C.line, borderTopWidth: 1, height: 62 },
        tabBarLabelStyle: { fontFamily: FONT.semibold, fontSize: 12.5 },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{ title: t('tabBook'), tabBarIcon: ({ color }) => <HomeIcon color={color} /> }}
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

  if (!ready || !fontsLoaded) return null;

  if (!meta.ownerName) return <OnboardingScreen />;

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen name="Person" component={PersonScreen} />
        <Stack.Screen name="Event" component={EventScreen} />
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
        <ToastHost />
      </DataProvider>
    </SafeAreaProvider>
  );
}
