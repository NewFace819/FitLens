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
