/* Pure sample-plan rules shared by setup and Home. No network or AI calls. */
(function(root){
'use strict';
const goals={habit:'Build a habit',strength:'Get stronger',muscle:'Build muscle',endurance:'Improve stamina'};
const regionNames={knees:'Knees',back:'Lower back',wrists:'Wrists',shoulders:'Shoulders',ankles:'Ankles',hips:'Hips'};
const patterns={2:[1,4],3:[0,2,4],4:[0,1,3,5],5:[0,1,3,4,5]};
const library=[
{id:'bodyweight',title:'Bodyweight foundations',kind:'strength',equipment:[],regions:['knees','ankles','hips','back','wrists','shoulders'],exercises:['Chair squat','Wall push-up','Standing hip hinge'],goals:['habit','strength','muscle']},
{id:'upper',title:'Upper-body strength',kind:'strength',equipment:['dumbbells'],regions:['wrists','shoulders','back'],exercises:['Seated dumbbell curl','Seated lateral raise','Supported dumbbell row'],goals:['strength','muscle']},
{id:'lower',title:'Lower-body foundations',kind:'muscle',equipment:[],regions:['knees','ankles','hips','back'],exercises:['Chair squat','Standing calf raise','Glute bridge'],goals:['habit','strength','muscle']},
{id:'core',title:'A little core work',kind:'strength',equipment:[],regions:['hips','back','shoulders'],exercises:['Dead bug','Heel slide','Supine march'],goals:['habit','strength']},
{id:'bands',title:'Band strength',kind:'strength',equipment:['bands'],regions:['wrists','shoulders','back'],exercises:['Band biceps curl','Band pull-apart','Seated band row'],goals:['strength','muscle']},
{id:'walk',title:'A fresh-air walk',kind:'habit',equipment:[],regions:['knees','ankles','hips','back'],exercises:['Easy walking warm-up','Walk at your own pace','Easy walking finish'],goals:['habit','endurance']},
{id:'cardio',title:'Move to your rhythm',kind:'habit',equipment:[],regions:['knees','ankles','hips','back','shoulders'],exercises:['March in place','Side steps','Standing reaches'],goals:['habit','endurance']},
{id:'full',title:'Full-body dumbbells',kind:'muscle',equipment:['dumbbells'],regions:['knees','ankles','hips','back','shoulders','wrists'],exercises:['Goblet squat','Dumbbell floor press','Dumbbell hip hinge'],goals:['strength','muscle']}
];
function normalize(raw={}){
raw=raw&&typeof raw==='object'?raw:{};
return {goal:Object.hasOwn(goals,raw.goal)?raw.goal:null,experience:['new','returning','regular'].includes(raw.experience)?raw.experience:null,frequency:[2,3,4,5].includes(raw.frequency)?raw.frequency:3,duration:[20,30,45].includes(raw.duration)?raw.duration:30,place:['home','gym'].includes(raw.place)?raw.place:null,equipment:[...new Set((Array.isArray(raw.equipment)?raw.equipment:[]).filter(x=>['none','dumbbells','bands','mat','bench'].includes(x)))],body:['no','yes'].includes(raw.body)?raw.body:null,regions:[...new Set((Array.isArray(raw.regions)?raw.regions:[]).filter(x=>Object.hasOwn(regionNames,x)))]};
}
function valid(s,step){if(step===0)return Boolean(s.goal&&s.experience);if(step===1)return [2,3,4,5].includes(s.frequency)&&[20,30,45].includes(s.duration);return Boolean(s.place&&(s.place==='gym'||s.equipment.length)&&s.body&&(s.body==='no'||s.regions.length));}
function weekStart(now=new Date()){
const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'numeric',day:'numeric'}).formatToParts(now).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));
const date=new Date(Date.UTC(parts.year,parts.month-1,parts.day));date.setUTCDate(date.getUTCDate()+(8-date.getUTCDay())%7);return date.toISOString().slice(0,10);
}
function build(raw,now=new Date()){
const s=normalize(raw);if(![0,1,2].every(i=>valid(s,i)))return null;
const excluded=s.body==='yes'?s.regions:[],equipment=s.place==='gym'?['dumbbells','bands','mat','bench']:s.equipment;
const pool=library.filter(r=>r.equipment.every(x=>equipment.includes(x))&&!r.regions.some(x=>excluded.includes(x)));
if(!pool.length)return null;
const ranked=[...pool].sort((a,b)=>Number(b.goals.includes(s.goal))-Number(a.goals.includes(s.goal)));
const days=Array(7).fill(null);patterns[s.frequency].forEach((day,i)=>{const choices=ranked.filter(r=>r.goals.includes(s.goal));const source=choices.length?choices:ranked;const r=source[i%source.length];days[day]={...r,sessionId:'session-'+day+'-'+r.id,timing:null,equipment:[...r.equipment],regions:[...r.regions],exercises:[...r.exercises],duration:s.duration,sets:s.experience==='regular'?3:2};});
return {version:1,weekStart:weekStart(now),form:s,days};
}
function restore(raw){
if(!raw||raw.version!==1||!Array.isArray(raw.days)||raw.days.length!==7)return null;
const fresh=build(raw.form);if(!fresh)return null;const counts=new Map();fresh.days.filter(Boolean).forEach(d=>counts.set(d.id,(counts.get(d.id)||0)+1));
for(const d of raw.days.filter(Boolean)){if(!d||!counts.get(d.id))return null;counts.set(d.id,counts.get(d.id)-1);}if([...counts.values()].some(Boolean))return null;
const byId=Object.fromEntries(fresh.days.filter(Boolean).map(d=>[d.id,d]));
if(typeof raw.weekStart==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(raw.weekStart)&&!Number.isNaN(Date.parse(raw.weekStart+'T12:00:00Z'))&&new Date(raw.weekStart+'T12:00:00Z').toISOString().slice(0,10)===raw.weekStart)fresh.weekStart=raw.weekStart;
const seen=new Set();fresh.days=raw.days.map((d,i)=>{if(!d)return null;let sid=typeof d.sessionId==='string'&&d.sessionId.length<120?d.sessionId:'session-'+i+'-'+d.id;if(seen.has(sid))sid='session-'+i+'-'+d.id;seen.add(sid);const t=d.timing;const timing=t&&typeof t.time==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(t.time)?{time:t.time,enabled:t.enabled===true,before:[0,15,30].includes(t.before)?t.before:0}:null;return {...byId[d.id],sessionId:sid,timing};});return fresh;
}
const api={goals,regionNames,patterns,library,normalize,valid,weekStart,build,restore};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FitLensPlan=api;
})(typeof window!=='undefined'?window:globalThis);
