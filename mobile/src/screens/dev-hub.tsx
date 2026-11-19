/**
 * TEMPORARY dev hub (route 'Home') so Tu's and Hải's screens can be opened before Home + dock exist.
 * Home and navigation belong to Đỗ Huy — replace this file when Home lands.
 */
import { Alert, StyleSheet, Text, View } from 'react-native';
import { latestUnreviewed } from '../modules/checkin/checkin';
import { getHistory } from '../modules/history/history';
import { getMascotMood } from '../modules/mascot/mascot';
import { getRhythm } from '../modules/rhythm/rhythm';
import { resetSampleData } from '../shared/seed';
import { useAppNavigation, type AppNavigation } from '../navigation';
import { Button, Divider, ListRow, Mascot, Screen } from '../ui/components';
import { space, type } from '../ui/theme';
import { useStore } from '../ui/use-store';

function openCheckIn(nav: AppNavigation) {
  const entry = latestUnreviewed() ?? getHistory()[0];
  if (!entry) {
    Alert.alert('No finished session yet', 'Reset the sample data first.');
    return;
  }
  nav.navigate('CheckIn', { history: entry.id });
}

export default function DevHub() {
  useStore();
  const nav = useAppNavigation();
  const rhythm = getRhythm();
  return (
    <Screen>
      <View style={styles.header}>
        <Mascot mood={getMascotMood()} size={96} />
        <Text style={type.eyebrow}>FitLens · dev hub</Text>
        <Text style={type.title}>Workouts, Plan & Check-in</Text>
        <Text style={type.caption}>Temporary entry point until Home and the dock are ready.</Text>
      </View>
      <ListRow
        label="Your rhythm"
        detail={`${rhythm.thisWeek.length} of ${rhythm.goal} · ${rhythm.streakWeeks} wk`}
        onPress={() => nav.navigate('Rhythm')}
      />
      <ListRow label="Workout reminders" detail="This week" onPress={() => nav.navigate('Reminders')} />
      <ListRow label="Start or resume workout" detail="Training" onPress={() => nav.navigate('Training')} />
      <ListRow label="Post-workout check-in" detail="Latest session" onPress={() => openCheckIn(nav)} />
      <ListRow label="Workouts" detail="Library & builder" onPress={() => nav.navigate('Workouts')} />
      <ListRow label="Weekly plan" detail="Draft & schedule" onPress={() => nav.navigate('Plan')} />
      <Divider />
      <Text style={[type.eyebrow, { marginBottom: space.sm }]}>Sample data · synthetic</Text>
      <Button
        title="Reset sample data"
        variant="secondary"
        onPress={() =>
          Alert.alert('Reset sample data?', 'This clears every FitLens key on this device and loads the samples again.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Reset', style: 'destructive', onPress: () => resetSampleData() },
          ])
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'flex-start', gap: space.sm, paddingTop: space.xxl, paddingBottom: space.xl },
});
