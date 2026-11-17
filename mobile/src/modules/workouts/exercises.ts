/**
 * Exercise catalogue — OWNER: Hải (contract: shared/exercises).
 * ⚠️ PLACEHOLDER by Tu: only the exercises the sample data uses.
 */
import type { Equipment, Muscle, Region } from '../../shared/constants';

export type Exercise = {
  id: string;
  name: string;
  regions: Region[];
  equipment: Equipment[];
  muscles: Muscle[];
};

export const EXERCISES: Exercise[] = [
  { id: 'push-up', name: 'Push-up', regions: ['wrists', 'shoulders'], equipment: [], muscles: ['chest', 'arms'] },
  { id: 'dumbbell-row', name: 'Dumbbell Row', regions: ['back', 'shoulders'], equipment: ['dumbbells'], muscles: ['back', 'arms'] },
  { id: 'shoulder-press', name: 'Shoulder Press', regions: ['shoulders', 'wrists'], equipment: ['dumbbells'], muscles: ['shoulders', 'arms'] },
  { id: 'band-pull-apart', name: 'Band Pull-apart', regions: ['shoulders'], equipment: ['bands'], muscles: ['back', 'shoulders'] },
  { id: 'goblet-squat', name: 'Goblet Squat', regions: ['knees', 'hips', 'back'], equipment: ['dumbbells'], muscles: ['legs', 'glutes'] },
  { id: 'romanian-deadlift', name: 'Romanian Deadlift', regions: ['back', 'hips'], equipment: ['dumbbells'], muscles: ['legs', 'glutes'] },
  { id: 'reverse-lunge', name: 'Reverse Lunge', regions: ['knees', 'ankles', 'hips'], equipment: [], muscles: ['legs', 'glutes'] },
  { id: 'glute-bridge', name: 'Glute Bridge', regions: ['hips', 'back'], equipment: [], muscles: ['glutes', 'core'] },
  { id: 'plank', name: 'Plank', regions: ['shoulders', 'back'], equipment: [], muscles: ['core'] },
];

export function getExercise(id: string): Exercise | null {
  return EXERCISES.find((e) => e.id === id) ?? null;
}
