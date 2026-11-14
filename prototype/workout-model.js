/* Workout model: templates (read-only constants) + custom workouts (localStorage).
   Pure logic, no DOM. Pass the Storage object in. See docs/design/DATA_CONTRACT.md. */
(function(root){
'use strict';
const req=typeof require==='function'&&typeof module!=='undefined'?require:null;
const Ex=req?req('./shared/exercises.js'):root.FitLensExercises;
const Storage=req?req('./shared/storage.js'):root.FitLensStorage;
const Ids=req?req('./shared/ids.js'):root.FitLensIds;
const C=req?req('./shared/constants.js'):root.FitLensConstants;
const KEY='fitlens.workouts';

function itemOf(exerciseId){const e=Ex.getExercise(exerciseId);return {exerciseId,sets:e.defaults.sets,reps:e.defaults.reps,rest:e.defaults.rest};}
function tpl(id,title,exerciseIds,extra={}){return Object.freeze({id:'tpl-'+id,source:'template',title,items:Object.freeze(exerciseIds.map(itemOf)),updatedAt:null,...extra});}
const TEMPLATES=Object.freeze([
 // gym routines (from the old `routines` in workout-details.js)
 tpl('upper','Upper Body',['bench-press','lat-pulldown','seated-row','shoulder-press','lateral-raise','triceps-pushdown'],{detail:'Chest · Back · Shoulders'}),
 tpl('lower','Lower Body',['goblet-squat','romanian-deadlift','leg-press','leg-curl','calf-raise'],{detail:'Legs · Glutes'}),
 tpl('full','Full Body',['goblet-squat','bench-press','romanian-deadlift','lat-pulldown','shoulder-press','seated-row','lateral-raise'],{detail:'A little of everything'}),
 // plan library (from FitLensPlan.library in setup-plan-model.js)
 tpl('bodyweight','Bodyweight foundations',['chair-squat','wall-push-up','standing-hip-hinge'],{kind:'strength',goals:['habit','strength','muscle']}),
 tpl('upper-plan','Upper-body strength',['seated-dumbbell-curl','seated-lateral-raise','supported-dumbbell-row'],{kind:'strength',goals:['strength','muscle']}),
 tpl('lower-plan','Lower-body foundations',['chair-squat','calf-raise','glute-bridge'],{kind:'muscle',goals:['habit','strength','muscle']}),
 tpl('core','A little core work',['dead-bug','heel-slide','supine-march'],{kind:'strength',goals:['habit','strength']}),
 tpl('bands','Band strength',['band-biceps-curl','band-pull-apart','seated-band-row'],{kind:'strength',goals:['strength','muscle']}),
 tpl('walk','A fresh-air walk',['easy-walking-warm-up','walk-at-your-own-pace','easy-walking-finish'],{kind:'habit',goals:['habit','endurance']}),
 tpl('cardio','Move to your rhythm',['march-in-place','side-steps','standing-reaches'],{kind:'habit',goals:['habit','endurance']}),
 tpl('full-plan','Full-body dumbbells',['goblet-squat','dumbbell-floor-press','dumbbell-hip-hinge'],{kind:'muscle',goals:['strength','muscle']})
]);
const templateById=new Map(TEMPLATES.map(t=>[t.id,t]));

const clone=w=>({...w,items:w.items.map(i=>({...i})),...(w.goals?{goals:[...w.goals]}:{})});
const int=(v,min,max,fallback)=>{const n=Number(v);return Number.isInteger(n)&&n>=min&&n<=max?n:fallback;};
function cleanItems(raw){
 if(!Array.isArray(raw))return [];
 return raw.filter(i=>i&&typeof i.exerciseId==='string'&&Ex.getExercise(i.exerciseId)).map(i=>{
  const d=Ex.getExercise(i.exerciseId).defaults;
  return {exerciseId:i.exerciseId,sets:int(i.sets,1,20,d.sets),reps:typeof i.reps==='string'&&i.reps.trim()?i.reps.trim().slice(0,20):(Number.isInteger(i.reps)&&i.reps>0?String(i.reps):d.reps),rest:int(i.rest,0,600,d.rest)};
 });
}
const cleanTitle=(t,fallback)=>typeof t==='string'&&t.trim()?t.trim().slice(0,80):fallback;
function cleanCustom(raw){
 if(!raw||typeof raw.id!=='string'||!raw.id.startsWith('wk-'))return null;
 return {id:raw.id,source:'custom',title:cleanTitle(raw.title,'My workout'),items:cleanItems(raw.items),updatedAt:typeof raw.updatedAt==='string'?raw.updatedAt:null,...(typeof raw.basedOn==='string'?{basedOn:raw.basedOn}:{})};
}

/* Derived values: never stored. */
function secondsOf(item){const m=/^(\d+)\s*min/i.exec(String(item.reps));const work=m?Number(m[1])*60:40;return item.sets*(work+item.rest);}
function estimateMinutes(w){return Math.round(w.items.reduce((s,i)=>s+secondsOf(i),0)/60);}
function union(w,field,order){const set=new Set();for(const i of w.items){const e=Ex.getExercise(i.exerciseId);if(e)e[field].forEach(x=>set.add(x));}return order?order.filter(x=>set.has(x)):[...set];}
const equipmentOf=w=>union(w,'equipment',C.Equipment);
const regionsOf=w=>union(w,'regions',C.Region);
const musclesOf=w=>union(w,'muscles',C.Muscle);

/* opts.getSessions(): Session[] (used to block deleting a scheduled workout); opts.now(): Date */
function createWorkoutModel(storage,opts={}){
 const getSessions=opts.getSessions||(()=>[]),now=opts.now||(()=>new Date());
 const readCustom=()=>{const raw=Storage.read(storage,KEY,[]);return (Array.isArray(raw)?raw:[]).map(cleanCustom).filter(Boolean);};
 const writeCustom=list=>Storage.write(storage,KEY,list);
 function listWorkouts(){return [...TEMPLATES.map(clone),...readCustom().sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))).map(clone)];}
 function getWorkout(id){const t=templateById.get(id);if(t)return clone(t);const c=readCustom().find(w=>w.id===id);return c?clone(c):null;}
 function createWorkout(data={}){
  const w={id:Ids.newId('wk'),source:'custom',title:cleanTitle(data.title,'My workout'),items:cleanItems(data.items),updatedAt:now().toISOString()};
  if(typeof data.basedOn==='string')w.basedOn=data.basedOn;
  const list=readCustom();list.push(w);return writeCustom(list)?clone(w):null;
 }
 function updateWorkout(id,patch={}){
  const t=templateById.get(id);
  if(t)return createWorkout({title:patch.title!==undefined?patch.title:t.title,items:patch.items!==undefined?patch.items:t.items,basedOn:t.id});
  const list=readCustom(),i=list.findIndex(w=>w.id===id);if(i<0)return null;
  const next={...list[i],updatedAt:now().toISOString()};
  if(patch.title!==undefined)next.title=cleanTitle(patch.title,list[i].title);
  if(patch.items!==undefined)next.items=cleanItems(patch.items);
  list[i]=next;return writeCustom(list)?clone(next):null;
 }
 function deleteWorkout(id){
  if(templateById.has(id))return {ok:false,reason:'template'};
  const list=readCustom();if(!list.some(w=>w.id===id))return {ok:false,reason:'notFound'};
  const planned=getSessions().filter(s=>s&&s.workoutId===id&&s.status==='planned').length;
  if(planned)return {ok:false,reason:'scheduled',count:planned};
  return writeCustom(list.filter(w=>w.id!==id))?{ok:true}:{ok:false,reason:'storage'};
 }
 return {listWorkouts,getWorkout,createWorkout,updateWorkout,deleteWorkout};
}
const api={KEY,TEMPLATES,createWorkoutModel,estimateMinutes,equipmentOf,regionsOf,musclesOf,templateIdForRoutine:k=>'tpl-'+k};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FitLensWorkoutModel=api;
})(typeof window!=='undefined'?window:globalThis);
