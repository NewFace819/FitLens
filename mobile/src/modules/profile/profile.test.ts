import {
  DEFAULT_PROFILE,
  getProfile,
  hasConfirmedName,
  isValidName,
  normalizeName,
  saveProfileName,
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
