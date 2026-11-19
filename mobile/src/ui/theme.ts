/** Design tokens taken from Thông's prototype (home.css / reminders.css). */
export const colors = {
  background: '#F7F6F2',
  surface: '#FFFDF7',
  card: '#EFEEE5',
  ink: '#27362D',
  muted: '#687669',
  faint: '#A5ADA3',
  line: '#E2E2D8',
  accent: '#365B48', // primary buttons, filled dots
  accentSoft: '#E5EDDF',
  sage: '#B8CFB3',
  gold: '#E9CC7A',
  blush: '#D99478',
  blushSoft: '#F3D6CB',
  danger: '#B5523F',
  overlay: 'rgba(39, 54, 45, 0.35)',
  white: '#FFFFFF',
} as const;

/** RPE track colours, 1 → 10 (prototype effort gradient). */
export const effortColors = [
  '#A4C9CC', '#AACBC4', '#B7CBAA', '#D0CE8E', '#E9CC7A',
  '#E7B781', '#E8A173', '#D99687', '#C18DA3', '#A497C8',
] as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 10, md: 16, lg: 24, pill: 999 } as const;

export const type = {
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: colors.muted, textTransform: 'uppercase' },
  title: { fontSize: 26, fontWeight: '800', color: colors.ink },
  h2: { fontSize: 20, fontWeight: '800', color: colors.ink },
  h3: { fontSize: 16, fontWeight: '700', color: colors.ink },
  body: { fontSize: 15, color: colors.ink, lineHeight: 21 },
  caption: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  big: { fontSize: 44, fontWeight: '800', color: colors.ink },
} as const;
