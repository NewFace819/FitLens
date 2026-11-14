/**
 * TEMPORARY dev hub so Tu's screens can be opened before Home + dock exist.
 * Home and navigation belong to Đỗ Huy — replace this file when Home lands.
 */
import { Alert, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { latestUnreviewed } from '../modules/checkin/checkin.ts';
import { getHistory } from '../modules/history/history.ts';
import { getMascotMood } from '../modules/mascot/mascot.ts';
import { getRhythm } from '../modules/rhythm/rhythm.ts';
import { resetSampleData } from '../shared/seed.ts';
import { ROUTES } from '../shared/routes.ts';
import { Button, Divider, ListRow, Mascot, Screen } from '../ui/components';
import { space, type } from '../ui/theme';
import { useStore } from '../ui/use-store';

function openCheckIn() {
  const entry = latestUnreviewed() ?? getHistory()[0];
  if (!entry) {
    Alert.alert('No finished session yet', 'Reset the sample data first.');
    return;
  }
  router.push({ pathname: ROUTES.checkIn, params: { history: entry.id } });
}

export default function DevHub() {
  useStore();
  const rhythm = getRhythm();
  return (
    <Screen>
      <View style={styles.header}>
        <Mascot mood={getMascotMood()} size={96} />
        <Text style={type.eyebrow}>FitLens · dev hub</Text>
        <Text style={type.title}>Reminders & Check-in</Text>
        <Text style={type.caption}>Temporary entry point until Home and the dock are ready.</Text>
      </View>
      <ListRow
        label="Your rhythm"
        detail={`${rhythm.thisWeek.length} of ${rhythm.goal} · ${rhythm.streakWeeks} wk`}
        onPress={() => router.push(ROUTES.rhythm)}
      />
      <ListRow label="Workout reminders" detail="This week" onPress={() => router.push(ROUTES.reminders)} />
      <ListRow label="Post-workout check-in" detail="Latest session" onPress={openCheckIn} />
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
