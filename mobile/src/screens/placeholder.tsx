/**
 * Stand-in screen for a route that is registered but not built yet. Shows who owns it and what it
 * will do, so the app always runs end to end. Owners replace their screen file; nothing else changes.
 */
import { StyleSheet, Text, View } from 'react-native';
import { useAppRoute } from '../navigation';
import { Screen, TopBar } from '../ui/components';
import { colors, radius, space, type } from '../ui/theme';

type Props = { title: string; owner: string; todo: string[] };

export default function Placeholder({ title, owner, todo }: Props) {
  const route = useAppRoute();
  const params = route.params ? JSON.stringify(route.params) : null;
  return (
    <Screen>
      <TopBar title={title} />
      <View style={styles.body}>
        <Text style={type.eyebrow}>Coming soon · {owner}</Text>
        <Text style={type.title}>{title}</Text>
        <View style={styles.card}>
          {todo.map((t) => (
            <Text key={t} style={type.body}>
              • {t}
            </Text>
          ))}
        </View>
        {params ? <Text style={type.caption}>Params: {params}</Text> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.md, paddingTop: space.lg },
  card: { gap: space.sm, padding: space.lg, borderRadius: radius.md, backgroundColor: colors.card },
});
