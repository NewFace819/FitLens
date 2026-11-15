/**
 * FitLens (Android). Workouts and Plan, using the same pure-JS models as the browser prototype.
 * @format
 */

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { createAppStore } from './src/core/appStore';
import type { KeyValueBackend } from './src/core/persistentStorage';
import type { AppStore } from './src/core/types';
import PlanScreen from './src/screens/PlanScreen';
import WorkoutsScreen from './src/screens/WorkoutsScreen';
import { colors } from './src/ui/theme';

type Tab = 'workouts' | 'plan';

/** `backend` and `today` are only passed by tests; the app uses device storage and the real date. */
function App({ backend, today }: { backend?: KeyValueBackend; today?: string }) {
  const [store, setStore] = useState<AppStore | null>(null);
  const [tab, setTab] = useState<Tab>('workouts');

  useEffect(() => {
    let alive = true;
    createAppStore(backend).then(h => {
      if (alive) {
        setStore(h.store);
      }
    });
    return () => {
      alive = false;
    };
  }, [backend]);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.root}>
        {store === null ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.text} />
          </View>
        ) : (
          <View style={styles.root}>
            <View style={styles.body}>
              {tab === 'workouts' ? <WorkoutsScreen store={store} /> : <PlanScreen store={store} today={today} />}
            </View>
            <View style={styles.tabs} accessibilityRole="tablist">
              {(['workouts', 'plan'] as const).map(t => (
                <Pressable
                  key={t}
                  testID={`tab-${t}`}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: tab === t }}
                  style={styles.tab}
                  onPress={() => setTab(t)}>
                  <Text style={[styles.tabText, tab === t && styles.tabOn]}>
                    {t === 'workouts' ? 'Workouts' : 'Plan'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.card },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  tabText: { fontSize: 14, fontWeight: '800', color: colors.muted },
  tabOn: { color: colors.text },
});

export default App;
