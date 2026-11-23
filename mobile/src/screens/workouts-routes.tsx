import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../shared/routes';
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

export function WorkoutsRoute({ navigation }: NativeStackScreenProps<RootStackParamList, 'Workouts'>) {
  useStore();
  return (
    <SafeAreaView style={style} edges={['top', 'bottom']}>
      <WorkoutsScreen store={getStore()} onStart={workout => navigation.navigate('Workout', { workout })} />
    </SafeAreaView>
  );
}

export function PlanRoute({ navigation }: NativeStackScreenProps<RootStackParamList, 'Plan'>) {
  useStore();
  return (
    <SafeAreaView style={style} edges={['top', 'bottom']}>
      <PlanScreen store={getStore()} onStart={session => navigation.navigate('Workout', { session })} />
    </SafeAreaView>
  );
}
