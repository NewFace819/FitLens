import { validDuration } from './training-model';

/** Empty means draft; only explicit, finite decimal numbers may be completed. */
export function parseSetInput(
  kgText: string,
  repsText: string,
): { kg: number | null; reps: number | null } | null {
  const kgRaw = kgText.trim(),
    repsRaw = repsText.trim();
  if (
    (kgRaw && !/^\d+(\.\d*)?$/.test(kgRaw)) ||
    (repsRaw && !/^\d+$/.test(repsRaw))
  )
    return null;
  const kg = kgRaw ? Number(kgRaw) : null;
  const reps = repsRaw ? Number(repsRaw) : null;
  if (
    (kg !== null && (!Number.isFinite(kg) || kg > 1000)) ||
    (reps !== null && (!Number.isInteger(reps) || reps < 1 || reps > 999))
  )
    return null;
  return { kg, reps };
}


export function parseSetDuration(text: string): { durationSec: number | null } | null {
  const value = text.trim();
  if (!value) return { durationSec: null };
  const match = /^(\d+):([0-5]\d)$/.exec(value);
  const durationSec = match
    ? Number(match[1]) * 60 + Number(match[2])
    : /^\d+$/.test(value) ? Number(value) : NaN;
  return validDuration(durationSec) ? { durationSec } : null;
}

/** Keystroke filters: only characters that can form a valid value get into the field.
 * A comma becomes a dot (common on Vietnamese/European keyboards). */
export const cleanKgText = (text: string) => {
  const [whole, ...rest] = text.replace(/,/g, '.').replace(/[^\d.]/g, '').split('.');
  return (rest.length ? `${whole}.${rest.join('')}` : whole).slice(0, 7);
};
export const cleanRepsText = (text: string) => text.replace(/\D/g, '').slice(0, 3);
export const cleanDurationText = (text: string) => {
  const [mins, ...rest] = text.replace(/[^\d:]/g, '').split(':');
  return (rest.length ? `${mins}:${rest.join('')}` : mins).slice(0, 7);
};
