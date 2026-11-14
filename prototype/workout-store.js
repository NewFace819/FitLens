/* Browser glue: binds the workout and schedule models to localStorage and exposes window.FitLensWorkout,
   the functions other pages call (docs/design/DATA_CONTRACT.md section 6). Runs the legacy migration once per load.
   Load after shared/*.js, workout-model.js and schedule-model.js. */
(function(root){
'use strict';
const req=typeof require==='function'&&typeof module!=='undefined'?require:null;
const WM=req?req('./workout-model.js'):root.FitLensWorkoutModel;
const SM=req?req('./schedule-model.js'):root.FitLensScheduleModel;
const Ex=req?req('./shared/exercises.js'):root.FitLensExercises;
const Dates=req?req('./shared/dates.js'):root.FitLensDates;

function memoryStorage(){const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};}
function pickStorage(host,name){try{const s=host&&host[name];if(s){s.getItem('fitlens.probe');return s;}}catch{}return null;}

/* host: window (or a fake in tests). Falls back to memory when storage is blocked. */
function createStore(host){
 const local=pickStorage(host,'localStorage')||memoryStorage();
 const session=pickStorage(host,'sessionStorage');
 let sch=null;
 const wk=WM.createWorkoutModel(local,{getSessions:()=>sch.listSessions()});
 sch=SM.createScheduleModel(local,{workoutExists:id=>Boolean(wk.getWorkout(id))});

 /* Turn an old "single session" (FitLensReminders) into a Workout id. Old items use the short catalog ids. */
 function resolveSingle(single){
  if(single.routine&&(!Array.isArray(single.items)||!single.items.length))return 'tpl-'+single.routine;
  const items=(Array.isArray(single.items)?single.items:[]).map(i=>({exerciseId:Ex.fromLegacyId(i.id)||i.id,sets:i.sets,reps:i.reps,rest:i.rest})).filter(i=>Ex.getExercise(i.exerciseId));
  const w=wk.createWorkout({title:single.name,items});return w?w.id:null;
 }
 function migrate(){
  let plan=null,singles=[];
  try{plan=session?JSON.parse(session.getItem('fitlens:weekly-plan')):null;}catch{}
  try{singles=host.FitLensReminders?host.FitLensReminders.singles(local):[];}catch{}
  try{return sch.migrateLegacy({plan,singles,resolveSingle});}catch{return {ok:false,reason:'error',added:0};}
 }
 const api={
  // Workouts (Hải)
  getWorkout:wk.getWorkout,updateWorkout:wk.updateWorkout,listWorkouts:wk.listWorkouts,createWorkout:wk.createWorkout,deleteWorkout:wk.deleteWorkout,
  // Schedule (Hải)
  getWeekSchedule:sch.getWeekSchedule,getNextSession:sch.getNextSession,markSessionDone:sch.markSessionDone,
  updateSession:sch.updateSession,addSession:sch.addSession,moveSession:sch.moveSession,removeSession:sch.removeSession,copyWeek:sch.copyWeek,listSessions:sch.listSessions,
  // helpers
  estimateMinutes:WM.estimateMinutes,equipmentOf:WM.equipmentOf,musclesOf:WM.musclesOf,regionsOf:WM.regionsOf,
  weekStartOf:Dates.weekStartOf,todayStr:Dates.todayStr,
  migrate
 };
 return api;
}
if(typeof module!=='undefined'&&module.exports)module.exports={createStore};
else{root.FitLensWorkout=createStore(root);root.FitLensWorkout.migrate();}
})(typeof window!=='undefined'?window:globalThis);
