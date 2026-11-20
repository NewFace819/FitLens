/* Draft model: suggests a week from a profile. Pure logic, no storage, no DOM.
   profile = { goal, daysPerWeek 2..5, minutes, equipment[], avoidRegions[] }  (docs/design/DATA_CONTRACT.md)
   Safety rule: a workout is never suggested if ANY of its exercises loads a region in avoidRegions.
   (The old FitLensPlan.build compared whole routines; this checks the exercises themselves.) */
(function(root){
'use strict';
/* Static require() calls so React Native's Metro bundler can follow them; the browser has no `module`, so it uses the globals. */
const CJS=typeof module!=='undefined'&&Boolean(module.exports);
const WM=CJS?require('./workout-model.js'):root.FitLensWorkoutModel;
const Dates=CJS?require('./shared/dates.js'):root.FitLensDates;
const C=CJS?require('./shared/constants.js'):root.FitLensConstants;

/* Weekday offsets from Monday for each frequency; same spread as the old FitLensPlan. */
const PATTERNS=Object.freeze({2:[1,4],3:[0,2,4],4:[0,1,3,5],5:[0,1,3,4,5]});
const GYM_EQUIPMENT=Object.freeze(['dumbbells','bands','mat','bench']);

/* Turn the old onboarding form (FitLensPlan.normalize output) into a profile. */
function profileFromLegacyForm(form){
 const f=form||{};
 const equipment=f.place==='gym'?[...GYM_EQUIPMENT]:(Array.isArray(f.equipment)?f.equipment.filter(x=>C.Equipment.includes(x)):[]);
 return {goal:f.goal||'habit',experience:f.experience||'new',daysPerWeek:f.frequency||3,minutes:f.duration||30,equipment,avoidRegions:f.body==='yes'&&Array.isArray(f.regions)?f.regions.filter(r=>C.Region.includes(r)):[]};
}

function cleanProfile(p){
 const x=p&&typeof p==='object'?p:{};
 return {
  goal:C.Goal.includes(x.goal)?x.goal:'habit',
  daysPerWeek:Number.isInteger(x.daysPerWeek)&&PATTERNS[x.daysPerWeek]?x.daysPerWeek:3,
  minutes:Number.isFinite(x.minutes)&&x.minutes>0?x.minutes:30,
  equipment:[...new Set((Array.isArray(x.equipment)?x.equipment:[]).filter(e=>C.Equipment.includes(e)))],
  avoidRegions:[...new Set((Array.isArray(x.avoidRegions)?x.avoidRegions:[]).filter(r=>C.Region.includes(r)))]
 };
}
const overlaps=(a,b)=>a.some(x=>b.includes(x));

/* Last week's check-in result (Tu's getLoadAdjustForWeek): -0.3 (pain) … +0.1 (felt easy). Anything else → 0.
   It changes the time budget per session by that fraction: lighter weeks pick shorter workouts,
   harder weeks prefer longer ones. A pain week (-0.3) also drops one session (never below 2 a week).
   The safety filter (avoidRegions, equipment) runs first and is never relaxed. */
const LOAD_MIN=-0.3,LOAD_MAX=0.1;
function adjustFor(p,loadAdjust){
 const a=Number.isFinite(loadAdjust)?Math.min(LOAD_MAX,Math.max(LOAD_MIN,loadAdjust)):0;
 const reason=a<=LOAD_MIN?'pain':a<0?'hard':a>0?'easy':null;
 return {loadAdjust:a,reason,minutes:Math.max(10,Math.round(p.minutes*(1+a))),daysPerWeek:reason==='pain'?Math.max(2,p.daysPerWeek-1):p.daysPerWeek};
}

/* workouts: Workout[] (usually listWorkouts()). Only workouts that carry `goals` are suggested (the plan templates).
   Returns { weekStart, profile, adjust, sessions:[{workoutId,date,time:null}] } or null when nothing safe is available.
   adjust = { loadAdjust, reason: 'pain'|'hard'|'easy'|null, minutes, daysPerWeek } (what was actually used). */
function generateDraft(profile,weekStart,workouts,loadAdjust=0){
 const p=cleanProfile(profile),start=Dates.weekStartOf(weekStart);
 if(!start||!Array.isArray(workouts))return null;
 const adjust=adjustFor(p,loadAdjust);
 const safe=workouts.filter(w=>Array.isArray(w.goals)&&w.items.length>0
  &&WM.equipmentOf(w).every(e=>p.equipment.includes(e))
  &&!overlaps(WM.regionsOf(w),p.avoidRegions));
 if(!safe.length)return null;
 const fits=safe.filter(w=>WM.estimateMinutes(w)<=adjust.minutes);
 const pool=(fits.length?fits:safe).map(w=>({w,onGoal:w.goals.includes(p.goal),muscles:WM.musclesOf(w),minutes:WM.estimateMinutes(w)}));
 const longerFirst=adjust.reason==='easy';
 pool.sort((a,b)=>Number(b.onGoal)-Number(a.onGoal)||(longerFirst?b.minutes-a.minutes:a.minutes-b.minutes)||(a.w.id<b.w.id?-1:1));
 const preferred=pool.some(c=>c.onGoal)?pool.filter(c=>c.onGoal):pool;
 const days=PATTERNS[adjust.daysPerWeek],sessions=[];let prev=null;const used=new Map();
 days.forEach((offset,i)=>{
  // least used first, then prefer a different muscle group from the previous session, then goal order
  const ranked=[...preferred].sort((a,b)=>(used.get(a.w.id)||0)-(used.get(b.w.id)||0)
   ||Number(prev?overlaps(a.muscles,prev.muscles):0)-Number(prev?overlaps(b.muscles,prev.muscles):0)
   ||preferred.indexOf(a)-preferred.indexOf(b));
  const pick=ranked[0];used.set(pick.w.id,(used.get(pick.w.id)||0)+1);prev=pick;
  sessions.push({workoutId:pick.w.id,date:Dates.addDays(start,offset),time:null});
 });
 return {weekStart:start,profile:p,adjust,sessions};
}

/* Writes a draft into the schedule. scheduleModel = createScheduleModel(...).
   Skips a session if the same workout is already planned on that date, so applying twice adds nothing new. */
function applyDraft(draft,scheduleModel){
 if(!draft||!Array.isArray(draft.sessions))return {ok:false,reason:'invalidDraft'};
 const existing=scheduleModel.getWeekSchedule(draft.weekStart);let added=0,skipped=0;
 for(const s of draft.sessions){
  if(existing.some(e=>e.workoutId===s.workoutId&&e.date===s.date&&e.status==='planned')){skipped++;continue;}
  const r=scheduleModel.addSession({workoutId:s.workoutId,date:s.date,time:s.time});
  if(r.ok)added++;else skipped++;
 }
 return {ok:true,added,skipped};
}
const api={PATTERNS,GYM_EQUIPMENT,LOAD_MIN,LOAD_MAX,adjustFor,cleanProfile,profileFromLegacyForm,generateDraft,applyDraft};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FitLensDraftModel=api;
})(typeof window!=='undefined'?window:globalThis);
