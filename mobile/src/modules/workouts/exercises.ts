/**
 * Exercise catalogue — OWNER: Hải (contract: shared/exercises). The catalogue itself lives in
 * ../prototype/shared/exercises.js, shared with the browser prototype.
 */
import type { Equipment, Muscle, Region } from '../../shared/constants';
import { getCatalogExercise } from './store';

export type Exercise = {
  id: string;
  name: string;
  regions: Region[];
  equipment: Equipment[];
  muscles: Muscle[];
};

export function getExercise(id: string): Exercise | null {
  return getCatalogExercise(id) as Exercise | null;
}
