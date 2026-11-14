/**
 * TEMPORARY dev hub so Tu's screens can be opened before Home + dock exist.
 * Home and navigation belong to Đỗ Huy — replace this file when Home lands.
 */
import { Alert, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { loadSampleRhythm, resetRhythm } from '../data/rhythm-store';
import { getHistory } from '../data/training-history';
import { Button, Divider, ListRow, Mascot, Screen } from '../ui/components';
import { space, type } from '../ui/theme';

async function openCheckIn() {
  const history = await getHistory();
  const last = history[history.length - 1];
  if (!last) {
    Alert.alert('No finished session yet', 'Load the sample history first.');
    return;
  }
  router.push({ pathname: '/check-in', params: { sessionId: last.id } });
}

export default function DevHub() {
  return (
    <Screen>
      <View style={styles.header}>
        <Mascot mood="happy" size={96} />
        <Text style={type.eyebrow}>FitLens · dev hub</Text>
        <Text style={type.title}>Reminders & Check-in</Text>
        <Text style={type.caption}>Temporary entry point until Home and the dock are ready.</Text>
      </View>
      <ListRow label="Your rhythm" detail="Weekly goal & streak" onPress={() => router.push('/rhythm')} />
      <ListRow label="Workout reminders" detail="Times & notifications" onPress={() => router.push('/reminders')} />
      <ListRow label="Post-workout check-in" detail="Latest session" onPress={openCheckIn} />
      <ListRow
        label="Check-in after a pain stop"
        onPress={async () => {
          const last = (await getHistory()).at(-1);
          if (last) router.push({ pathname: '/check-in', params: { sessionId: last.id, stopped: 'pain' } });
          else Alert.alert('No finished session yet', 'Load the sample history first.');
        }}
      />
      <Divider />
      <Text style={[type.eyebrow, { marginBottom: space.sm }]}>Demo data · synthetic</Text>
      <Button
        title="Load sample history"
        variant="secondary"
        onPress={async () => {
          await loadSampleRhythm();
          Alert.alert('Sample history loaded', 'Six completed weeks, 2 of 3 sessions this week.');
        }}
      />
      <Button
        title="Clear history & goal"
        variant="text"
        style={{ marginTop: space.sm }}
        onPress={async () => {
          await resetRhythm();
          Alert.alert('Cleared', 'History and weekly goal are empty.');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'flex-start', gap: space.sm, paddingTop: space.xxl, paddingBottom: space.xl },
});
