import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { toDateKey } from '../domain/dates.ts';
import {
  computeRhythm,
  normalizeSettings,
  type CompletedSession,
  type Rhythm,
  type RhythmSettings,
} from '../domain/rhythm.ts';
import { sampleHistory } from './sample-history';
import { KEYS, readJson, writeJson } from './storage';
import { getHistory, replaceHistory } from './training-history';

export const loadRhythmSettings = () => readJson(KEYS.rhythm, normalizeSettings);
export const saveRhythmSettings = (s: RhythmSettings) => writeJson(KEYS.rhythm, s);

/** Public API for Home / Insights: current rhythm computed from real history. */
export async function getRhythm(today: Date = new Date()): Promise<Rhythm> {
  const [history, settings] = await Promise.all([getHistory(), loadRhythmSettings()]);
  const sessions: CompletedSession[] = history.map(({ id, name, completedAt }) => ({ id, name, completedAt }));
  return computeRhythm(sessions, settings, toDateKey(today));
}

/** Demo helper: fill history + goal with synthetic data. */
export async function loadSampleRhythm(): Promise<void> {
  const { sessions, settings } = sampleHistory();
  await Promise.all([replaceHistory(sessions), saveRhythmSettings(settings)]);
}

export async function resetRhythm(): Promise<void> {
  await Promise.all([replaceHistory([]), saveRhythmSettings({ goals: [], pauses: [] })]);
}

/** Screen hook: reloads whenever the screen gains focus. */
export function useRhythm() {
  const [rhythm, setRhythm] = useState<Rhythm | null>(null);
  const [settings, setSettings] = useState<RhythmSettings | null>(null);

  const reload = useCallback(async () => {
    const [r, s] = await Promise.all([getRhythm(), loadRhythmSettings()]);
    setRhythm(r);
    setSettings(s);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const update = useCallback(
    async (next: RhythmSettings) => {
      await saveRhythmSettings(next);
      await reload();
    },
    [reload],
  );

  return { rhythm, settings, reload, update };
}
