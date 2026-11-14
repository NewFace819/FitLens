'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createStore}=require('../workout-store.js');
const {MemoryStorage,BrokenStorage}=require('./helpers.js');
const P=require('../setup-plan-model.js'),R=require('../reminder-model.js');
const dir=path.join(__dirname,'..');
const PAGES=['workouts.html','workout-details.html','plan.html'];

test('workout pages no longer link to chat ("Ask FitLens" removed)',()=>{
 for(const f of PAGES){const html=fs.readFileSync(path.join(dir,f),'utf8');
  for(const bad of ['chat-entry','chat.html','Ask FitLens','Ask about this'])assert.ok(!html.includes(bad),f+' contains '+bad);}
 for(const f of ['workouts.js','workout-details.js']){const js=fs.readFileSync(path.join(dir,f),'utf8');assert.ok(!js.includes('chat.html'),f);}
});
test('every script and stylesheet the workout pages load exists on disk',()=>{
 for(const f of PAGES){const html=fs.readFileSync(path.join(dir,f),'utf8');
  for(const m of html.matchAll(/(?:src|href)="([^"?#]+\.(?:js|css))[^"]*"/g))assert.ok(fs.existsSync(path.join(dir,m[1])),f+' -> '+m[1]);}
});
test('model scripts load before the page script (defer keeps order)',()=>{
 for(const [f,own] of [['workouts.html','workouts.js'],['workout-details.html','workout-details.js'],['plan.html','plan.js']]){
  const html=fs.readFileSync(path.join(dir,f),'utf8');const at=n=>html.indexOf('src="'+n);
  for(const dep of ['shared/constants.js','shared/dates.js','shared/storage.js','shared/ids.js','shared/exercises.js','workout-model.js','schedule-model.js','workout-store.js'])assert.ok(at(dep)>-1&&at(dep)<at(own),f+' '+dep);}
 const plan=fs.readFileSync(path.join(dir,'plan.html'),'utf8');assert.ok(plan.indexOf('src="draft-model.js')>-1&&plan.indexOf('src="draft-model.js')<plan.indexOf('src="plan.js'));
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
test('Workouts page links Manage Schedule to plan.html',()=>{
 assert.ok(fs.readFileSync(path.join(dir,'workouts.js'),'utf8').includes("location.href='plan.html'"));
});
