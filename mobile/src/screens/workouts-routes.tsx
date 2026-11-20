/**
 * Stack routes for Hải's screens: Workouts, WorkoutDetail, Plan. The screens take the store and
 * callbacks as props (so tests can render them alone); navigation lives only here.
 */
import { useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getStore } from '../modules/workouts/store';
import { goBackOrHome, useAppNavigation, useAppRoute } from '../navigation';
import { TopBar } from '../ui/components';
import { colors } from '../ui/theme';
import { useStore } from '../ui/use-store';
import PlanScreen from './PlanScreen';
import WorkoutDetailScreen from './WorkoutDetailScreen';
import WorkoutsScreen from './WorkoutsScreen';

const style = { flex: 1, backgroundColor: colors.background };

export function WorkoutsRoute() {
  useStore();
  const nav = useAppNavigation();
  return (
    <SafeAreaView style={style} edges={['top', 'bottom']}>
      <TopBar title="Workouts" />
      <WorkoutsScreen store={getStore()} onStart={(workout) => nav.navigate('Workout', { workout })} />
    </SafeAreaView>
  );
}

/** One workout, opened from another screen (contract §12 param `workout`). Missing/unknown → back. */
export function WorkoutDetailRoute() {
  useStore();
  const nav = useAppNavigation();
  const workoutId = useAppRoute<'WorkoutDetail'>().params?.workout;
  const exists = !!workoutId && !!getStore().getWorkout(workoutId);
  useEffect(() => {
    if (!exists) goBackOrHome(nav);
  }, [exists, nav]);
  if (!exists) return null;
  return (
    <SafeAreaView style={style} edges={['top', 'bottom']}>
      <WorkoutDetailScreen
        store={getStore()}
        workoutId={workoutId}
        onBack={() => goBackOrHome(nav)}
        onDeleted={() => goBackOrHome(nav)}
        onStart={(workout) => nav.navigate('Workout', { workout })}
      />
    </SafeAreaView>
  );
}

export function PlanRoute() {
  useStore();
  const nav = useAppNavigation();
  return (
    <SafeAreaView style={style} edges={['top', 'bottom']}>
      <TopBar title="Plan" />
      <PlanScreen store={getStore()} onStartSession={(session) => nav.navigate('Workout', { session })} />
    </SafeAreaView>
  );
}
