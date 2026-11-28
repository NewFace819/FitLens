import { useEffect, useRef, useState } from 'react';
import { usePreventRemove } from '@react-navigation/native';
import { Alert, AppState, StyleSheet, Text, View } from 'react-native';
import { useAppNavigation, useAppRoute } from '../navigation';
import { getLastSets } from '../modules/history/history';
import {
  advanceClock,
  actOnSession,
  applyLastSets,
  lastSetEdits,
  setElapsedMs,
  type ActiveTraining,
} from '../modules/training/session-model';
import {
  beginWorkout,
  completeWorkout,
  discardTraining,
  getActiveTraining,
  saveActiveTraining,
} from '../modules/training/training-service';
import { isDurationTarget, type TrainingAction } from '../modules/training/training-model';
import { getExercise } from '../modules/workouts/exercises';
import { getStore } from '../modules/workouts/store';
import { getSession, getWeekSchedule } from '../modules/workouts/schedule';
import { toDateKey, weekStartOf } from '../shared/dates';
import { storageReady } from '../shared/storage';
import { Button, Divider, Screen, TopBar } from '../ui/components';
import SafetyNotice from '../ui/safety-notice';
import { colors, space, type } from '../ui/theme';
import TrainingSetRow from './training-set-row';
import {
  applyCameraReps,
  cameraTargetFor,
  cameraTargetReps,
  type CameraTarget,
} from '../modules/training/camera-handoff';
import { supportsSquat } from '../modules/camera/camera-session';

const time = (ms: number) =>
  `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(
    2,
    '0',
  )}`;

export default function WorkoutScreen() {
  const nav = useAppNavigation();
  const params = useAppRoute<'Workout'>().params;
  const selectedId = params?.session ?? params?.workout;
  const selectionKey = selectedId ? `${params?.session ? 'session' : 'workout'}:${selectedId}` : null;
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
  const [notice, setNotice] = useState('');
  const [acceptedSelection, setAcceptedSelection] = useState<{ activeId: string; key: string } | null>(null);
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
  const acceptSelection = (activeId: string) => {
    if (selectionKey) setAcceptedSelection({ activeId, key: selectionKey });
  };
  const begin = async (
    input: { workout?: string; session?: string },
    replace?: ActiveTraining,
  ) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      const next = await beginWorkout(input, undefined, Date.now(), replace);
      acceptSelection(next.id);
      publish(next);
      setAck(next.revision);
    } catch (e) {
      message(e);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  // Opening Workout with a chosen workout or session starts it straight away. Runs once per
  // selection; an existing workout still goes through the resume/discard choice below.
  const handledSelection = useRef<string | null>(null);
  useEffect(() => {
    if (!selectionKey || handledSelection.current === selectionKey) return;
    handledSelection.current = selectionKey;
    if (current.current || initial.error || !storageReady() || !params) return;
    begin(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionKey]);
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
      nav.replace('CheckIn', { history: completedHistory, fromWorkout: true });
    }
  }, [completedHistory, busy, pending, session, nav]);

  // Camera hand-off (#32): remember which set opened Camera, then fill that set's
  // reps when Camera returns `cameraReps` (routes.ts). Manual entry is unchanged.
  const cameraTarget = useRef<CameraTarget | null>(null);
  const latestChange = useRef(change);
  latestChange.current = change;
  const openCamera = (setIndex: number) => {
    const live = current.current;
    const target = live && !busyRef.current ? cameraTargetFor(live, setIndex) : null;
    if (!live || !target) return;
    cameraTarget.current = target;
    const planned = live.training.exercises[target.exerciseIndex];
    const targetReps = cameraTargetReps(planned.targetReps);
    nav.navigate('Camera', {
      exerciseId: planned.exerciseId,
      ...(targetReps ? { targetReps } : {}),
    });
  };
  const cameraReps = params?.cameraReps;
  useEffect(() => {
    if (cameraReps === undefined) return;
    // Clear it so the same count returned again later is still a change.
    nav.setParams({ cameraReps: undefined });
    const target = cameraTarget.current;
    cameraTarget.current = null;
    if (!current.current) {
      setError('There is no active workout for this camera count.');
      return;
    }
    latestChange.current(s => applyCameraReps(s, target, cameraReps, Date.now()));
  }, [cameraReps, nav]);

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
  const timed = isDurationTarget(exercise?.targetReps);
  // Only offer the camera where it can count (squats today, see camera-session.ts).
  const cameraCounts = !!exercise && !timed && supportsSquat(exercise.exerciseId);
  const exerciseIndex = view?.training.exerciseIndex;
  useEffect(() => setNotice(''), [exerciseIndex]);
  const lastSets = exercise ? getLastSets(exercise.exerciseId) : [];
  const canUseLastSets =
    exercise !== undefined && lastSetEdits(exercise, lastSets).length > 0;
  const terminal = !!session?.finishedAt;
  const locked = busy || terminal || session?.training.phase === 'paused';
  const matchesSelection = params?.session
    ? session?.sessionId === params.session
    : session?.sessionId === null && session.workoutId === params?.workout;
  const showConflict = !!session && !!selectionKey && !matchesSelection &&
    !(acceptedSelection?.activeId === session.id && acceptedSelection.key === selectionKey);
  const selectedWorkoutId = showConflict
    ? params?.session ? getSession(params.session)?.workoutId : params?.workout
    : undefined;
  const selectedTitle = selectedWorkoutId ? getStore().getWorkout(selectedWorkoutId)?.title : undefined;
  const schedules = getWeekSchedule(weekStartOf(toDateKey(new Date()))).filter(
    s => s.status === 'planned',
  );
  // Timers live in the fixed footer so they stay visible while the set list is scrolled.
  // Rest is not counted down; the set timer restarts when a set is completed.
  const timerFooter =
    session && view && exercise && !showConflict && !terminal ? (
      <View style={styles.timerBar} accessibilityLiveRegion="none">
        <View style={styles.timerCell}>
          <Text style={type.caption}>This set</Text>
          <Text style={type.big} accessibilityLabel={`This set ${time(setElapsedMs(view))}`}>
            {time(setElapsedMs(view))}
          </Text>
        </View>
        <View style={styles.timerCell}>
          <Text style={type.caption}>Total</Text>
          <Text style={type.big} accessibilityLabel={`Total ${time(view.elapsedMs)}`}>
            {time(view.elapsedMs)}
          </Text>
        </View>
      </View>
    ) : undefined;
  return (
    <Screen footer={timerFooter}>
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
      {session && params && showConflict ? (
        <View style={styles.stack}>
          <Text style={type.title}>A workout is in progress</Text>
          <Text style={type.body}>
            {terminal ? `${session.title} still needs to be saved.` : `${session.title} is still active.`}{' '}
            {selectedTitle ? `You selected ${selectedTitle}.` : 'You selected a different workout.'}
          </Text>
          <Button
            title={terminal ? 'Return to save current workout' : 'Resume current workout'}
            disabled={busy}
            onPress={() => acceptSelection(session.id)}
          />
          {!terminal ? (
            <>
              <Text style={type.caption}>Starting the selected workout discards the current workout and its sets.</Text>
              <Button
                title="Discard and start selected workout"
                variant="danger"
                disabled={busy || !storageReady() || !selectedTitle}
                onPress={() => { begin(params, session); }}
              />
            </>
          ) : null}
        </View>
      ) : session && view && exercise ? (
        <View style={styles.stack}>
          <Text style={type.title}>{session.title}</Text>
          {!terminal && !exercise.sets.some(set => set.done) && view.training.exerciseIndex === 0 ? (
            <SafetyNotice />
          ) : null}
          <Text style={type.caption}>
            {session.training.phase === 'paused' ? 'Paused · ' : ''}
            {pending || busy
              ? 'Saving…'
              : dirty
              ? 'Not saved — retry below'
              : 'Saved on device'}
          </Text>
          <Text style={type.caption}>
            Background time counts. Pause to freeze the timers.
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
          {exercise.sets.map((set, index) => (
            <TrainingSetRow
              key={`${view.training.exerciseIndex}-${index}`}
              set={set}
              index={index}
              locked={locked}
              timed={timed}
              onEdit={values =>
                act({ type: 'editSet', setIndex: index, ...values })
              }
              onUndo={() => act({ type: 'undoSet', setIndex: index })}
              onCamera={cameraCounts ? () => openCamera(index) : undefined}
              onComplete={values =>
                change(s =>
                  actOnSession(
                    actOnSession(
                      s,
                      { type: 'editSet', setIndex: index, ...values },
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
            title={canUseLastSets ? 'Use last time' : 'No sets to reuse'}
            disabled={locked || !canUseLastSets}
            variant="secondary"
            onPress={() => {
              const filled = lastSetEdits(exercise, lastSets).length;
              change(s => applyLastSets(s, lastSets, Date.now()));
              setNotice(`Filled ${filled} unfinished set${filled === 1 ? '' : 's'} from last time.`);
            }}
          />
          {notice ? <Text style={type.caption}>{notice}</Text> : null}
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
            title={
              exercise.sets.some(s => !s.done)
                ? 'Next exercise (skip unfinished sets)'
                : 'Next exercise'
            }
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
            <View style={styles.stack}>
              <Text style={type.body}>
                Your workout has stopped. Do not continue through pain.
              </Text>
              <SafetyNotice />
            </View>
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
          <SafetyNotice />
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
          <Button title="Workout history" variant="text" onPress={() => nav.navigate('History')} />
        </View>
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  stack: { gap: space.md },
  timerBar: { flexDirection: 'row', gap: space.md },
  timerCell: { flex: 1 },
  error: { color: colors.danger, marginVertical: space.sm },
});
