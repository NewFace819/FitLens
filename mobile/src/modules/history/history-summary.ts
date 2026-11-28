/** Owner: npdwuy. Pure numbers for the History and Recap screens (#43). No storage, no UI. */
import { addDays, weekStartOf, weekLabel, type DateKey } from '../../shared/dates';
import type { HistoryEntry, SetRecord } from './history-model';

const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Weight × reps for one completed set, as in the prototype's workout review.
 * Bodyweight (0 kg or no kg) and timed sets add nothing.
 */
export function setVolumeKg(set: SetRecord): number {
  if (set.durationSec !== undefined || set.kg === null) return 0;
  return set.kg * set.reps;
}

export type Totals = {
  sessions: number;
  sets: number;
  exercises: number;
  volumeKg: number;
  durationSec: number;
  painStops: number;
};

export function totals(entries: readonly HistoryEntry[]): Totals {
  const exercises = new Set<string>();
  let sets = 0;
  let volumeKg = 0;
  let durationSec = 0;
  let painStops = 0;
  for (const entry of entries) {
    sets += entry.sets.length;
    durationSec += entry.durationSec;
    if (entry.stoppedByPain) painStops += 1;
    for (const set of entry.sets) {
      exercises.add(set.exerciseId);
      volumeKg += setVolumeKg(set);
    }
  }
  // Round once so 0.1 kg steps don't show float noise.
  return {
    sessions: entries.length,
    sets,
    exercises: exercises.size,
    volumeKg: Math.round(volumeKg * 10) / 10,
    durationSec,
    painStops,
  };
}

export type WeekGroup = { weekStart: DateKey; entries: HistoryEntry[]; totals: Totals };

/** Monday-based weeks, newest first. Entries keep the order they came in (newest first from getHistory). */
export function groupByWeek(entries: readonly HistoryEntry[]): WeekGroup[] {
  const groups = new Map<DateKey, HistoryEntry[]>();
  for (const entry of entries) {
    const week = weekStartOf(entry.date);
    const list = groups.get(week);
    if (list) list.push(entry);
    else groups.set(week, [entry]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([weekStart, list]) => ({ weekStart, entries: list, totals: totals(list) }));
}

/** "This week", "Last week", otherwise "Nov 9 – Nov 15". */
export function weekHeading(weekStart: DateKey, today: DateKey): string {
  const thisWeek = weekStartOf(today);
  if (weekStart === thisWeek) return 'This week';
  if (weekStart === addDays(thisWeek, -7)) return 'Last week';
  return weekLabel(weekStart);
}

/** Totals for the calendar month that contains `today`. */
export function monthTotals(
  entries: readonly HistoryEntry[],
  today: DateKey,
): Totals & { month: string } {
  const prefix = today.slice(0, 7);
  return {
    ...totals(entries.filter(entry => entry.date.startsWith(prefix))),
    month: MONTHS_LONG[Number(today.slice(5, 7)) - 1],
  };
}

/** "48 min", "1 h 05 min", "0 min" for an empty total. Seconds round down. */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`;
}

/** "3,240 kg", "12.5 kg". Manual grouping: Intl is not complete on every Android engine. */
export function formatKg(kg: number): string {
  const [whole, decimal] = (Math.round(kg * 10) / 10).toString().split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${grouped}${decimal ? `.${decimal}` : ''} kg`;
}

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
