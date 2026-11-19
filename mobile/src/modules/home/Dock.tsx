import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useAppNavigation } from '../../navigation';
import { ROUTES } from '../../shared/routes';
import { Icon } from './Icon';
const items = [
  { route: ROUTES.home, label: 'Today', icon: 'home' },
  { route: ROUTES.workouts, label: 'Workouts', icon: 'workouts' },
  { route: ROUTES.plan, label: 'Plan', icon: 'plan' },
  { route: ROUTES.insights, label: 'Insights', icon: 'insights' },
] as const;
export function HomeDock() {
  const nav = useAppNavigation();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        backgroundColor: '#f0f2e9',
        borderRadius: 30,
        marginHorizontal: 20,
        padding: 6,
      }}
    >
      {items.map(item => (
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: item.route === ROUTES.home }}
          accessibilityLabel={item.label}
          key={item.route}
          onPress={() => nav.navigate(item.route)}
          style={{
            flex: 1,
            alignItems: 'center',
            paddingVertical: 10,
            gap: 4,
            borderRadius: 24,
            backgroundColor:
              item.route === ROUTES.home ? '#e3ead9' : 'transparent',
          }}
        >
          <Icon name={item.icon} />
          <Text style={{ fontSize: 11, color: '#294638' }}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
