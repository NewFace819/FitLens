/**
 * Profile — OWNER: Thông.
 * ⚠️ PLACEHOLDER by Tu with the contract's minimum fields (DATA_CONTRACT §9)
 * so Rhythm can fall back to `daysPerWeek`. Thông replaces this file.
 */
import {
  EQUIPMENT, EXPERIENCES, GOALS, REGIONS, isOneOf,
  type Equipment, type Experience, type Goal, type Region,
} from '../../shared/constants';
import { KEYS, read, write } from '../../shared/storage';

export type Profile = {
  id: string;
  goal: Goal;
  experience: Experience;
  daysPerWeek: number;
  minutes: number;
  equipment: Equipment[];
  avoidRegions: Region[];
};

export const DEFAULT_PROFILE: Profile = {
  id: 'pf-local',
  goal: 'habit',
  experience: 'beginner',
  daysPerWeek: 3,
  minutes: 30,
  equipment: [],
  avoidRegions: [],
};

function parse(data: unknown): Profile {
  const p = (data ?? {}) as Partial<Profile>;
  return {
    id: typeof p.id === 'string' ? p.id : DEFAULT_PROFILE.id,
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

export function seedProfile(): void {
  write(KEYS.profile, { ...DEFAULT_PROFILE });
}
