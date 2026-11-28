/** Home route replaces the temporary dev hub without changing App.tsx or shared routes. */
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  Text,
  View,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
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
import { getStrength, strengthHint } from '../modules/mascot/strength';
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
    rhythm = getRhythm(),
    strength = getStrength();
  const next = getNextSession();
  const plans = getWeekSchedule(weekStartOf(date))
    .filter(session => session.status === 'planned')
    .map(session => ({
      id: session.id,
      date: session.date,
      name: getWorkout(session.workoutId)?.title ?? 'Workout',
      exercises: getWorkout(session.workoutId)?.items.length,
      time: session.time,
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
          onAccount={() => nav.navigate('Profile')}
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
        {next && !plans.some(p => p.date === date && p.id === next.id) && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View plan"
            onPress={() => nav.navigate('Plan')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              padding: 18,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: '#dce3d4',
              backgroundColor: '#eeefe7',
            }}
          >
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 15,
                backgroundColor: '#dce6d1',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="plan" />
            </View>
            <View style={{ flex: 1, gap: 5 }}>
              <Text
                style={{ fontSize: 10, color: colors.muted, letterSpacing: 1 }}
              >
                UP NEXT
              </Text>
              <Text style={s.heading}>
                {getWorkout(next.workoutId)?.title ?? 'Workout'}
              </Text>
              <Text style={{ fontSize: 12, color: colors.muted }}>
                {next.date}
                {next.time ? ' · ' + next.time : ''}
              </Text>
            </View>
            <Icon name="right" size={16} />
          </Pressable>
        )}
        <View
          style={{
            gap: 14,
            padding: 20,
            borderRadius: 24,
            backgroundColor: '#eeefe7',
          }}
        >
          <View style={s.row}>
            <Text style={s.heading}>Your rhythm</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              {rhythm.streakWeeks} week streak
            </Text>
          </View>
          <Text style={s.body}>
            {rhythm.thisWeek.length} of {rhythm.goal} sessions this week
            {rhythm.paused ? ' · Paused' : ''}
          </Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {Array.from({ length: rhythm.goal }, (_, i) => (
              <View
                key={i}
                style={{
                  height: 6,
                  flex: 1,
                  borderRadius: 3,
                  backgroundColor:
                    i < rhythm.thisWeek.length ? '#739067' : '#dce2d4',
                }}
              />
            ))}
          </View>
          <View testID="home-strength" style={{ gap: 6 }}>
            <View style={s.row}>
              <Text style={s.body}>
                Strength · Level {strength.level} {strength.name}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                {strengthHint(strength)}
              </Text>
            </View>
            <View
              accessibilityRole="progressbar"
              accessibilityLabel="Progress to the next strength level"
              accessibilityValue={{ min: 0, max: 100, now: Math.round(strength.progress * 100) }}
              style={{ height: 6, borderRadius: 3, backgroundColor: '#dce2d4' }}
            >
              <View
                style={{
                  height: 6,
                  borderRadius: 3,
                  width: `${Math.round(strength.progress * 100)}%`,
                  backgroundColor: '#c9822f',
                }}
              />
            </View>
          </View>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              borderTopWidth: 1,
              borderTopColor: '#dce2d4',
              paddingTop: 4,
            }}
          >
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
        </View>
        <Button
          label="Start or resume workout"
          onPress={() => nav.navigate('Workout')}
        />
        <Button
          quiet
          label="Workout history"
          onPress={() => nav.navigate('History')}
        />
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
          <View
            style={{
              alignSelf: 'center',
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: '#cdd6c5',
              marginTop: 10,
            }}
          />
          <View style={{ alignItems: 'flex-end', paddingHorizontal: 12 }}>
            <Button quiet label="Close ×" onPress={() => setOverlay(null)} />
          </View>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            >
              {overlay === 'activity' ? (
                <ActivityForm
                  key={logDate}
                  date={logDate}
                  save={save}
                  enabled
                />
              ) : overlay === 'steps' ? (
                <StepsScreen />
              ) : null}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
