/**
 * Stack routes for Hải's screens. The screens take the store as a prop (so tests can pass their
 * own); in the app it is the one store bound to shared storage.
 */
import { SafeAreaView } from 'react-native-safe-area-context';
import { getStore } from '../modules/workouts/store';
import { useStore } from '../ui/use-store';
import { colors } from '../ui/theme';
import PlanScreen from './PlanScreen';
import WorkoutsScreen from './WorkoutsScreen';

const style = { flex: 1, backgroundColor: colors.background };

export function WorkoutsRoute() {
  useStore();
  return (
    <SafeAreaView style={style} edges={['top', 'bottom']}>
      <WorkoutsScreen store={getStore()} />
    </SafeAreaView>
  );
}

export function PlanRoute() {
  useStore();
  return (
    <SafeAreaView style={style} edges={['top', 'bottom']}>
      <PlanScreen store={getStore()} />
    </SafeAreaView>
  );
}
