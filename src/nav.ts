import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type TabParams = {
  HomeTab: undefined;
  PeopleTab: undefined;
  PayattsTab: undefined;
};

export type RootParams = {
  Tabs: NavigatorScreenParams<TabParams> | undefined;
  Person: { id: number };
  Event: { id: number };
};

export type RootNav = NativeStackNavigationProp<RootParams>;
