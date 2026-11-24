const { test } = require('node:test');
const assert = require('node:assert/strict');
const { join } = require('node:path');
const {
  hydrate,
  read,
  write,
  writeDurable,
  writeConfirmed,
  updateDurable,
  clearAll,
  storageReady,
} = require(join(process.env.FITLENS_TEST_BUILD, 'shared/storage.js'));
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
};
function device(initial = []) {
  const disk = new Map(initial);
  return {
    disk,
    loadAll: async () => [...disk],
    save: async (k, v) => {
      disk.set(k, v);
    },
    remove: async keys => keys.forEach(k => disk.delete(k)),
  };
}

test('durable save acknowledges device completion and never publishes a failed write', async () => {
  const p = device();
  await hydrate(p);
  const gate = deferred();
  p.save = () => gate.promise;
  let done = false;
  const task = writeDurable('fitlens.test', { n: 1 }).then(() => {
    done = true;
  });
  await Promise.resolve();
  assert.equal(done, false);
  assert.equal(read('fitlens.test', null), null);
  gate.reject(new Error('disk full'));
  await assert.rejects(task, /disk full/);
  assert.equal(read('fitlens.test', null), null);
  p.save = async (k, v) => p.disk.set(k, v);
  await writeDurable('fitlens.test', { n: 2 });
  await hydrate(p);
  assert.deepEqual(read('fitlens.test', null), { n: 2 });
});

test('confirmed onboarding writes share the durable queue and support memory fixtures', async () => {
  const key = 'fitlens.onboarding';
  const p = device();
  await hydrate(p);
  const gate = deferred();
  p.save = async (k, v) => {
    await gate.promise;
    p.disk.set(k, v);
  };
  const first = writeConfirmed(key, { step: 'name' });
  await Promise.resolve();
  assert.equal(read(key, null), null);
  assert.equal(write(key, { step: 'health' }), true);
  gate.resolve();
  assert.equal(await first, true);
  await hydrate(p);
  assert.deepEqual(read(key, null), { step: 'health' });

  await hydrate(null);
  assert.equal(await writeConfirmed(key, { step: 'name' }), true);
  assert.deepEqual(read(key, null), { step: 'name' });
});

test('concurrent updates serialize and preserve both additions across reload', async () => {
  const p = device();
  await hydrate(p);
  await Promise.all(
    [1, 2, 3].map(n =>
      updateDurable('fitlens.test', current => [...(current ?? []), n]),
    ),
  );
  await hydrate(p);
  assert.deepEqual(read('fitlens.test', []), [1, 2, 3]);
});

test('future/corrupt envelopes and failed hydration cannot be overwritten', async () => {
  const p = device([
    ['fitlens.future', JSON.stringify({ v: 2, data: 'keep' })],
    ['fitlens.corrupt', 'bad json'],
  ]);
  await hydrate(p);
  for (const key of ['fitlens.future', 'fitlens.corrupt']) {
    assert.equal(write(key, 'bad'), false);
    await assert.rejects(writeDurable(key, 'bad'));
    assert.equal(await writeConfirmed(key, 'bad'), false);
  }
  assert.equal(p.disk.get('fitlens.corrupt'), 'bad json');
  p.loadAll = async () => {
    throw Error('load failed');
  };
  await hydrate(p);
  assert.equal(storageReady(), false);
  assert.equal(write('fitlens.test', 1), false);
  await assert.rejects(writeDurable('fitlens.test', 1));
  clearAll();
  assert.equal(p.disk.size, 2);
  await hydrate(null);
  await assert.rejects(writeDurable('fitlens.test', 1));
});

test('legacy writes, reset and new writes preserve device order', async () => {
  const p = device();
  await hydrate(p);
  write('fitlens.test', 1);
  clearAll();
  write('fitlens.test', 2);
  await writeDurable('fitlens.barrier', true);
  await hydrate(p);
  assert.equal(read('fitlens.test', null), 2);
});

test('queued values detach from callers and legacy newer cache wins', async () => {
  const p = device();
  await hydrate(p);
  const gate = deferred();
  const original = p.save;
  p.save = async (k, v) => {
    await gate.promise;
    await original(k, v);
  };
  const data = { n: 1 };
  const task = writeDurable('fitlens.test', data);
  data.n = 99;
  await Promise.resolve();
  write('fitlens.test', { n: 2 });
  gate.resolve();
  await task;
  await writeDurable('fitlens.barrier', true);
  assert.deepEqual(read('fitlens.test', null), { n: 2 });
  await hydrate(p);
  assert.deepEqual(read('fitlens.test', null), { n: 2 });
});

test('reset during an in-flight durable write cannot resurrect its key', async () => {
  const p = device();
  await hydrate(p);
  const gate = deferred();
  const original = p.save;
  p.save = async (k, v) => {
    await gate.promise;
    await original(k, v);
  };
  const task = writeDurable('fitlens.new-key', { old: true });
  await Promise.resolve();
  clearAll();
  gate.resolve();
  await task.catch(() => {});
  await writeDurable('fitlens.barrier', true);
  assert.equal(read('fitlens.new-key', null), null);
  await hydrate(p);
  assert.equal(read('fitlens.new-key', null), null);
});

test('owner storage bridge removal is ordered after in-flight saves and protects newer data', async () => {
  const { localStorageView } = require(join(process.env.FITLENS_TEST_BUILD, 'shared/storage.js'));
  const p = device([['fitlens.future', JSON.stringify({ v: 2, data: [] })]]);
  await hydrate(p);
  assert.throws(() => localStorageView.removeItem('fitlens.future'));
  const gate = deferred();
  const save = p.save;
  p.save = async (key, value) => { await gate.promise; await save(key, value); };
  const pending = writeDurable('fitlens.bridge', [1]);
  await Promise.resolve();
  localStorageView.removeItem('fitlens.bridge');
  gate.resolve();
  await pending;
  await writeDurable('fitlens.barrier', true);
  assert.equal(read('fitlens.bridge', null), null);
  assert.equal(p.disk.has('fitlens.bridge'), false);
  assert.equal(p.disk.has('fitlens.future'), true);
});
