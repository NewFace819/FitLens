'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Sch=require('../schedule-model.js'),W=require('../workout-model.js'),S=require('../shared/storage.js'),P=require('../setup-plan-model.js');
const {MemoryStorage,BrokenStorage}=require('./helpers.js');
const fresh=opts=>{const s=new MemoryStorage();return {s,m:Sch.createScheduleModel(s,opts)};};
const WEEK='2026-11-09'; // Monday

test('getWeekSchedule: sorted by date then time (no time last), other weeks excluded',()=>{
 const {m}=fresh();
 m.addSession({workoutId:'tpl-core',date:'2026-11-11',time:'18:00'});
 m.addSession({workoutId:'tpl-core',date:'2026-11-09'});
 m.addSession({workoutId:'tpl-core',date:'2026-11-11',time:'07:30'});
 m.addSession({workoutId:'tpl-core',date:'2026-11-16',time:'07:30'}); // next week
 m.addSession({workoutId:'tpl-core',date:'2026-11-08',time:'07:30'}); // previous Sunday
 const w=m.getWeekSchedule(WEEK);
 assert.deepEqual(w.map(s=>s.date+' '+s.time),['2026-11-09 null','2026-11-11 07:30','2026-11-11 18:00']);
 assert.deepEqual(m.getWeekSchedule('2026-11-12').map(s=>s.id),w.map(s=>s.id)); // any day of the week works
 assert.deepEqual(m.getWeekSchedule('nonsense'),[]);
 assert.deepEqual(fresh().m.getWeekSchedule(WEEK),[]); // empty week is [] not null
});
test('addSession validates input',()=>{
 const {m}=fresh({workoutExists:id=>id==='tpl-core'});
 assert.equal(m.addSession({workoutId:'ghost',date:WEEK}).reason,'workoutNotFound');
 assert.equal(m.addSession({workoutId:'tpl-core',date:'2026-02-30'}).reason,'invalidDate');
 assert.equal(m.addSession({workoutId:'tpl-core',date:WEEK,time:'25:00'}).reason,'invalidTime');
 assert.equal(m.addSession({}).ok,false);
 const ok=m.addSession({workoutId:'tpl-core',date:WEEK,time:'06:00'});
 assert.equal(ok.ok,true);assert.equal(ok.session.status,'planned');assert.match(ok.session.id,/^ss-/);
});
test('same date and same time is a conflict, in add and in update; no-time sessions never clash',()=>{
 const {m}=fresh();
 const a=m.addSession({workoutId:'tpl-core',date:WEEK,time:'18:00'}).session;
 assert.equal(m.addSession({workoutId:'tpl-bands',date:WEEK,time:'18:00'}).reason,'conflict');
 const b=m.addSession({workoutId:'tpl-bands',date:WEEK,time:'19:00'}).session;
 assert.equal(m.updateSession(b.id,{time:'18:00'}).reason,'conflict');
 assert.equal(m.getSession(b.id).time,'19:00'); // unchanged after refusal
 assert.equal(m.updateSession(a.id,{time:'18:00'}).ok,true); // keeping own slot is fine
 assert.equal(m.addSession({workoutId:'tpl-bands',date:WEEK}).ok,true);
 assert.equal(m.addSession({workoutId:'tpl-bands',date:WEEK}).ok,true);
});
test('updateSession / moveSession: invalid values refused, unknown id refused',()=>{
 const {m}=fresh();
 const a=m.addSession({workoutId:'tpl-core',date:WEEK}).session;
 assert.equal(m.updateSession(a.id,{time:'24:00'}).reason,'invalidTime');
 assert.equal(m.updateSession(a.id,{date:'x'}).reason,'invalidDate');
 assert.equal(m.updateSession('ss-none',{time:'10:00'}).reason,'notFound');
 assert.equal(m.moveSession(a.id,'2026-11-12').session.date,'2026-11-12');
 assert.equal(m.updateSession(a.id,{time:null}).session.time,null);
});
test('removeSession and markSessionDone',()=>{
 const {m}=fresh();
 const a=m.addSession({workoutId:'tpl-core',date:WEEK}).session;
 assert.equal(m.markSessionDone(a.id).status,'done');
 assert.equal(m.markSessionDone('ss-none'),null);
 assert.equal(m.removeSession(a.id),true);
 assert.equal(m.removeSession(a.id),false);
 assert.equal(m.getSession(a.id),null);
});
test('getNextSession: before first, between, after last, done ones skipped, past time today skipped',()=>{
 const {m}=fresh();
 const at=(d,t)=>new Date(d+'T'+t+':00+07:00'); // Ho Chi Minh local
 assert.equal(m.getNextSession(at('2026-11-09','08:00')),null); // nothing scheduled
 const a=m.addSession({workoutId:'tpl-core',date:'2026-11-10',time:'07:00'}).session;
 const b=m.addSession({workoutId:'tpl-core',date:'2026-11-12',time:'18:00'}).session;
 const c=m.addSession({workoutId:'tpl-core',date:'2026-11-12'}).session; // no time
 assert.equal(m.getNextSession(at('2026-11-09','23:00')).id,a.id);
 assert.equal(m.getNextSession(at('2026-11-10','07:00')).id,a.id); // exactly now still counts
 assert.equal(m.getNextSession(at('2026-11-10','07:01')).id,b.id); // a is past today, b next
 assert.equal(m.getNextSession(at('2026-11-12','18:01')).id,c.id); // no-time session counts all day
 m.markSessionDone(c.id);
 assert.equal(m.getNextSession(at('2026-11-12','18:01')),null);
});
test('copyWeek keeps workout and time, resets status, new ids, same weekday; skips clashes',()=>{
 const {m}=fresh();
 const a=m.addSession({workoutId:'tpl-core',date:'2026-11-09',time:'18:00'}).session;
 const b=m.addSession({workoutId:'tpl-bands',date:'2026-11-11'}).session;
 m.markSessionDone(b.id);
 const r=m.copyWeek(WEEK,'2026-11-16');
 assert.equal(r.ok,true);assert.equal(r.created.length,2);assert.equal(r.skipped,0);
 const next=m.getWeekSchedule('2026-11-16');
 assert.deepEqual(next.map(s=>[s.workoutId,s.date,s.time,s.status]),[['tpl-core','2026-11-16','18:00','planned'],['tpl-bands','2026-11-18',null,'planned']]);
 assert.ok(!next.some(s=>s.id===a.id||s.id===b.id));
 const again=m.copyWeek(WEEK,'2026-11-16'); // timed one now clashes
 assert.equal(again.skipped,1);
 assert.equal(m.copyWeek(WEEK,WEEK).reason,'sameWeek');
 assert.equal(m.copyWeek('x',WEEK).reason,'invalidDate');
});
test('corrupt or junk stored data never throws',()=>{
 const {m,s}=fresh();
 s.setItem(Sch.KEY,'{nope');assert.deepEqual(m.listSessions(),[]);
 S.write(s,Sch.KEY,[null,{id:'ss-1'},{id:'ss-2',workoutId:'tpl-core',date:WEEK,time:'99:99',status:'weird'}]);
 const all=m.listSessions();assert.equal(all.length,1);assert.equal(all[0].time,null);assert.equal(all[0].status,'planned');
 const b=Sch.createScheduleModel(new BrokenStorage());
 assert.deepEqual(b.getWeekSchedule(WEEK),[]);assert.equal(b.addSession({workoutId:'tpl-core',date:WEEK}).reason,'storage');
});
test('migrateLegacy from FitLensPlan.build: right count, dates, times; idempotent',()=>{
 const plan=P.build({goal:'strength',experience:'regular',frequency:3,duration:30,place:'gym',equipment:[],body:'no',regions:[]},new Date('2026-11-09T05:00:00Z'));
 assert.ok(plan);
 const first=plan.days.findIndex(Boolean);
 plan.days[first].timing={time:'18:30',enabled:true,before:15};
 const {m}=fresh();
 const r=m.migrateLegacy({plan});
 assert.equal(r.added,plan.days.filter(Boolean).length);
 const all=m.listSessions();
 assert.equal(all.length,3);
 const firstDate=all.find(s=>s.date===require('../shared/dates.js').addDays(plan.weekStart,first));
 assert.equal(firstDate.time,'18:30');
 for(const s of all)assert.ok(W.TEMPLATES.some(t=>t.id===s.workoutId),s.workoutId);
 assert.equal(m.migrateLegacy({plan}).added,0);
 assert.equal(m.listSessions().length,3);
});
test('migrateLegacy singles: only scheduled ones, via resolveSingle, idempotent',()=>{
 const {m}=fresh();
 const singles=[{id:'single-a',name:'A',items:[],schedule:{date:WEEK,time:'06:30',enabled:true,before:0}},{id:'single-b',name:'B',items:[],schedule:null}];
 const calls=[];const resolveSingle=s=>{calls.push(s.id);return 'tpl-core';};
 assert.equal(m.migrateLegacy({singles,resolveSingle}).added,1);
 assert.deepEqual(calls,['single-a']);
 assert.equal(m.migrateLegacy({singles,resolveSingle}).added,0);
 assert.equal(m.getWeekSchedule(WEEK)[0].time,'06:30');
 assert.equal(m.migrateLegacy({}).added,0);
});
test('workout delete is blocked by schedule through getSessions',()=>{
 const s=new MemoryStorage();
 const sch=Sch.createScheduleModel(s);
 const wk=W.createWorkoutModel(s,{getSessions:()=>sch.listSessions()});
 const w=wk.createWorkout({title:'A',items:[{exerciseId:'dead-bug'}]});
 const added=sch.addSession({workoutId:w.id,date:WEEK}).session;
 assert.equal(wk.deleteWorkout(w.id).reason,'scheduled');
 sch.markSessionDone(added.id);
 assert.equal(wk.deleteWorkout(w.id).ok,true);
});
