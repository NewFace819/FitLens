'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../shared/exercises.js'),C=require('../shared/constants.js'),P=require('../setup-plan-model.js');

// Names in the old `catalog` of workout-details.js (12 exercises).
const LEGACY_CATALOG_NAMES=['Bench Press','Lat Pulldown','Seated Row','Shoulder Press','Lateral Raise','Triceps Pushdown','Goblet Squat','Romanian Deadlift','Leg Press','Leg Curl','Calf Raise','Biceps Curl'];

test('ids are unique, kebab-case',()=>{
 const ids=E.listExercises().map(e=>e.id);
 assert.equal(new Set(ids).size,ids.length);
 for(const id of ids)assert.match(id,/^[a-z0-9]+(-[a-z0-9]+)*$/);
});
test('every field uses shared enums and is non-empty where required',()=>{
 for(const e of E.listExercises()){
  assert.ok(e.name,e.id+' name');
  assert.ok(e.regions.length>0,e.id+' regions');
  assert.ok(e.muscles.length>0,e.id+' muscles');
  for(const r of e.regions)assert.ok(C.Region.includes(r),e.id+' region '+r);
  for(const q of e.equipment)assert.ok(C.Equipment.includes(q),e.id+' equipment '+q);
  for(const m of e.muscles)assert.ok(C.Muscle.includes(m),e.id+' muscle '+m);
  assert.ok(e.defaults.sets>=1&&typeof e.defaults.reps==='string'&&e.defaults.rest>=0,e.id+' defaults');
 }
});
test('every exercise of the old catalog can be found by name',()=>{
 for(const n of LEGACY_CATALOG_NAMES)assert.ok(E.findByName(n),n);
});
test('every exercise name in FitLensPlan.library can be found (migration needs this)',()=>{
 for(const w of P.library)for(const n of w.exercises)assert.ok(E.findByName(n),w.id+': '+n);
});
test('findByName is case-insensitive and understands aliases; unknown gives null',()=>{
 assert.equal(E.findByName('  goblet SQUAT ').id,'goblet-squat');
 assert.equal(E.findByName('Standing calf raise').id,'calf-raise');
 assert.equal(E.findByName('nothing'),null);
 assert.equal(E.findByName(null),null);
});
test('getExercise returns null for unknown and a copy that cannot corrupt the catalog',()=>{
 assert.equal(E.getExercise('khong-co'),null);
 const e=E.getExercise('chair-squat');e.regions.push('back');e.name='x';
 assert.equal(E.getExercise('chair-squat').name,'Chair squat');
 assert.deepEqual(E.getExercise('chair-squat').regions,['knees','hips']);
});
test('safety: squats, presses and walking carry the regions they load',()=>{
 for(const id of ['chair-squat','goblet-squat','leg-press','leg-curl','march-in-place','easy-walking-warm-up'])assert.ok(E.getExercise(id).regions.includes('knees'),id+' knees');
 for(const id of ['bench-press','shoulder-press','dumbbell-floor-press'])assert.ok(E.getExercise(id).regions.includes('shoulders'),id+' shoulders');
 assert.ok(E.getExercise('calf-raise').regions.includes('ankles'));
 assert.ok(E.getExercise('romanian-deadlift').regions.includes('back'));
});
