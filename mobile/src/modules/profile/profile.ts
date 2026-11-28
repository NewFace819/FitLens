/**
 * Profile — OWNER: Thông.
 * Profile owner API managing user preferences and name.
 */
import {
  EQUIPMENT, EXPERIENCES, GOALS, REGIONS, isOneOf,
  type Equipment, type Experience, type Goal, type Region,
} from '../../shared/constants';
import { KEYS, read, write, writeConfirmed } from '../../shared/storage';

export type Profile = {
  id: string;
  name: string;
  goal: Goal;
  experience: Experience;
  daysPerWeek: number;
  minutes: number;
  equipment: Equipment[];
  avoidRegions: Region[];
};

export const DEFAULT_PROFILE: Profile = {
  id: 'pf-local',
  name: '',
  goal: 'habit',
  experience: 'beginner',
  daysPerWeek: 3,
  minutes: 30,
  equipment: [],
  avoidRegions: [],
};

export type ProfilePreferencesPatch = {
  goal?: Goal;
  experience?: Experience;
  daysPerWeek?: number;
  minutes?: number;
  equipment?: Equipment[];
  avoidRegions?: Region[];
};

export const GOAL_OPTIONS: readonly { value: Goal; title: string; subtitle: string }[] = [
  { value: 'habit', title: 'Build a habit', subtitle: 'Consistency and regular movement' },
  { value: 'strength', title: 'Get stronger', subtitle: 'Progressive strength and stability' },
  { value: 'muscle', title: 'Build muscle', subtitle: 'Hypertrophy and physical conditioning' },
  { value: 'endurance', title: 'Improve stamina', subtitle: 'Aerobic and muscular endurance' },
] as const;

export const EXPERIENCE_OPTIONS: readonly { value: Experience; title: string; subtitle: string }[] = [
  { value: 'beginner', title: 'Beginner', subtitle: 'New to exercise or returning after a break' },
  { value: 'intermediate', title: 'Intermediate', subtitle: 'Regular training for 6+ months' },
  { value: 'advanced', title: 'Advanced', subtitle: 'Multiple years of consistent workouts' },
] as const;

export const SESSIONS_PER_WEEK_OPTIONS = [2, 3, 4, 5] as const;

export const DURATION_OPTIONS = [15, 30, 45, 60] as const;

export const EQUIPMENT_OPTIONS: readonly { value: Equipment; label: string; description: string }[] = [
  { value: 'dumbbells', label: 'Dumbbells', description: 'Adjustable or fixed weight pairs' },
  { value: 'bands', label: 'Resistance Bands', description: 'Loop bands or elastic tubing' },
] as const;

export const REGION_OPTIONS: readonly { value: Region; label: string }[] = [
  { value: 'knees', label: 'Knees' },
  { value: 'back', label: 'Lower Back' },
  { value: 'wrists', label: 'Wrists' },
  { value: 'shoulders', label: 'Shoulders' },
  { value: 'ankles', label: 'Ankles' },
  { value: 'hips', label: 'Hips' },
] as const;

function parse(data: unknown): Profile {
  const p = (data ?? {}) as Partial<Profile> & Record<string, unknown>;
  return {
    ...p,
    id: typeof p.id === 'string' ? p.id : DEFAULT_PROFILE.id,
    name: typeof p.name === 'string' ? p.name.trim().slice(0, 40) : DEFAULT_PROFILE.name,
    goal: isOneOf(GOALS, p.goal) ? p.goal : DEFAULT_PROFILE.goal,
    experience: isOneOf(EXPERIENCES, p.experience) ? p.experience : DEFAULT_PROFILE.experience,
    daysPerWeek: Number.isInteger(p.daysPerWeek) && p.daysPerWeek! >= 1 && p.daysPerWeek! <= 7 ? p.daysPerWeek! : DEFAULT_PROFILE.daysPerWeek,
    minutes: Number.isFinite(p.minutes) ? p.minutes! : DEFAULT_PROFILE.minutes,
    equipment: Array.isArray(p.equipment) ? p.equipment.filter((e) => isOneOf(EQUIPMENT, e)) : [],
    avoidRegions: Array.isArray(p.avoidRegions) ? p.avoidRegions.filter((r) => isOneOf(REGIONS, r)) : [],
  };
}

/** Always returns a profile; unset fields use the defaults (contract §9). */
export function getProfile(): Profile {
  return read(KEYS.profile, DEFAULT_PROFILE, { parse });
}

export function normalizeName(input: string): string {
  return String(input ?? '').trim().slice(0, 40);
}

export function isValidName(input: string): boolean {
  const trimmed = String(input ?? '').trim();
  return trimmed.length > 0 && trimmed.length <= 40;
}

export function hasConfirmedName(): boolean {
  const p = getProfile();
  return typeof p.name === 'string' && p.name.trim().length > 0;
}

/**
 * Stores the confirmed preferred name through the profile owner API.
 * Uses writeConfirmed to ensure that failed persistence does not leave dirty
 * cache or count as successful progress.
 */
export async function saveProfileName(name: string): Promise<boolean> {
  if (!isValidName(name)) {
    return false;
  }
  const normalized = normalizeName(name);
  const current = getProfile();
  const updated: Profile = {
    ...current,
    name: normalized,
  };
  return writeConfirmed(KEYS.profile, updated);
}

export function isValidProfilePreferences(patch: ProfilePreferencesPatch): boolean {
  if (patch.goal !== undefined && !isOneOf(GOALS, patch.goal)) {
    return false;
  }
  if (patch.experience !== undefined && !isOneOf(EXPERIENCES, patch.experience)) {
    return false;
  }
  if (patch.daysPerWeek !== undefined) {
    if (!Number.isInteger(patch.daysPerWeek) || patch.daysPerWeek < 1 || patch.daysPerWeek > 7) {
      return false;
    }
  }
  if (patch.minutes !== undefined) {
    if (!Number.isFinite(patch.minutes) || patch.minutes <= 0) {
      return false;
    }
  }
  if (patch.equipment !== undefined) {
    if (!Array.isArray(patch.equipment) || !patch.equipment.every((e) => isOneOf(EQUIPMENT, e))) {
      return false;
    }
  }
  if (patch.avoidRegions !== undefined) {
    if (!Array.isArray(patch.avoidRegions) || !patch.avoidRegions.every((r) => isOneOf(REGIONS, r))) {
      return false;
    }
  }
  return true;
}

/**
 * Stores updated training and plan preferences through the profile owner API.
 * Uses writeConfirmed to ensure that failed persistence does not leave dirty
 * cache or count as successful progress.
 * Preserves all other profile fields (including name, id, and any future extensions).
 */
export async function saveProfilePreferences(patch: ProfilePreferencesPatch): Promise<boolean> {
  if (!isValidProfilePreferences(patch)) {
    return false;
  }
  const current = getProfile();
  const updated: Profile = {
    ...current,
    ...(patch.goal !== undefined ? { goal: patch.goal } : {}),
    ...(patch.experience !== undefined ? { experience: patch.experience } : {}),
    ...(patch.daysPerWeek !== undefined ? { daysPerWeek: patch.daysPerWeek } : {}),
    ...(patch.minutes !== undefined ? { minutes: patch.minutes } : {}),
    ...(patch.equipment !== undefined ? { equipment: [...patch.equipment] } : {}),
    ...(patch.avoidRegions !== undefined ? { avoidRegions: [...patch.avoidRegions] } : {}),
  };
  return writeConfirmed(KEYS.profile, updated);
}

export function seedProfile(): void {
  const existing = getProfile();
  if (existing.name) {
    write(KEYS.profile, { ...DEFAULT_PROFILE, ...existing });
    return;
  }
  write(KEYS.profile, { ...DEFAULT_PROFILE });
}
