export const routes = {
  home: 'Today',
  workouts: 'Workouts',
  plan: 'Plan',
  insights: 'Insights',
  steps: 'Steps',
  activity: 'Log activity',
  camera: 'Camera setup',
  profile: 'Profile',
  reminders: 'Reminders',
} as const;
export type Route = keyof typeof routes;
export const tabs: Route[] = ['home', 'workouts', 'plan', 'insights'];
