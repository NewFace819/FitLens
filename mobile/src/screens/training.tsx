import { useEffect, useRef, useState } from 'react';
import { usePreventRemove } from '@react-navigation/native';
import {
  Alert,
  AppState,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAppNavigation, useAppRoute } from '../navigation';
import { getHistory, getLastSets } from '../modules/history/history';
import {
  advanceClock,
  actOnSession,
  extendRest,
  applyLastSets,
  type ActiveTraining,
} from '../modules/training/session-model';
import {
  beginWorkout,
  completeWorkout,
  discardTraining,
  getActiveTraining,
  saveActiveTraining,
} from '../modules/training/training-service';
import type { TrainingAction } from '../modules/training/training-model';
import { getExercise } from '../modules/workouts/exercises';
import { getStore } from '../modules/workouts/store';
import { getWeekSchedule } from '../modules/workouts/schedule';
import { toDateKey, weekStartOf } from '../shared/dates';
import { storageReady } from '../shared/storage';
import { Button, Divider, ListRow, Screen, TopBar } from '../ui/components';
import { colors, space, type } from '../ui/theme';
import TrainingSetRow from './training-set-row';

const time = (ms: number) =>
  `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(
    2,
    '0',
  )}`;

export default function TrainingScreen() {
  const nav = useAppNavigation();
  const params = useAppRoute<'Training'>().params;
  const [initial] = useState(() => {
    try {
      return { session: getActiveTraining(), error: '' };
    } catch (e) {
      return {
        session: null,
        error: e instanceof Error ? e.message : 'Saved workout needs recovery.',
      };
    }
  });
  const [session, setSession] = useState<ActiveTraining | null>(
    initial.session,
  );
  const current = useRef(session);
  const [error, setError] = useState(initial.error);
  const [pending, setPending] = useState(0);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [ack, setAck] = useState(initial.session?.revision ?? 0);
  const [now, setNow] = useState(Date.now());
  const [rest, setRest] = useState('');
  const dirty = session !== null && ack < session.revision;
  usePreventRemove(dirty || pending > 0 || busy, () => {
    Alert.alert(
      'Workout not saved yet',
      'Wait for saving to finish, or retry the save before leaving.',
    );
  });

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    const listener = AppState.addEventListener('change', () =>
      setNow(Date.now()),
    );
    return () => {
      clearInterval(timer);
      listener.remove();
    };
  }, []);

  const publish = (next: ActiveTraining | null) => {
    current.current = next;
    setSession(next);
    setNow(Date.now());
  };
  const message = (e: unknown) =>
    setError(e instanceof Error ? e.message : 'Could not save. Please retry.');
  const persist = async (next: ActiveTraining) => {
    setPending(n => n + 1);
    try {
      await saveActiveTraining(next);
      setAck(n => Math.max(n, next.revision));
      if (current.current?.revision === next.revision) setError('');
    } catch (e) {
      message(e);
    } finally {
      setPending(n => n - 1);
    }
  };
  const change = (update: (s: ActiveTraining) => ActiveTraining) => {
    if (!current.current || busyRef.current) return;
    try {
      const next = update(current.current);
      publish(next);
      persist(next);
    } catch (e) {
      message(e);
    }
  };
  const act = (action: TrainingAction) =>
    change(s => actOnSession(s, action, Date.now()));
  const begin = async (input: { workout?: string; session?: string }) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      if (rest !== '' && !/^\d+$/.test(rest))
        throw new Error('Enter a whole rest duration in seconds.');
      const next = await beginWorkout(input, rest === '' ? undefined : Number(rest));
      publish(next);
      setAck(next.revision);
    } catch (e) {
      message(e);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  const finish = async (pain = false) => {
    if (!current.current || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      const next = current.current.finishedAt
        ? current.current
        : actOnSession(
            current.current,
            { type: pain ? 'stopByPain' : 'finish' },
            Date.now(),
          );
      publish(next); // Pain stops immediately, even when the device save later fails.
      const result = await completeWorkout(next);
      publish(null);
      setAck(0);
      busyRef.current = false;
      setBusy(false);
      if (result.missingSession)
        Alert.alert(
          'Workout saved',
          'The calendar session no longer exists. Your result is safe.',
        );
      // Navigate after this render releases the unsaved-changes guard.
      if (result.history) setCompletedHistory(result.history.id);
      else
        Alert.alert(
          'Workout ended',
          'No completed sets were recorded. Your schedule was not marked done.',
        );
    } catch (e) {
      message(e);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  const [completedHistory, setCompletedHistory] = useState<string | null>(null);
  useEffect(() => {
    if (completedHistory && !busy && pending === 0 && !session) {
      nav.replace('CheckIn', { history: completedHistory });
    }
  }, [completedHistory, busy, pending, session, nav]);

  const discard = () =>
    Alert.alert(
      'Discard this workout?',
      'Its sets will not be added to history.',
      [
        { text: 'Keep workout', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: async () => {
            if (!current.current || busyRef.current || pending) return;
            busyRef.current = true;
            setBusy(true);
            try {
              await discardTraining(current.current.id);
              publish(null);
              setAck(0);
              setError('');
            } catch (e) {
              message(e);
            } finally {
              busyRef.current = false;
              setBusy(false);
            }
          },
        },
      ],
    );

  const view = session ? advanceClock(session, now) : null;
  const exercise = view?.training.exercises[view.training.exerciseIndex];
  const terminal = !!session?.finishedAt;
  const locked = busy || terminal || session?.training.phase === 'paused';
  const schedules = getWeekSchedule(weekStartOf(toDateKey(new Date()))).filter(
    s => s.status === 'planned',
  );
  return (
    <Screen>
      <TopBar title="Workout" />
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      {!storageReady() ? (
        <Text style={styles.error}>
          Saved data could not be loaded. Reopen the app to retry before
          starting a workout.
        </Text>
      ) : null}
      {session && view && exercise ? (
        <View style={styles.stack}>
          <Text style={type.title}>{session.title}</Text>
          <Text style={type.caption}>
            {time(view.elapsedMs)} elapsed ·{' '}
            {pending || busy
              ? 'Saving…'
              : dirty
              ? 'Not saved — retry below'
              : 'Saved on device'}
          </Text>
          <Text style={type.caption}>
            Background time counts. Pause to freeze both timers.
          </Text>
          <Text style={type.h2}>
            {view.training.exerciseIndex + 1}/{view.training.exercises.length} ·{' '}
            {getExercise(exercise.exerciseId)?.name ?? exercise.exerciseId}
          </Text>
          {exercise.targetReps ? (
            <Text style={type.caption}>
              Target: {exercise.targetReps} per set. Record what you
              actually complete.
            </Text>
          ) : null}
          {session.training.phase === 'rest' ? (
            <View style={styles.stack}>
              <Text style={type.big}>{time(view.restMs)}</Text>
              <Text style={type.caption}>
                {view.restMs ? 'Rest between sets' : 'Ready when you are'}
              </Text>
              <Button
                title="Skip rest"
                disabled={busy}
                variant="secondary"
                onPress={() => act({ type: 'skipRest' })}
              />
              <Button
                title="Add 15 seconds"
                disabled={busy}
                variant="secondary"
                onPress={() => change(s => extendRest(s, 15, Date.now()))}
              />
            </View>
          ) : null}
          {exercise.sets.map((set, index) => (
            <TrainingSetRow
              key={`${view.training.exerciseIndex}-${index}`}
              set={set}
              index={index}
              locked={locked}
              onEdit={(kg, reps) =>
                act({ type: 'editSet', setIndex: index, kg, reps })
              }
              onUndo={() => act({ type: 'undoSet', setIndex: index })}
              onComplete={(kg, reps) =>
                change(s =>
                  actOnSession(
                    actOnSession(
                      s,
                      { type: 'editSet', setIndex: index, kg, reps },
                      Date.now(),
                    ),
                    { type: 'completeSet', setIndex: index },
                    Date.now(),
                  ),
                )
              }
            />
          ))}
          <Button
            title="Add set"
            disabled={locked}
            variant="secondary"
            onPress={() => act({ type: 'addSet' })}
          />
          <Button
            title={
              getLastSets(exercise.exerciseId).length
                ? 'Use last time'
                : 'No previous sets'
            }
            disabled={locked || !getLastSets(exercise.exerciseId).length}
            variant="secondary"
            onPress={() =>
              change(s =>
                applyLastSets(s, getLastSets(exercise.exerciseId), Date.now()),
              )
            }
          />
          <Button
            title={session.training.phase === 'paused' ? 'Resume' : 'Pause'}
            disabled={busy || terminal}
            variant="secondary"
            onPress={() =>
              act({
                type: session.training.phase === 'paused' ? 'resume' : 'pause',
              })
            }
          />
          <Button
            title="Next exercise (skip unfinished sets)"
            disabled={
              locked ||
              view.training.exerciseIndex === view.training.exercises.length - 1
            }
            variant="secondary"
            onPress={() => act({ type: 'nextExercise' })}
          />
          {dirty && !terminal ? (
            <Button
              title="Retry saving workout"
              disabled={pending > 0 || busy}
              onPress={() => {
                if (current.current) persist(current.current);
              }}
            />
          ) : null}
          <Button
            title={terminal ? 'Retry saving result' : 'Finish workout'}
            disabled={busy || pending > 0}
            onPress={() => {
              finish();
            }}
          />
          {!terminal ? (
            <Button
              title="Stop — I feel pain"
              variant="danger"
              disabled={busy}
              onPress={() => {
                finish(true);
              }}
            />
          ) : null}
          {session.training.phase === 'stopped' ? (
            <Text style={type.body}>
              Your workout has stopped. Do not continue through pain.
            </Text>
          ) : null}
          {!terminal ? (
            <Button
              title="Discard workout"
              variant="text"
              disabled={busy || pending > 0}
              onPress={discard}
            />
          ) : null}
        </View>
      ) : (
        <View style={styles.stack}>
          <Text style={type.title}>Start a workout</Text>
          <Text style={type.caption}>Rest override in seconds (blank uses workout plan)</Text>
          <TextInput
            accessibilityLabel="Rest between sets in seconds"
            style={styles.input}
            keyboardType="number-pad"
            value={rest}
            onChangeText={setRest}
            editable={!busy}
          />
          {params?.workout || params?.session ? (
            <Button
              title="Start selected workout"
              disabled={busy || !!initial.error || !storageReady()}
              onPress={() => {
                begin(params);
              }}
            />
          ) : null}
          {getStore().listWorkouts().map(workout => (
            <Button
              key={workout.id}
              title={workout.title}
              variant="secondary"
              disabled={busy || !!initial.error || !storageReady()}
              onPress={() => {
                begin({ workout: workout.id });
              }}
            />
          ))}
          <Divider />
          <Text style={type.h2}>This week’s planned sessions</Text>
          {schedules.length ? (
            schedules.map(s => (
              <Button
                key={s.id}
                title={`${s.date} · ${s.time ?? 'Any time'}`}
                variant="secondary"
                disabled={busy || !!initial.error || !storageReady()}
                onPress={() => {
                  begin({ session: s.id });
                }}
              />
            ))
          ) : (
            <Text style={type.caption}>No planned sessions this week.</Text>
          )}
          <Divider />
          <Text style={type.h2}>Recent workouts</Text>
          {getHistory()
            .slice(0, 10)
            .map(h => (
              <ListRow
                key={h.id}
                label={`${h.date} · ${h.sets.length} sets${
                  h.stoppedByPain ? ' · Stopped for pain' : ''
                }`}
                detail="Check-in"
                onPress={() => nav.navigate('CheckIn', { history: h.id })}
              />
            ))}
        </View>
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  stack: { gap: space.md },
  error: { color: colors.danger, marginVertical: space.sm },
  input: {
    minHeight: 48,
    padding: space.md,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.line,
  },
});
