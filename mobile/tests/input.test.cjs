const { test } = require('node:test');
const assert = require('node:assert/strict');
const { join } = require('node:path');
const { parseSetInput, parseSetDuration } = require(join(
  process.env.FITLENS_TEST_BUILD,
  'modules/training/set-input.js',
));
test('numeric text preserves blank drafts and rejects partial or coercible garbage', () => {
  assert.deepEqual(parseSetInput('', ''), { kg: null, reps: null });
  assert.deepEqual(parseSetInput('0', '10'), { kg: 0, reps: 10 });
  assert.deepEqual(parseSetInput('2.75', '8'), { kg: 2.75, reps: 8 });
  assert.deepEqual(parseSetInput('1.', '8'), { kg: 1, reps: 8 });
  for (const [kg, reps] of [
    ['1x', '10'],
    ['-1', '10'],
    ['Infinity', '8'],
    ['1e2', '8'],
    ['1', '1.5'],
    ['1', '0'],
    ['1001', '8'],
    ['1', '1000'],
  ])
    assert.equal(parseSetInput(kg, reps), null);
});

test('duration entry accepts seconds and m:ss without coercing invalid times', () => {
  assert.deepEqual(parseSetDuration(''), { durationSec: null });
  assert.deepEqual(parseSetDuration('5:00'), { durationSec: 300 });
  assert.deepEqual(parseSetDuration('305'), { durationSec: 305 });
  for (const value of ['0:00', '0', '5:60', '5:', '-1', '1.5', '9007199254740992']) {
    assert.equal(parseSetDuration(value), null);
  }
});
