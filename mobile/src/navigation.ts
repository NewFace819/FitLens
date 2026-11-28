import { useCallback, useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from './shared/routes';

export type IntroductionStackParamList = {
  Welcome: undefined;
  NameEntry: undefined;
  Greeting: undefined;
  HealthIntro: undefined;
  NotificationsIntro: undefined;
};

export type AppNavigation = NativeStackNavigationProp<
  RootStackParamList & IntroductionStackParamList
>;

export const useAppNavigation = () => useNavigation<AppNavigation>();

export function useAppRoute<T extends keyof RootStackParamList>() {
  return useRoute<RouteProp<RootStackParamList, T>>();
}

/**
 * Hook to run an effect when the current screen is focused,
 * cleaning it up when the screen blurs or unmounts.
 */
export function useFocusEffect(effect: () => (() => void) | void) {
  const nav = useAppNavigation();

  useEffect(() => {
    let isFocused = false;
    let cleanup: (() => void) | void;

    const runEffect = () => {
      if (cleanup) cleanup();
      cleanup = effect();
      isFocused = true;
    };

    const stopEffect = () => {
      if (cleanup) {
        cleanup();
        cleanup = undefined;
      }
      isFocused = false;
    };

    if (typeof nav?.isFocused !== 'function' || nav.isFocused()) {
      runEffect();
    }

    const unsubFocus =
      typeof nav?.addListener === 'function'
        ? nav.addListener('focus', () => {
            if (isFocused) return;
            runEffect();
          })
        : undefined;

    const unsubBlur =
      typeof nav?.addListener === 'function'
        ? nav.addListener('blur', () => {
            stopEffect();
          })
        : undefined;

    return () => {
      stopEffect();
      unsubFocus?.();
      unsubBlur?.();
    };
  }, [effect, nav]);
}

export const useAppFocusEffect = useFocusEffect;

/**
 * Attaches a hardware back press listener only while the screen is focused,
 * removing it when the screen blurs or unmounts.
 */
export function useScopedBackHandler(handler: () => boolean) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        return handlerRef.current();
      });
      return () => sub.remove();
    }, [])
  );
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
