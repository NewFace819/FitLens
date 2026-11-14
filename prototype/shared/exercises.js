/* Exercise catalog shared by workouts, drafts, history and insights.
   Merged from the old `catalog` in workout-details.js (12 gym exercises) and the exercise names
   in FitLensPlan.library (setup-plan-model.js). `regions` = body regions the exercise loads
   (an exercise is unsafe for a user who avoids any of them). */
(function(root){
'use strict';
const d=(sets,reps,rest)=>({sets,reps,rest});
const G=d(3,'8–12',90),M=d(3,'10–12',90),L=d(3,'10–15',60),B=d(2,'8–12',60),W=d(1,'5 min',0);
const list=[
// from the old catalog
{id:'bench-press',legacyId:'bench',name:'Bench Press',art:'bench',regions:['shoulders','wrists'],equipment:['barbell','bench'],muscles:['chest','shoulders','arms'],defaults:G},
{id:'lat-pulldown',legacyId:'pull',name:'Lat Pulldown',art:'pull',regions:['shoulders'],equipment:['machine'],muscles:['back','arms'],defaults:M},
{id:'seated-row',legacyId:'row',name:'Seated Row',art:'row',regions:['back'],equipment:['machine'],muscles:['back','arms'],defaults:M},
{id:'shoulder-press',legacyId:'press',name:'Shoulder Press',art:'press',regions:['shoulders','wrists'],equipment:['dumbbells'],muscles:['shoulders','arms'],defaults:G},
{id:'lateral-raise',legacyId:'raise',name:'Lateral Raise',art:'raise',regions:['shoulders'],equipment:['dumbbells'],muscles:['shoulders'],defaults:d(3,'12–15',60)},
{id:'triceps-pushdown',legacyId:'cable',name:'Triceps Pushdown',art:'cable',regions:['wrists'],equipment:['machine'],muscles:['arms'],defaults:L},
{id:'goblet-squat',legacyId:'squat',name:'Goblet Squat',art:'press',regions:['knees','hips','ankles'],equipment:['dumbbells'],muscles:['legs','glutes'],defaults:G},
{id:'romanian-deadlift',legacyId:'rdl',name:'Romanian Deadlift',art:'bench',regions:['back','hips'],equipment:['barbell'],muscles:['glutes','legs','back'],defaults:G},
{id:'leg-press',legacyId:'legpress',name:'Leg Press',art:'row',regions:['knees','hips'],equipment:['machine'],muscles:['legs','glutes'],defaults:M},
{id:'leg-curl',legacyId:'curl',name:'Leg Curl',art:'row',regions:['knees'],equipment:['machine'],muscles:['legs'],defaults:L},
{id:'calf-raise',legacyId:'calf',name:'Calf Raise',art:'raise',regions:['ankles'],equipment:[],muscles:['legs'],defaults:d(3,'12–15',60),aliases:['Standing calf raise']},
{id:'biceps-curl',legacyId:'biceps',name:'Biceps Curl',art:'press',regions:['wrists'],equipment:['dumbbells'],muscles:['arms'],defaults:d(3,'10–12',60)},
// from FitLensPlan.library
{id:'chair-squat',name:'Chair squat',art:'press',regions:['knees','hips'],equipment:[],muscles:['legs','glutes'],defaults:B},
{id:'wall-push-up',name:'Wall push-up',art:'bench',regions:['wrists','shoulders'],equipment:[],muscles:['chest','arms','shoulders'],defaults:B},
{id:'standing-hip-hinge',name:'Standing hip hinge',art:'bench',regions:['hips','back'],equipment:[],muscles:['glutes','legs'],defaults:B},
{id:'seated-dumbbell-curl',name:'Seated dumbbell curl',art:'press',regions:['wrists'],equipment:['dumbbells'],muscles:['arms'],defaults:B},
{id:'seated-lateral-raise',name:'Seated lateral raise',art:'raise',regions:['shoulders'],equipment:['dumbbells'],muscles:['shoulders'],defaults:B},
{id:'supported-dumbbell-row',name:'Supported dumbbell row',art:'row',regions:['back','wrists'],equipment:['dumbbells'],muscles:['back','arms'],defaults:B},
{id:'glute-bridge',name:'Glute bridge',art:'bench',regions:['hips','back'],equipment:[],muscles:['glutes','core'],defaults:B},
{id:'dead-bug',name:'Dead bug',art:'bench',regions:['back','shoulders'],equipment:[],muscles:['core'],defaults:B},
{id:'heel-slide',name:'Heel slide',art:'bench',regions:['hips'],equipment:[],muscles:['core','legs'],defaults:B},
{id:'supine-march',name:'Supine march',art:'bench',regions:['hips','back'],equipment:[],muscles:['core'],defaults:B},
{id:'band-biceps-curl',name:'Band biceps curl',art:'press',regions:['wrists'],equipment:['bands'],muscles:['arms'],defaults:B},
{id:'band-pull-apart',name:'Band pull-apart',art:'pull',regions:['shoulders','back'],equipment:['bands'],muscles:['back','shoulders'],defaults:B},
{id:'seated-band-row',name:'Seated band row',art:'row',regions:['back'],equipment:['bands'],muscles:['back','arms'],defaults:B},
{id:'easy-walking-warm-up',name:'Easy walking warm-up',art:'raise',regions:['knees','ankles','hips'],equipment:[],muscles:['legs'],defaults:W},
{id:'walk-at-your-own-pace',name:'Walk at your own pace',art:'raise',regions:['knees','ankles','hips'],equipment:[],muscles:['legs'],defaults:W},
{id:'easy-walking-finish',name:'Easy walking finish',art:'raise',regions:['knees','ankles','hips'],equipment:[],muscles:['legs'],defaults:W},
{id:'march-in-place',name:'March in place',art:'raise',regions:['knees','hips'],equipment:[],muscles:['legs'],defaults:W},
{id:'side-steps',name:'Side steps',art:'raise',regions:['knees','ankles','hips'],equipment:[],muscles:['legs'],defaults:W},
{id:'standing-reaches',name:'Standing reaches',art:'raise',regions:['shoulders','back'],equipment:[],muscles:['shoulders','core'],defaults:W},
{id:'dumbbell-floor-press',name:'Dumbbell floor press',art:'bench',regions:['shoulders','wrists'],equipment:['dumbbells'],muscles:['chest','arms'],defaults:B},
{id:'dumbbell-hip-hinge',name:'Dumbbell hip hinge',art:'bench',regions:['hips','back'],equipment:['dumbbells'],muscles:['glutes','legs','back'],defaults:B}
];
const copy=e=>({...e,regions:[...e.regions],equipment:[...e.equipment],muscles:[...e.muscles],defaults:{...e.defaults},aliases:[...(e.aliases||[])]});
const byLegacy=new Map(list.filter(e=>e.legacyId).map(e=>[e.legacyId,e.id]));
const byId=new Map(list.map(e=>[e.id,e]));
const byName=new Map();for(const e of list){byName.set(e.name.toLowerCase(),e);for(const a of e.aliases||[])byName.set(a.toLowerCase(),e);}
function listExercises(){return list.map(copy);}
function getExercise(id){const e=byId.get(id);return e?copy(e):null;}
function findByName(name){const e=typeof name==='string'?byName.get(name.trim().toLowerCase()):null;return e?copy(e):null;}
/* The old catalog (workout-details.js, workout-active.js) used short ids such as 'bench'. */
function fromLegacyId(id){return byLegacy.get(id)||null;}
function toLegacyId(id){const e=byId.get(id);return e&&e.legacyId?e.legacyId:null;}
const api={listExercises,getExercise,findByName,fromLegacyId,toLegacyId};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FitLensExercises=api;
})(typeof window!=='undefined'?window:globalThis);
