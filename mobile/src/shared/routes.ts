/**
 * Shared route names and URL params — DATA_CONTRACT.md §12.
 * Param names are fixed: session, workout, history, week, date.
 * Home/dock routes are owned by Đỗ Huy; this lists only what exists so far.
 */
export const ROUTES = {
  home: '/',
  rhythm: '/rhythm',
  reminders: '/reminders',
  checkIn: '/check-in',
} as const;

export type RouteParams = {
  session?: string;
  workout?: string;
  history?: string;
  week?: string;
  date?: string;
};
