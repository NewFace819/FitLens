import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from './shared/routes';

export type AppNavigation = NativeStackNavigationProp<RootStackParamList>;

export const useAppNavigation = () => useNavigation<AppNavigation>();

export function useAppRoute<T extends keyof RootStackParamList>() {
  return useRoute<RouteProp<RootStackParamList, T>>();
}

/** Back if possible, otherwise to Home (contract §12: bad params → parent page). */
export function goBackOrHome(nav: AppNavigation) {
  if (nav.canGoBack()) nav.goBack();
  else nav.navigate('Home');
}

/** Return to Home (the first screen) without stacking another copy. */
export function goHome(nav: AppNavigation) {
  if (nav.canGoBack()) nav.popToTop();
  else nav.navigate('Home');
}
