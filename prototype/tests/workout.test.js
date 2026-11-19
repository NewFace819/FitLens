'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const W=require('../workout-model.js'),Ex=require('../shared/exercises.js'),S=require('../shared/storage.js'),P=require('../setup-plan-model.js');
const {MemoryStorage,BrokenStorage}=require('./helpers.js');
const fresh=(opts)=>{const s=new MemoryStorage();return {s,m:W.createWorkoutModel(s,opts)};};

test('templates: every exercise exists, ids unique',()=>{
 const ids=W.TEMPLATES.map(t=>t.id);assert.equal(new Set(ids).size,ids.length);
 for(const t of W.TEMPLATES){assert.ok(t.items.length>0,t.id);for(const i of t.items)assert.ok(Ex.getExercise(i.exerciseId),t.id+' '+i.exerciseId);}
});
test('plan-library templates match FitLensPlan.library (same exercises, in order)',()=>{
 const map={bodyweight:'tpl-bodyweight',upper:'tpl-upper-plan',lower:'tpl-lower-plan',core:'tpl-core',bands:'tpl-bands',walk:'tpl-walk',cardio:'tpl-cardio',full:'tpl-full-plan'};
 const {m}=fresh();
 for(const lib of P.library){
  const w=m.getWorkout(map[lib.id]);assert.ok(w,lib.id);
  assert.deepEqual(w.items.map(i=>Ex.getExercise(i.exerciseId).id),lib.exercises.map(n=>Ex.findByName(n).id),lib.id);
  assert.deepEqual(w.goals,lib.goals,lib.id+' goals');
 }
});
test('getWorkout: template found, unknown is null',()=>{
 const {m}=fresh();
 const w=m.getWorkout('tpl-upper');assert.equal(w.items.length,6);assert.equal(w.source,'template');
 assert.equal(m.getWorkout('nope'),null);
});
test('updateWorkout on a template makes a custom copy and leaves the template alone',()=>{
 const {m}=fresh();
 const copy=m.updateWorkout('tpl-upper',{title:'My upper'});
 assert.match(copy.id,/^wk-/);assert.equal(copy.source,'custom');assert.equal(copy.title,'My upper');assert.equal(copy.basedOn,'tpl-upper');
 assert.equal(copy.items.length,6);
 assert.equal(m.getWorkout('tpl-upper').title,'Upper Body');
 assert.equal(m.getWorkout(copy.id).title,'My upper');
});
test('create -> update -> get -> delete',()=>{
 const {m}=fresh();
 const w=m.createWorkout({title:'  Sunday  ',items:[{exerciseId:'chair-squat',sets:3,reps:'10'}]});
 assert.equal(w.title,'Sunday');assert.equal(w.items[0].reps,'10');
 const u=m.updateWorkout(w.id,{items:[...w.items,{exerciseId:'glute-bridge'}]});
 assert.equal(u.items.length,2);assert.equal(u.items[1].sets,2);
 assert.equal(m.getWorkout(w.id).items.length,2);
 assert.deepEqual(m.deleteWorkout(w.id),{ok:true});
 assert.equal(m.getWorkout(w.id),null);
});
test('update/delete of unknown ids; templates cannot be deleted',()=>{
 const {m}=fresh();
 assert.equal(m.updateWorkout('wk-nope',{title:'x'}),null);
 assert.deepEqual(m.deleteWorkout('wk-nope'),{ok:false,reason:'notFound'});
 assert.deepEqual(m.deleteWorkout('tpl-upper'),{ok:false,reason:'template'});
});
test('delete is refused while planned sessions use the workout; allowed after they are done',()=>{
 const sessions=[];const {m,s}=fresh({getSessions:()=>sessions});
 const w=m.createWorkout({title:'A',items:[{exerciseId:'dead-bug'}]});
 sessions.push({id:'ss-1',workoutId:w.id,status:'planned'});
 assert.deepEqual(m.deleteWorkout(w.id),{ok:false,reason:'scheduled',count:1});
 assert.ok(m.getWorkout(w.id));
 sessions[0].status='done';
 assert.deepEqual(m.deleteWorkout(w.id),{ok:true});
});
test('bad data never breaks listing: corrupt JSON, junk entries, unknown exercises',()=>{
 const {m,s}=fresh();
 s.setItem(W.KEY,'{broken');assert.equal(m.listWorkouts().length,W.TEMPLATES.length);
 S.write(s,W.KEY,[null,5,{id:'x'},{id:'wk-ok',title:'  ',items:[{exerciseId:'ghost'},{exerciseId:'dead-bug',sets:999,reps:'',rest:-4}]}]);
 const list=m.listWorkouts();assert.equal(list.length,W.TEMPLATES.length+1);
 const w=m.getWorkout('wk-ok');assert.equal(w.title,'My workout');assert.equal(w.items.length,1);
 assert.equal(w.items[0].sets,Ex.getExercise('dead-bug').defaults.sets);assert.equal(w.items[0].rest,Ex.getExercise('dead-bug').defaults.rest);
});
test('blocked storage: reads work, writes return null instead of throwing',()=>{
 const m=W.createWorkoutModel(new BrokenStorage());
 assert.equal(m.listWorkouts().length,W.TEMPLATES.length);
 assert.equal(m.createWorkout({title:'x'}),null);
});
test('returned objects are copies: editing them does not change stored data',()=>{
 const {m}=fresh();
 const a=m.getWorkout('tpl-upper');a.items.pop();a.title='x';
 assert.equal(m.getWorkout('tpl-upper').items.length,6);
});
test('derived values: minutes, equipment, regions, muscles',()=>{
 const {m}=fresh();
 assert.equal(W.estimateMinutes({items:[]}),0);
 const w=m.createWorkout({items:[{exerciseId:'chair-squat'}]});
 const more=m.updateWorkout(w.id,{items:[...w.items,{exerciseId:'glute-bridge'}]});
 assert.ok(W.estimateMinutes(more)>W.estimateMinutes(w));
 assert.deepEqual(W.equipmentOf(m.getWorkout('tpl-upper')),['dumbbells','bench','barbell','machine']);
 assert.deepEqual(W.equipmentOf(m.getWorkout('tpl-bodyweight')),[]);
 assert.ok(W.regionsOf(m.getWorkout('tpl-walk')).includes('knees'));
 assert.ok(W.musclesOf(m.getWorkout('tpl-upper')).includes('chest'));
});
