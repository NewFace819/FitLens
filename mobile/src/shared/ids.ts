/** IDs are `<prefix>-<random>` — DATA_CONTRACT.md §2–3. Never sequence numbers. */
export const ID_PREFIX = {
  profile: 'pf',
  workout: 'wk',
  template: 'tpl',
  session: 'ss',
  history: 'hs',
  review: 'rv',
  reminder: 'rm',
  activity: 'ac',
} as const;

export function newId(prefix: (typeof ID_PREFIX)[keyof typeof ID_PREFIX]): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
}
