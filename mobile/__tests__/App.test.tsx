/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';
import { clearAll, hydrate } from '../src/shared/storage';
import { markWelcomeSeen } from '../src/modules/welcome/welcome';

beforeEach(async () => {
  await hydrate(null);
  clearAll();
});

test('renders correctly on first launch (Welcome)', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });

  expect(renderer!).toBeDefined();
});

test('renders correctly on subsequent launch (Home)', async () => {
  markWelcomeSeen();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });

  expect(renderer!).toBeDefined();
});
