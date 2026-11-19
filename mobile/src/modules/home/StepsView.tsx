import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { days } from './stepsData';

export function StepsScreen() {
  const [selected, setSelected] = useState<keyof typeof days>(23);
  const [info, setInfo] = useState(false);
  const day = days[selected];
  const baseline = day.history.reduce((a, b) => a + b, 0) / 4;
  const difference = day.steps - baseline;
  return (
    <View style={{ gap: 22 }}>
      <View style={s.row}>
        <Text style={s.title}>Steps</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Explain baseline comparison"
          onPress={() => setInfo(!info)}
          style={{ padding: 12 }}
        >
          <Text style={s.body}>ⓘ</Text>
        </Pressable>
      </View>
      <View style={s.hero}>
        <View style={s.row}>
          <Text style={s.caption}>
            {selected === 23 ? 'TODAY’S' : day.name.toUpperCase() + '’S'} STEPS
          </Text>
          <Text style={s.body}>
            {Math.round(Math.abs(difference / baseline) * 100)}%{' '}
            {difference < 0 ? 'below' : 'above'} usual
          </Text>
        </View>
        <View style={s.sun}>
          <Text style={s.count}>{day.steps.toLocaleString()}</Text>
          <Text style={s.body}>steps by 19:00</Text>
        </View>
        <View style={s.row}>
          <Text style={s.body}>
            Usual {day.name}
            {'\n'}
            {baseline.toLocaleString()}
          </Text>
          <Text style={s.body}>
            {difference > 0 ? '+' : '−'}
            {Math.abs(difference).toLocaleString()} steps
          </Text>
        </View>
      </View>
      {info && (
        <Text style={s.body}>
          In this preview, your typical is the average step count by 19:00
          across four recent matching weekdays. This is a comparison, not a
          daily target. All values are sample data.
        </Text>
      )}
      <View style={s.row}>
        <Text style={s.heading}>This week’s rhythm</Text>
        <Text style={s.body}>Oct 19–25</Text>
      </View>
      <View style={s.row}>
        {[19, 20, 21, 22, 23, 24, 25].map((date, index) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: date === selected }}
            disabled={date > 23}
            onPress={() => setSelected(date as keyof typeof days)}
            key={date}
            style={[s.day, date === selected && { backgroundColor: '#dce7cf' }]}
          >
            <Text style={s.body}>{'MTWTFSS'[index]}</Text>
            <Text style={s.body}>{date}</Text>
            <View
              style={[s.dot, date > 23 && { backgroundColor: '#e0e4d9' }]}
            />
          </Pressable>
        ))}
      </View>
      <Text style={s.body}>3 of 5 days above their usual weekday level.</Text>
      <View style={s.row}>
        {[
          ['Distance', `${day.distance} km`, 'Across the day'],
          [
            'Walking time',
            `${Math.floor(day.minutes / 60)}h ${day.minutes % 60}m`,
            'Time spent walking',
          ],
        ].map(([label, value, note]) => (
          <View key={label} style={s.card}>
            <Text style={s.body}>{label}</Text>
            <Text style={s.heading}>{value}</Text>
            <Text style={s.body}>{note}</Text>
          </View>
        ))}
      </View>
      <Text style={s.heading}>Movement flow</Text>
      {day.periods.map(([time, name, steps]) => (
        <View key={time} style={s.flow}>
          <Text style={s.caption}>{time}</Text>
          <View style={s.row}>
            <Text style={s.body}>{name}</Text>
            <Text style={s.heading}>{Number(steps).toLocaleString()}</Text>
          </View>
        </View>
      ))}
      <Text style={s.body}>Your reference is your own recent {day.name}s.</Text>
    </View>
  );
}
const s = StyleSheet.create({
  title: { fontSize: 28, color: '#27362d', fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  hero: { padding: 20, borderRadius: 28, backgroundColor: '#e4ecd9', gap: 20 },
  caption: { fontSize: 10, color: '#71806f', letterSpacing: 1 },
  body: { fontSize: 12, lineHeight: 19, color: '#68795f' },
  sun: {
    width: 210,
    height: 210,
    borderRadius: 110,
    backgroundColor: '#f4cf55',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: { fontSize: 44, color: '#62491f', fontWeight: '800' },
  heading: { fontSize: 17, color: '#344d3d', fontWeight: '700' },
  day: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
  },
  dot: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#f4cf55' },
  card: {
    flex: 1,
    borderRadius: 22,
    padding: 18,
    backgroundColor: '#eeefe8',
    gap: 12,
  },
  flow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#dfe5d7',
    gap: 8,
  },
});
