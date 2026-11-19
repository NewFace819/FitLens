'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createStore}=require('../workout-store.js');
const {MemoryStorage,BrokenStorage}=require('./helpers.js');
const P=require('../setup-plan-model.js'),R=require('../reminder-model.js');
// The browser pages (workouts, workout-details, plan) come from the shared prototype refresh and use
// training-model.js; this store is used by the mobile app (mobile/src/modules/workouts).
const dir=path.join(__dirname,'..');
const PAGES=['workouts.html','workout-details.html','plan.html'];

test('every script and stylesheet the workout pages load exists on disk',()=>{
 for(const f of PAGES){const html=fs.readFileSync(path.join(dir,f),'utf8');
  for(const m of html.matchAll(/(?:src|href)="([^"?#]+\.(?:js|css))[^"]*"/g))assert.ok(fs.existsSync(path.join(dir,m[1])),f+' -> '+m[1]);}
});
test('store exposes the functions the contract promises, and works with empty storage',()=>{
 const st=createStore({localStorage:new MemoryStorage(),sessionStorage:new MemoryStorage()});
 for(const fn of ['getWorkout','updateWorkout','getWeekSchedule','getNextSession','markSessionDone','updateSession'])assert.equal(typeof st[fn],'function',fn);
 assert.deepEqual(st.getWeekSchedule('2026-11-09'),[]);
 assert.equal(st.getNextSession(new Date('2026-11-09T00:00:00Z')),null);
 assert.equal(st.getWorkout('tpl-upper').items.length,6);
 assert.equal(st.getWorkout('nope'),null);
});
test('store works even when storage is blocked (falls back to memory)',()=>{
 const st=createStore({localStorage:new BrokenStorage(),sessionStorage:new BrokenStorage()});
 const w=st.createWorkout({title:'x'});assert.ok(w);assert.equal(st.getWorkout(w.id).title,'x');
});
test('migration: weekly plan in sessionStorage and scheduled single sessions become Sessions; idempotent',()=>{
 const local=new MemoryStorage(),session=new MemoryStorage();
 const plan=P.build({goal:'habit',experience:'new',frequency:3,duration:30,place:'home',equipment:['none'],body:'no',regions:[]},new Date('2026-11-09T05:00:00Z'));
 session.setItem('fitlens:weekly-plan',JSON.stringify(plan));
 const single=R.createSingle('Sunday',[{id:'bench',name:'Bench Press',sets:4,reps:'6',rest:120}]);single.schedule={date:'2026-11-15',time:'09:00',enabled:true,before:0};
 const routineSingle=R.createSingle('Upper Body',[],'upper');routineSingle.schedule={date:'2026-11-14',time:'09:00',enabled:true,before:0};
 R.saveSingle(local,single);R.saveSingle(local,routineSingle);
 const host={localStorage:local,sessionStorage:session,FitLensReminders:R};
 const st=createStore(host);
 const r=st.migrate();assert.equal(r.ok,true);assert.equal(r.added,plan.days.filter(Boolean).length+2);
 const week=st.getWeekSchedule('2026-11-09');assert.equal(week.length,plan.days.filter(Boolean).length+2);
 const sunday=week.find(s=>s.date==='2026-11-15');
 const w=st.getWorkout(sunday.workoutId);assert.equal(w.title,'Sunday');assert.equal(w.items[0].exerciseId,'bench-press');assert.equal(w.items[0].sets,4);
 assert.equal(week.find(s=>s.date==='2026-11-14').workoutId,'tpl-upper');
 assert.equal(st.migrate().added,0);
 assert.equal(st.listWorkouts().filter(x=>x.source==='custom').length,1); // no orphan workouts on re-run
 assert.ok(local.getItem('fitlens:single-sessions:v1'),'old data is left in place');
});
