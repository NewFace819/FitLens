import {
  DEFAULT_PROFILE,
  getProfile,
  hasConfirmedName,
  isValidName,
  isValidProfilePreferences,
  normalizeName,
  saveProfileName,
  saveProfilePreferences,
  seedProfile,
} from './profile';
import { clearAll, hydrate, KEYS, write, type Persistence } from '../../shared/storage';

beforeEach(async () => {
  await hydrate(null);
  clearAll();
});

test('normalizeName trims leading/trailing whitespace and caps at 40 characters', () => {
  expect(normalizeName('  Alice  ')).toBe('Alice');
  expect(normalizeName('  John Doe  ')).toBe('John Doe');
  expect(normalizeName('   ')).toBe('');
  const longName = 'a'.repeat(50);
  expect(normalizeName(longName)).toBe('a'.repeat(40));
  expect(normalizeName(longName).length).toBe(40);
});

test('normalizeName preserves non-ASCII accents, Vietnamese characters, and punctuation', () => {
  expect(normalizeName('  Đỗ Huy  ')).toBe('Đỗ Huy');
  expect(normalizeName('Nguyễn Thị Mai')).toBe('Nguyễn Thị Mai');
  expect(normalizeName("  O'Connor-Smith  ")).toBe("O'Connor-Smith");
  expect(normalizeName('Anne-Marie')).toBe('Anne-Marie');
});

test('isValidName validates names correctly', () => {
  expect(isValidName('')).toBe(false);
  expect(isValidName('   ')).toBe(false);
  expect(isValidName('\t\n')).toBe(false);
  expect(isValidName('A')).toBe(true);
  expect(isValidName('Đỗ Huy')).toBe(true);
  expect(isValidName('a'.repeat(40))).toBe(true);
  expect(isValidName(' ' + 'a'.repeat(40) + ' ')).toBe(true);
  expect(isValidName('a'.repeat(41))).toBe(false);
});

test('hasConfirmedName detects empty vs confirmed profile name', async () => {
  expect(hasConfirmedName()).toBe(false);

  seedProfile();
  expect(hasConfirmedName()).toBe(false);

  await saveProfileName('Huy');
  expect(hasConfirmedName()).toBe(true);
});

test('saveProfileName preserves existing profile fields and updates name', async () => {
  // Pre-seed with customized profile fields
  write(KEYS.profile, {
    ...DEFAULT_PROFILE,
    id: 'custom-pf',
    goal: 'strength',
    experience: 'intermediate',
    daysPerWeek: 5,
    minutes: 45,
    equipment: ['dumbbells'],
    avoidRegions: ['knees'],
  });

  const ok = await saveProfileName('  Đỗ Huy  ');
  expect(ok).toBe(true);

  const updated = getProfile();
  expect(updated.name).toBe('Đỗ Huy');
  expect(updated.id).toBe('custom-pf');
  expect(updated.goal).toBe('strength');
  expect(updated.experience).toBe('intermediate');
  expect(updated.daysPerWeek).toBe(5);
  expect(updated.minutes).toBe(45);
  expect(updated.equipment).toEqual(['dumbbells']);
  expect(updated.avoidRegions).toEqual(['knees']);
});

test('saveProfileName rejects invalid name and does not mutate profile', async () => {
  seedProfile();
  const ok = await saveProfileName('   ');
  expect(ok).toBe(false);
  expect(getProfile().name).toBe('');
});

test('old profiles without name field are parsed compatibly', () => {
  // Write raw legacy envelope without name
  write(KEYS.profile, {
    id: 'legacy-pf',
    goal: 'muscle',
    experience: 'advanced',
    daysPerWeek: 4,
    minutes: 30,
    equipment: [],
    avoidRegions: [],
  });

  const parsed = getProfile();
  expect(parsed.name).toBe('');
  expect(parsed.goal).toBe('muscle');
  expect(parsed.experience).toBe('advanced');
  expect(hasConfirmedName()).toBe(false);
});

test('failed persistence in saveProfileName rolls back / leaves cache untouched and returns false', async () => {
  // Mock failing persistence
  const failingPersistence: Persistence = {
    loadAll: async () => [],
    save: async () => {
      throw new Error('Disk full / write error');
    },
    remove: async () => {},
  };

  await hydrate(failingPersistence);
  seedProfile();
  expect(getProfile().name).toBe('');

  const ok = await saveProfileName('Failed Name');
  expect(ok).toBe(false);

  // In-memory cache must not count the name as confirmed or saved
  expect(getProfile().name).toBe('');
  expect(hasConfirmedName()).toBe(false);
});

test('saveProfilePreferences updates plan fields and preserves name/id', async () => {
  await saveProfileName('Hải');
  expect(getProfile().name).toBe('Hải');

  const ok = await saveProfilePreferences({
    goal: 'muscle',
    experience: 'advanced',
    daysPerWeek: 4,
    minutes: 45,
  });

  expect(ok).toBe(true);
  const p = getProfile();
  expect(p.name).toBe('Hải');
  expect(p.goal).toBe('muscle');
  expect(p.experience).toBe('advanced');
  expect(p.daysPerWeek).toBe(4);
  expect(p.minutes).toBe(45);
});

test('saveProfilePreferences updates equipment and avoidRegions, allowing empty lists', async () => {
  const ok1 = await saveProfilePreferences({
    equipment: ['dumbbells', 'bands'],
    avoidRegions: ['knees', 'back'],
  });
  expect(ok1).toBe(true);
  expect(getProfile().equipment).toEqual(['dumbbells', 'bands']);
  expect(getProfile().avoidRegions).toEqual(['knees', 'back']);

  // Empty selections are completely valid
  const ok2 = await saveProfilePreferences({
    equipment: [],
    avoidRegions: [],
  });
  expect(ok2).toBe(true);
  expect(getProfile().equipment).toEqual([]);
  expect(getProfile().avoidRegions).toEqual([]);
});

test('saveProfilePreferences rejects invalid patches and leaves profile unchanged', async () => {
  seedProfile();
  const baseline = getProfile();

  // Invalid goal
  expect(await saveProfilePreferences({ goal: 'invalid' as any })).toBe(false);
  // Invalid experience
  expect(await saveProfilePreferences({ experience: 'expert' as any })).toBe(false);
  // Invalid daysPerWeek (< 1 or > 7)
  expect(await saveProfilePreferences({ daysPerWeek: 0 })).toBe(false);
  expect(await saveProfilePreferences({ daysPerWeek: 8 })).toBe(false);
  expect(await saveProfilePreferences({ daysPerWeek: 3.5 })).toBe(false);
  // Invalid minutes
  expect(await saveProfilePreferences({ minutes: -10 })).toBe(false);
  // Invalid equipment
  expect(await saveProfilePreferences({ equipment: ['kettlebell' as any] })).toBe(false);
  // Invalid avoidRegions
  expect(await saveProfilePreferences({ avoidRegions: ['neck' as any] })).toBe(false);

  expect(getProfile()).toEqual(baseline);
});

test('failed persistence in saveProfilePreferences rolls back cache', async () => {
  const failingPersistence: Persistence = {
    loadAll: async () => [],
    save: async () => {
      throw new Error('Write error');
    },
    remove: async () => {},
  };

  await hydrate(failingPersistence);
  seedProfile();
  const initialGoal = getProfile().goal;

  const ok = await saveProfilePreferences({ goal: 'endurance' });
  expect(ok).toBe(false);
  expect(getProfile().goal).toBe(initialGoal);
});

test('saveProfilePreferences preserves non-picker custom values like minutes: 25 when updating other fields', async () => {
  // Set custom minutes: 25
  write(KEYS.profile, {
    ...DEFAULT_PROFILE,
    name: 'Đức Huy',
    goal: 'habit',
    minutes: 25,
    daysPerWeek: 3,
  });

  expect(getProfile().minutes).toBe(25);

  // Update only goal
  const ok = await saveProfilePreferences({ goal: 'muscle' });
  expect(ok).toBe(true);

  const updated = getProfile();
  expect(updated.goal).toBe('muscle');
  expect(updated.minutes).toBe(25); // preserved 25 minutes!
  expect(updated.daysPerWeek).toBe(3);
  expect(updated.name).toBe('Đức Huy');
});

test('saveProfilePreferences with empty patch preserves stored data identically', async () => {
  write(KEYS.profile, {
    ...DEFAULT_PROFILE,
    name: 'Test Name',
    minutes: 25,
  });
  const baseline = getProfile();

  const ok = await saveProfilePreferences({});
  expect(ok).toBe(true);
  expect(getProfile()).toEqual(baseline);
});

test('isValidProfilePreferences validates patch correctly', () => {
  expect(isValidProfilePreferences({})).toBe(true);
  expect(isValidProfilePreferences({ goal: 'strength' })).toBe(true);
  expect(isValidProfilePreferences({ goal: 'unknown' as any })).toBe(false);
  expect(isValidProfilePreferences({ daysPerWeek: 3 })).toBe(true);
  expect(isValidProfilePreferences({ daysPerWeek: 10 })).toBe(false);
  expect(isValidProfilePreferences({ equipment: ['dumbbells'] })).toBe(true);
  expect(isValidProfilePreferences({ equipment: ['barbell' as any] })).toBe(false);
  expect(isValidProfilePreferences({ avoidRegions: ['knees', 'ankles'] })).toBe(true);
  expect(isValidProfilePreferences({ avoidRegions: ['feet' as any] })).toBe(false);
});
