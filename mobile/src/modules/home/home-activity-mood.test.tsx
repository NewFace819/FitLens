import React from 'react';
import Renderer from 'react-test-renderer';
import Home from '../../screens/dev-hub';
import { hydrate } from '../../shared/storage';
import { ensureSeeded } from '../../shared/seed';
import { toDateKey } from '../../shared/dates';
import { getActivities } from '../activity/activity';
import { ActivityScreen } from '../activity/ActivityForm';
import { getMascotMood, setMascotMood } from '../mascot/mascot';
jest.mock('../../navigation', () => ({
  useAppNavigation: () => ({ navigate: jest.fn() }),
}));
beforeEach(async () => {
  await hydrate(null);
  ensureSeeded();
});

test('saving from the real Home activity form preserves a recent concerned mood', async () => {
  setMascotMood('concerned');
  let tree: Renderer.ReactTestRenderer;
  Renderer.act(() => {
    tree = Renderer.create(<Home />);
  });
  try {
    Renderer.act(() =>
      tree!.root.findByProps({ label: 'Log activity' }).props.onPress(),
    );
    await Renderer.act(async () => {
      const saved = await tree!.root.findByType(ActivityScreen).props.save({
        id: 'ac-gentle',
        type: 'walk',
        name: 'Gentle walk',
        date: toDateKey(new Date()),
        durationSec: 600,
        distanceKm: null,
        elevationM: null,
        note: '',
        effort: null,
        source: 'manual',
        at: new Date().toISOString(),
      });
      expect(saved).toBe(true);
    });
    expect(getActivities().some(activity => activity.id === 'ac-gentle')).toBe(
      true,
    );
    expect(getMascotMood()).toBe('concerned');
  } finally {
    Renderer.act(() => tree!.unmount());
  }
});
