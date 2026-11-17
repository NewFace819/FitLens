import React, { useEffect, useState } from 'react';
import {
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  ScrollView,
  StatusBar,
  Text,
  View,
  Pressable,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from './src/Icon';
import { HomeScreen } from './src/HomeScreen';
import { StepsScreen } from './src/StepsScreen';
import { CameraScreen } from './src/CameraScreen';
import { ActivityScreen } from './src/ActivityScreen';
import { Entry, readEntries, writeEntries, today } from './src/activityModel';
import { Route, routes, tabs } from './src/routes';
import { setMascotMood } from './src/mascot';
import { Button, colors, styles as s } from './src/ui';
export default function App() {
  return (
    <SafeAreaProvider>
      <Content />
    </SafeAreaProvider>
  );
}
function Content() {
  const [stack, setStack] = useState<Route[]>(['home']),
    [entries, setEntries] = useState<Entry[]>([]),
    [error, setError] = useState(false),
    [loaded, setLoaded] = useState(false),
    [logDate, setLogDate] = useState(today());
  const route = stack[stack.length - 1];
  const go = (next: Route) => setStack(previous => [...previous, next]);
  const back = () =>
    setStack(previous =>
      previous.length > 1 ? previous.slice(0, -1) : previous,
    );
  const load = () => {
    setError(false);
    setLoaded(false);
    readEntries()
      .then(setEntries)
      .catch(() => setError(true))
      .finally(() => setLoaded(true));
  };
  useEffect(load, []);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length === 1) return false;
      back();
      return true;
    });
    return () => sub.remove();
  }, [stack.length]);
  const log = (date: string) => {
    setLogDate(date);
    go('activity');
  };
  async function save(entry: Entry) {
    try {
      const next = [entry, ...entries];
      await writeEntries(next);
      setEntries(next);
      setMascotMood('energized');
      back();
      return true;
    } catch {
      Alert.alert(
        'Could not save',
        'Your activity has not been saved. Please try again.',
      );
      return false;
    }
  }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }}>
      <StatusBar barStyle="dark-content" />
      {route !== 'home' && (
        <View style={[s.row, { paddingHorizontal: 20, minHeight: 48 }]}>
          <Button quiet label="‹ Back" onPress={back} />
        </View>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open Account"
        onPress={() => go('profile')}
        style={{
          position: 'absolute',
          top: 48,
          right: 20,
          zIndex: 3,
          width: 44,
          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: '#e6c9b7',
            backgroundColor: '#f5e4d7',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="profile" size={20} color="#a65536" />
        </View>
      </Pressable>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
        <ScrollView
          key={route}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 32,
            gap: 16,
            width: '100%',
            maxWidth: 600,
            alignSelf: 'center',
          }}
        >
          {route === 'home' ? (
            <HomeScreen
              entries={entries}
              go={go}
              onLog={log}
              error={error}
              retry={load}
            />
          ) : route === 'steps' ? (
            <StepsScreen />
          ) : route === 'camera' ? (
            <CameraScreen onBack={back} />
          ) : route === 'activity' ? (
            <>
              <ActivityScreen
                date={logDate}
                save={save}
                enabled={loaded && !error}
              />
              {error && <Button label="Reload activities" onPress={load} />}
            </>
          ) : (
            <>
              <Text style={s.title}>{routes[route]}</Text>
              <Text style={s.body}>
                This module will be connected by its owner.
              </Text>
              {route === 'workouts' && (
                <>
                  <Button label="Log activity" onPress={() => log(today())} />
                  <Button
                    quiet
                    label="Camera setup"
                    onPress={() => go('camera')}
                  />
                </>
              )}
              <Button
                quiet
                label="Back to Today"
                onPress={() => setStack(['home'])}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <View
        accessibilityRole="tablist"
        style={{
          flexDirection: 'row',
          backgroundColor: '#f0f2e9',
          borderRadius: 30,
          marginHorizontal: 20,
          marginBottom: 8,
          padding: 6,
        }}
      >
        {tabs.map(tab => (
          <Pressable
            key={tab}
            accessibilityRole="tab"
            accessibilityState={{
              selected:
                route === tab ||
                (route === 'steps' && tab === 'home') ||
                (route === 'activity' && tab === 'workouts'),
            }}
            onPress={() => setStack([tab])}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: 10,
              gap: 4,
              borderRadius: 24,
              backgroundColor:
                route === tab ||
                (route === 'steps' && tab === 'home') ||
                (route === 'activity' && tab === 'workouts')
                  ? '#e3ead9'
                  : 'transparent',
            }}
          >
            <Icon name={tab} />
            <Text style={{ fontSize: 11, color: colors.ink }}>
              {routes[tab]}
            </Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}
