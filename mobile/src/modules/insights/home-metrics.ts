/** Daily Home metrics — DATA_CONTRACT §6 and §9. */
import { getHistory } from '../history/history';
import type { DateKey } from '../../shared/dates';

export type HomeMetrics = {
  date: DateKey;
  steps: number;
  activeMinutes: number;
  activeEnergyKcal: number | null;
  isSample: boolean;
};

const SAMPLE_STEPS = 3_150;
const SAMPLE_ACTIVE_MINUTES = 70;

/** The prototype has no per-date step measurements yet. */
export function getSteps(date: DateKey): { date: DateKey; steps: number } {
  return { date, steps: SAMPLE_STEPS };
}

export function getHomeMetrics(date: DateKey): HomeMetrics {
  const workouts = getHistory({ from: date, to: date });
  const workoutSeconds = workouts.reduce((total, workout) => total + workout.durationSec, 0);

  return {
    ...getSteps(date),
    activeMinutes: workouts.length > 0 ? Math.round(workoutSeconds / 60) : SAMPLE_ACTIVE_MINUTES,
    activeEnergyKcal: null,
    // Steps are still synthetic, even when workout minutes come from history.
    isSample: true,
  };
}
