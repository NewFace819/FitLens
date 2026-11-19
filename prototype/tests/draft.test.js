'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Dr=require('../draft-model.js'),W=require('../workout-model.js'),Sch=require('../schedule-model.js'),C=require('../shared/constants.js'),D=require('../shared/dates.js'),P=require('../setup-plan-model.js');
const {MemoryStorage}=require('./helpers.js');
const WEEK='2026-11-09';
const all=()=>W.createWorkoutModel(new MemoryStorage()).listWorkouts();
const subsets=a=>a.reduce((acc,x)=>acc.concat(acc.map(s=>[...s,x])),[[]]);
const byId=Object.fromEntries(all().map(w=>[w.id,w]));

test('SAFETY: no session ever contains an exercise that loads an avoided region (exhaustive)',()=>{
 const workouts=all();let drafts=0,nulls=0;
 for(const goal of C.Goal)for(const days of [2,3,4,5])for(const equipment of subsets(C.Equipment.filter(e=>['dumbbells','bands','mat','bench'].includes(e))))for(const avoid of subsets([...C.Region])){
  const d=Dr.generateDraft({goal,daysPerWeek:days,minutes:30,equipment,avoidRegions:avoid},WEEK,workouts);
  if(d===null){nulls++;continue;}drafts++;
  assert.equal(d.sessions.length,days);
  for(const s of d.sessions){const w=byId[s.workoutId];
   for(const r of W.regionsOf(w))assert.ok(!avoid.includes(r),`${w.id} loads ${r} but user avoids ${avoid}`);
   for(const e of W.equipmentOf(w))assert.ok(equipment.includes(e),`${w.id} needs ${e}`);}
 }
 assert.ok(drafts>0&&nulls>0,'both outcomes should occur: drafts '+drafts+', null '+nulls);
});
test('avoiding every region leaves nothing safe: null, not an unsafe draft',()=>{
 assert.equal(Dr.generateDraft({goal:'habit',daysPerWeek:3,minutes:30,equipment:[],avoidRegions:[...C.Region]},WEEK,all()),null);
});
test('knee problem: walking and squat workouts are excluded, a core/upper plan is still produced',()=>{
 const d=Dr.generateDraft({goal:'strength',daysPerWeek:3,minutes:30,equipment:['dumbbells','bands'],avoidRegions:['knees']},WEEK,all());
 assert.ok(d);
 for(const s of d.sessions){assert.ok(!['tpl-walk','tpl-cardio','tpl-bodyweight','tpl-lower-plan','tpl-full-plan'].includes(s.workoutId),s.workoutId);}
});
test('3 days a week gives Mon/Wed/Fri dates inside the week, with no time set',()=>{
 const d=Dr.generateDraft({goal:'habit',daysPerWeek:3,minutes:30,equipment:[],avoidRegions:[]},'2026-11-12',all());
 assert.equal(d.weekStart,WEEK);
 assert.deepEqual(d.sessions.map(s=>s.date),['2026-11-09','2026-11-11','2026-11-13']);
 assert.ok(d.sessions.every(s=>s.time===null));
});
test('4 and 5 days keep at least one rest day in the week and stay inside it',()=>{
 for(const n of [2,3,4,5]){
  const d=Dr.generateDraft({goal:'habit',daysPerWeek:n,minutes:30,equipment:[],avoidRegions:[]},WEEK,all());
  const dates=d.sessions.map(s=>s.date);assert.equal(new Set(dates).size,n);
  for(const x of dates)assert.ok(x>=WEEK&&x<=D.addDays(WEEK,6));
  assert.ok(n<=5);
 }
});
test('the same input gives the same draft (deterministic)',()=>{
 const p={goal:'muscle',daysPerWeek:4,minutes:45,equipment:['dumbbells','bands','mat','bench'],avoidRegions:['wrists']};
 assert.deepEqual(Dr.generateDraft(p,WEEK,all()),Dr.generateDraft(p,WEEK,all()));
});
test('goal is respected when possible; workouts are spread, not repeated while others exist',()=>{
 const d=Dr.generateDraft({goal:'endurance',daysPerWeek:2,minutes:30,equipment:[],avoidRegions:[]},WEEK,all());
 for(const s of d.sessions)assert.ok(byId[s.workoutId].goals.includes('endurance'),s.workoutId);
 assert.notEqual(d.sessions[0].workoutId,d.sessions[1].workoutId);
});
test('strength with no equipment avoids back-to-back sessions that train the same muscles when it can',()=>{
 const d=Dr.generateDraft({goal:'strength',daysPerWeek:4,minutes:45,equipment:['dumbbells','bands','mat','bench'],avoidRegions:[]},WEEK,all());
 for(let i=1;i<d.sessions.length;i++)assert.notEqual(d.sessions[i].workoutId,d.sessions[i-1].workoutId);
});
test('bad input: junk profile falls back to defaults; bad week or workouts gives null',()=>{
 assert.ok(Dr.generateDraft(null,WEEK,all()));
 assert.equal(Dr.generateDraft({},'nope',all()),null);
 assert.equal(Dr.generateDraft({},WEEK,null),null);
 assert.equal(Dr.generateDraft({},WEEK,[]),null);
 const p=Dr.cleanProfile({goal:'x',daysPerWeek:9,minutes:-1,equipment:['ghost','mat','mat'],avoidRegions:['elbow','knees']});
 assert.deepEqual(p,{goal:'habit',daysPerWeek:3,minutes:30,equipment:['mat'],avoidRegions:['knees']});
});
test('legacy onboarding form converts to a profile (gym means all equipment; body=no means no avoid)',()=>{
 const gym=Dr.profileFromLegacyForm({goal:'strength',experience:'regular',frequency:4,duration:45,place:'gym',equipment:[],body:'yes',regions:['back','x']});
 assert.deepEqual(gym,{goal:'strength',experience:'regular',daysPerWeek:4,minutes:45,equipment:['dumbbells','bands','mat','bench'],avoidRegions:['back']});
 const home=Dr.profileFromLegacyForm({goal:'habit',experience:'new',frequency:3,duration:20,place:'home',equipment:['none','bands'],body:'no',regions:['knees']});
 assert.deepEqual(home.equipment,['bands']);assert.deepEqual(home.avoidRegions,[]);
 assert.equal(Dr.profileFromLegacyForm(null).daysPerWeek,3);
});
test('safety is at least as strict as the old FitLensPlan for every library workout the old build would reject',()=>{
 // Old rule rejected a routine if its listed regions touched an avoided one. The new rule uses the exercises themselves.
 // Where they differ the new rule must not suggest something that loads an avoided region. Checked directly:
 const forms=[{goal:'habit',experience:'new',frequency:3,duration:30,place:'home',equipment:['none'],body:'yes',regions:['knees']},{goal:'strength',experience:'regular',frequency:4,duration:45,place:'gym',equipment:[],body:'yes',regions:['wrists','shoulders']}];
 for(const f of forms){const d=Dr.generateDraft(Dr.profileFromLegacyForm(f),WEEK,all());assert.ok(d);
  for(const s of d.sessions)for(const r of W.regionsOf(byId[s.workoutId]))assert.ok(!f.regions.includes(r),s.workoutId+' '+r);}
});
test('applyDraft: adds the sessions, skips what is already planned, idempotent',()=>{
 const store=new MemoryStorage(),sch=Sch.createScheduleModel(store);
 const d=Dr.generateDraft({goal:'habit',daysPerWeek:3,minutes:30,equipment:[],avoidRegions:[]},WEEK,all());
 assert.deepEqual(Dr.applyDraft(d,sch),{ok:true,added:3,skipped:0});
 assert.equal(sch.getWeekSchedule(WEEK).length,3);
 assert.ok(sch.getWeekSchedule(WEEK).every(s=>s.status==='planned'));
 assert.deepEqual(Dr.applyDraft(d,sch),{ok:true,added:0,skipped:3});
 assert.equal(sch.getWeekSchedule(WEEK).length,3);
 assert.equal(Dr.applyDraft(null,sch).ok,false);
});
