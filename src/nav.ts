import { createNavigationContainerRef, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type TabParams = {
  HomeTab: undefined;
  PeopleTab: undefined;
  PayattsTab: undefined;
  PaymentsTab: undefined;
};

export type RootParams = {
  Tabs: NavigatorScreenParams<TabParams> | undefined;
  Person: { id: number };
  Event: { id: number };
  About: undefined;
};

export type RootNav = NativeStackNavigationProp<RootParams>;

/* container ref so non-screen code (notification taps) can navigate */
export const navigationRef = createNavigationContainerRef<RootParams>();
