/* Schedule model: Session[] in localStorage. Pure logic, no DOM. Pass the Storage object in.
   Session = { id, workoutId, date 'YYYY-MM-DD', time 'HH:mm'|null, status 'planned'|'done'|'skipped' }
   Mutations return { ok:true, ... } or { ok:false, reason }, so the UI can explain a refusal. */
(function(root){
'use strict';
const req=typeof require==='function'&&typeof module!=='undefined'?require:null;
const Dates=req?req('./shared/dates.js'):root.FitLensDates;
const Storage=req?req('./shared/storage.js'):root.FitLensStorage;
const Ids=req?req('./shared/ids.js'):root.FitLensIds;
const C=req?req('./shared/constants.js'):root.FitLensConstants;
const KEY='fitlens.sessions';
const LEGACY_LIBRARY_TO_TEMPLATE={bodyweight:'tpl-bodyweight',upper:'tpl-upper-plan',lower:'tpl-lower-plan',core:'tpl-core',bands:'tpl-bands',walk:'tpl-walk',cardio:'tpl-cardio',full:'tpl-full-plan'};

function cleanSession(raw){
 if(!raw||typeof raw.id!=='string'||!raw.id||typeof raw.workoutId!=='string'||!raw.workoutId||!Dates.isValidDate(raw.date))return null;
 const s={id:raw.id,workoutId:raw.workoutId,date:raw.date,time:Dates.isValidTime(raw.time)?raw.time:null,status:C.SessionStatus.includes(raw.status)?raw.status:'planned'};
 if(typeof raw.legacyKey==='string')s.legacyKey=raw.legacyKey;
 return s;
}
const byWhen=(a,b)=>Dates.compare(a.date,b.date)||Dates.compare(a.time||'99:99',b.time||'99:99')||Dates.compare(a.id,b.id);
const copy=s=>({...s});

/* opts.workoutExists(id): boolean (optional) */
function createScheduleModel(storage,opts={}){
 const workoutExists=opts.workoutExists||(()=>true);
 const read=()=>{const raw=Storage.read(storage,KEY,[]);return (Array.isArray(raw)?raw:[]).map(cleanSession).filter(Boolean);};
 const write=list=>Storage.write(storage,KEY,list);
 const clashes=(list,date,time,exceptId)=>time!==null&&list.some(s=>s.id!==exceptId&&s.date===date&&s.time===time);

 function listSessions(){return read().sort(byWhen).map(copy);}
 function getSession(id){const s=read().find(x=>x.id===id);return s?copy(s):null;}
 function getWeekSchedule(weekStart){
  const days=Dates.weekDates(weekStart);if(!days.length)return [];
  return read().filter(s=>s.date>=days[0]&&s.date<=days[6]).sort(byWhen).map(copy);
 }
 function addSession(data={}){
  const time=data.time===undefined||data.time===null?null:data.time;
  if(typeof data.workoutId!=='string'||!data.workoutId||!workoutExists(data.workoutId))return {ok:false,reason:'workoutNotFound'};
  if(!Dates.isValidDate(data.date))return {ok:false,reason:'invalidDate'};
  if(time!==null&&!Dates.isValidTime(time))return {ok:false,reason:'invalidTime'};
  const list=read();if(clashes(list,data.date,time,null))return {ok:false,reason:'conflict'};
  const s={id:Ids.newId('ss'),workoutId:data.workoutId,date:data.date,time,status:'planned'};
  list.push(s);return write(list)?{ok:true,session:copy(s)}:{ok:false,reason:'storage'};
 }
 function updateSession(id,patch={}){
  const list=read(),i=list.findIndex(s=>s.id===id);if(i<0)return {ok:false,reason:'notFound'};
  const next={...list[i]};
  if(patch.date!==undefined){if(!Dates.isValidDate(patch.date))return {ok:false,reason:'invalidDate'};next.date=patch.date;}
  if(patch.time!==undefined){if(patch.time!==null&&!Dates.isValidTime(patch.time))return {ok:false,reason:'invalidTime'};next.time=patch.time;}
  if(clashes(list,next.date,next.time,id))return {ok:false,reason:'conflict'};
  list[i]=next;return write(list)?{ok:true,session:copy(next)}:{ok:false,reason:'storage'};
 }
 const moveSession=(id,date)=>updateSession(id,{date});
 function removeSession(id){const list=read();if(!list.some(s=>s.id===id))return false;return write(list.filter(s=>s.id!==id));}
 function markSessionDone(id){
  const list=read(),i=list.findIndex(s=>s.id===id);if(i<0)return null;
  list[i]={...list[i],status:'done'};return write(list)?copy(list[i]):null;
 }
 function copyWeek(fromWeek,toWeek){
  const from=Dates.weekStartOf(fromWeek),to=Dates.weekStartOf(toWeek);
  if(!from||!to)return {ok:false,reason:'invalidDate'};if(from===to)return {ok:false,reason:'sameWeek'};
  const list=read(),fromDays=Dates.weekDates(from),created=[];let skipped=0;
  for(const s of list.filter(x=>x.date>=fromDays[0]&&x.date<=fromDays[6]).sort(byWhen)){
   const date=Dates.addDays(to,fromDays.indexOf(s.date));
   if(clashes(list,date,s.time,null)){skipped++;continue;}
   const c={id:Ids.newId('ss'),workoutId:s.workoutId,date,time:s.time,status:'planned'};list.push(c);created.push(c);
  }
  return write(list)?{ok:true,created:created.map(copy),skipped}:{ok:false,reason:'storage'};
 }
 /* Next planned session at or after `now`. A session with no time counts for the whole day. */
 function getNextSession(now=new Date()){
  const today=Dates.todayStr(now),time=Dates.nowTimeStr(now);
  const next=read().filter(s=>s.status==='planned'&&(s.date>today||(s.date===today&&(s.time===null||s.time>=time)))).sort(byWhen)[0];
  return next?copy(next):null;
 }
 /* One-way migration of old data. Input is already parsed:
    plan = FitLensPlan weekly plan {weekStart, days[7]} | null, singles = FitLensReminders.singles(),
    resolveSingle(single) -> workoutId | null (the caller makes a custom Workout for it). Safe to run repeatedly. */
 function migrateLegacy({plan=null,singles=[],resolveSingle=()=>null}={}){
  const list=read(),known=new Set(list.map(s=>s.legacyKey).filter(Boolean));let added=0;
  /* getWorkoutId is lazy so a custom Workout is only created for a session that will really be added. */
  const push=(legacyKey,getWorkoutId,date,time)=>{
   if(known.has(legacyKey)||!Dates.isValidDate(date)||clashes(list,date,time,null))return;
   const workoutId=getWorkoutId();if(!workoutId)return;
   list.push({id:Ids.newId('ss'),workoutId,date,time,status:'planned',legacyKey});known.add(legacyKey);added++;
  };
  if(plan&&Array.isArray(plan.days)&&Dates.isValidDate(plan.weekStart)){
   plan.days.forEach((d,i)=>{
    if(!d||typeof d.id!=='string')return;
    const tplId=LEGACY_LIBRARY_TO_TEMPLATE[d.id];if(!tplId)return;
    const time=d.timing&&Dates.isValidTime(d.timing.time)?d.timing.time:null;
    push('plan:'+plan.weekStart+':'+(typeof d.sessionId==='string'?d.sessionId:i),()=>tplId,Dates.addDays(plan.weekStart,i),time);
   });
  }
  for(const s of Array.isArray(singles)?singles:[]){
   if(!s||typeof s.id!=='string'||!s.schedule)continue;
   const key='single:'+s.id;if(known.has(key))continue;
   push(key,()=>resolveSingle(s),s.schedule.date,Dates.isValidTime(s.schedule.time)?s.schedule.time:null);
  }
  return added&&!write(list)?{ok:false,reason:'storage',added:0}:{ok:true,added};
 }
 return {listSessions,getSession,getWeekSchedule,addSession,updateSession,moveSession,removeSession,markSessionDone,copyWeek,getNextSession,migrateLegacy};
}
const api={KEY,createScheduleModel};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FitLensScheduleModel=api;
})(typeof window!=='undefined'?window:globalThis);
