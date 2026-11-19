/** Home route replaces the temporary dev hub without changing App.tsx or shared routes. */
import React, { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppNavigation } from '../navigation';
import {
  getActivities,
  saveActivity,
  type Activity,
} from '../modules/activity/activity';
import { ActivityScreen as ActivityForm } from '../modules/activity/ActivityForm';
import { HomeScreen as HomeView } from '../modules/home/HomeView';
import { HomeDock } from '../modules/home/Dock';
import { StepsScreen } from '../modules/home/StepsView';
import { Icon } from '../modules/home/Icon';
import { Button, styles as s, colors } from '../modules/home/primitives';
import { getHistory } from '../modules/history/history';
import { getRhythm } from '../modules/rhythm/rhythm';
import {
  getNextSession,
  getWeekSchedule,
  getWorkout,
} from '../modules/workouts/schedule';
import { setMascotMood } from '../modules/mascot/mascot';
import { toDateKey, weekStartOf } from '../shared/dates';
import { onStorageError } from '../shared/storage';
import { useStore } from '../ui/use-store';
export default function HomeScreen() {
  useStore();
  const nav = useAppNavigation();
  const [date, setDate] = useState(toDateKey(new Date())),
    [overlay, setOverlay] = useState<'activity' | 'steps' | null>(null),
    [logDate, setLogDate] = useState(date);
  useEffect(
    () => onStorageError(message => Alert.alert('Storage', message)),
    [],
  );
  const activities = getActivities(),
    history = getHistory(),
    rhythm = getRhythm();
  const next = getNextSession();
  const plans = getWeekSchedule(weekStartOf(date))
    .filter(session => session.status === 'planned')
    .map(session => ({
      id: session.id,
      date: session.date,
      name: getWorkout(session.workoutId)?.title ?? 'Workout',
      exercises: getWorkout(session.workoutId)?.items.length,
    }));
  const records: Activity[] = [
    ...activities,
    ...history.map(h => ({
      id: h.id,
      type: 'other' as const,
      name: getWorkout(h.workoutId)?.title ?? 'Workout',
      date: h.date,
      durationSec: h.durationSec,
      distanceKm: null,
      elevationM: null,
      note: '',
      effort: null,
      at: '',
      source: 'manual' as const,
    })),
  ];
  async function save(value: Activity) {
    if (!saveActivity(value)) {
      Alert.alert('Could not save', 'Check activity details and try again.');
      return false;
    }
    setMascotMood('energized');
    setOverlay(null);
    return true;
  }
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.paper }}
      edges={['top', 'bottom']}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open Account"
        onPress={() => nav.navigate('Profile')}
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
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: 24,
          gap: 16,
        }}
      >
        <HomeView
          entries={records}
          plans={plans}
          workouts={history.map(h => ({
            date: h.date,
            durationSec: h.durationSec,
            sets: h.sets.length,
          }))}
          onDateChange={setDate}
          onSession={id => {
            const session = getWeekSchedule(weekStartOf(date)).find(
              item => item.id === id,
            );
            if (session && session.date > toDateKey(new Date()))
              nav.navigate('Plan');
            else nav.navigate('Workout', { session: id });
          }}
          go={destination =>
            destination === 'steps'
              ? setOverlay('steps')
              : nav.navigate(destination === 'plan' ? 'Plan' : 'Workouts')
          }
          onLog={day => {
            setLogDate(day);
            setOverlay('activity');
          }}
          error={false}
          retry={() => {}}
        />
        {next && (
          <View style={s.card}>
            <Text style={s.heading}>Up next</Text>
            <Text style={s.body}>
              {getWorkout(next.workoutId)?.title ?? 'Workout'} · {next.date}
              {next.time ? ' · ' + next.time : ''}
            </Text>
            <Button
              quiet
              label="View plan"
              onPress={() => nav.navigate('Plan')}
            />
          </View>
        )}
        <View style={s.card}>
          <Text style={s.heading}>Your rhythm</Text>
          <Text style={s.body}>
            {rhythm.thisWeek.length} of {rhythm.goal} sessions ·{' '}
            {rhythm.streakWeeks} week streak{rhythm.paused ? ' · Paused' : ''}
          </Text>
          <Button
            quiet
            label="View rhythm"
            onPress={() => nav.navigate('Rhythm')}
          />
          <Button
            quiet
            label="Reminders"
            onPress={() => nav.navigate('Reminders')}
          />
        </View>
        <Button
          quiet
          label="Camera setup"
          onPress={() => nav.navigate('Camera', { exerciseId: 'goblet-squat' })}
        />
        {__DEV__ && (
          <Button
            quiet
            label="Welcome introduction"
            onPress={() => nav.navigate('Welcome')}
          />
        )}
      </ScrollView>
      <HomeDock />
      <Modal
        visible={overlay !== null}
        animationType="slide"
        onRequestClose={() => setOverlay(null)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }}>
          <Button quiet label="Close" onPress={() => setOverlay(null)} />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          >
            {overlay === 'activity' ? (
              <ActivityForm key={logDate} date={logDate} save={save} enabled />
            ) : overlay === 'steps' ? (
              <StepsScreen />
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
