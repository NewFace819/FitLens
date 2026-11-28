/** Owner: npdwuy. Small number tile shared by History and Recap, in the prototype's review style. */
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, space, type } from '../ui/theme';

export default function StatTile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <View style={styles.tile} accessible accessibilityLabel={[label, value, note].filter(Boolean).join(', ')}>
      <Text style={type.eyebrow}>{label}</Text>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {note ? <Text style={type.caption}>{note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    gap: space.xs,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  value: { fontSize: 22, fontWeight: '800', color: colors.ink },
});
