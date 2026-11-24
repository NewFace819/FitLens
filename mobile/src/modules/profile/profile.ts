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

export function seedProfile(): void {
  const existing = getProfile();
  if (existing.name) {
    write(KEYS.profile, { ...DEFAULT_PROFILE, ...existing });
    return;
  }
  write(KEYS.profile, { ...DEFAULT_PROFILE });
}
