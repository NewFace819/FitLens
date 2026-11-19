/* Shared local prototype model: reusable workouts, dated sessions and actual history.
   Dates are civil dates in Asia/Ho_Chi_Minh. Suggestions use this local catalogue,
   not a network AI service. Existing legacy records are imported without deleting them. */
(function(root){'use strict';
const KEY='fitlens:training:v1';
const E={
 bench:{name:'Bench Press',title:['BENCH','PRESS'],art:'bench',sets:3,reps:'8–12',rest:90,weight:20,last:[],equipment:'Barbell · Chest',weightNote:'Total bar weight, including the bar.',needs:['barbell','bench'],regions:['wrists','shoulders','back']},
 pull:{name:'Lat Pulldown',title:['LAT','PULLDOWN'],art:'pull',sets:3,reps:'10–12',rest:90,weight:25,last:[],equipment:'Cable · Back',weightNote:'Weight shown on the machine stack.',needs:['machine'],regions:['wrists','shoulders','back']},
 row:{name:'Seated Row',title:['SEATED','ROW'],art:'row',sets:3,reps:'10–12',rest:90,weight:25,last:[],equipment:'Cable · Back',weightNote:'Weight shown on the machine stack.',needs:['machine'],regions:['wrists','shoulders','back']},
 press:{name:'Shoulder Press',title:['SHOULDER','PRESS'],art:'press',sets:3,reps:'8–12',rest:90,weight:7.5,last:[],equipment:'Dumbbells · Shoulders',weightNote:'Dumbbell weight is per hand.',needs:['dumbbells'],regions:['wrists','shoulders','back']},
 raise:{name:'Lateral Raise',title:['LATERAL','RAISE'],art:'raise',sets:3,reps:'12–15',rest:60,weight:5,last:[],equipment:'Dumbbells · Shoulders',weightNote:'Dumbbell weight is per hand.',needs:['dumbbells'],regions:['wrists','shoulders']},
 cable:{name:'Triceps Pushdown',title:['TRICEPS','PUSHDOWN'],art:'cable',sets:3,reps:'10–15',rest:60,weight:15,last:[],equipment:'Cable · Triceps',weightNote:'Weight shown on the machine stack.',needs:['machine'],regions:['wrists','shoulders']},
 squat:{name:'Goblet Squat',title:['GOBLET','SQUAT'],art:'press',sets:3,reps:'8–12',rest:90,weight:12,last:[],equipment:'Dumbbell · Legs',weightNote:'Weight of the single dumbbell or kettlebell.',needs:['dumbbells'],regions:['knees','ankles','hips','back','wrists']},
 rdl:{name:'Romanian Deadlift',title:['ROMANIAN','DEADLIFT'],art:'bench',sets:3,reps:'8–12',rest:90,weight:20,last:[],equipment:'Dumbbells · Legs',weightNote:'Use a consistent total load.',needs:['dumbbells'],regions:['back','hips','wrists']},
 legpress:{name:'Leg Press',title:['LEG','PRESS'],art:'row',sets:3,reps:'10–12',rest:90,weight:40,last:[],equipment:'Machine · Legs',weightNote:'Log the machine load consistently.',needs:['machine'],regions:['knees','hips','back']},
 curl:{name:'Leg Curl',title:['LEG','CURL'],art:'row',sets:3,reps:'10–15',rest:60,weight:15,last:[],equipment:'Machine · Hamstrings',weightNote:'Weight shown on the machine stack.',needs:['machine'],regions:['knees','hips']},
 calf:{name:'Calf Raise',title:['CALF','RAISE'],art:'raise',sets:3,reps:'12–15',rest:60,weight:5,last:[],equipment:'Dumbbells · Calves',weightNote:'Dumbbell weight is per hand.',needs:['dumbbells'],regions:['ankles','knees','wrists']},
 biceps:{name:'Biceps Curl',title:['BICEPS','CURL'],art:'press',sets:3,reps:'10–12',rest:60,weight:5,last:[],equipment:'Dumbbells · Biceps',weightNote:'Dumbbell weight is per hand.',needs:['dumbbells'],regions:['wrists','shoulders']},
 chair:{name:'Chair Squat',title:['CHAIR','SQUAT'],art:'bodyweight',sets:2,reps:'8–10',rest:60,weight:0,last:[],equipment:'Bodyweight · Legs',weightNote:'Bodyweight movement. Added load is optional.',needs:[],regions:['knees','ankles','hips','back']},
 wall:{name:'Wall Push-up',title:['WALL','PUSH-UP'],art:'bodyweight',sets:2,reps:'8–10',rest:60,weight:0,last:[],equipment:'Bodyweight · Upper body',weightNote:'Bodyweight movement. Log zero added load.',needs:[],regions:['wrists','shoulders']},
 hinge:{name:'Standing Hip Hinge',title:['HIP','HINGE'],art:'bodyweight',sets:2,reps:'8–10',rest:60,weight:0,last:[],equipment:'Bodyweight · Hips',weightNote:'Bodyweight movement. Log zero added load.',needs:[],regions:['back','hips']},
 bridge:{name:'Glute Bridge',title:['GLUTE','BRIDGE'],art:'bodyweight',sets:2,reps:'10–12',rest:60,weight:0,last:[],equipment:'Bodyweight · Glutes',weightNote:'Bodyweight movement. Log zero added load.',needs:[],regions:['back','hips','knees']},
 deadbug:{name:'Dead Bug',title:['DEAD','BUG'],art:'bodyweight',sets:2,reps:'6–8 / side',rest:60,weight:0,last:[],equipment:'Bodyweight · Core',weightNote:'Bodyweight movement. Log zero added load.',needs:[],regions:['back','hips','shoulders']},
 bandcurl:{name:'Band Biceps Curl',title:['BAND','CURL'],art:'bodyweight',sets:2,reps:'10–12',rest:60,weight:0,last:[],equipment:'Resistance band · Arms',weightNote:'Record added load only when known.',needs:['bands'],regions:['wrists','shoulders']}
};
// Keep the legacy catalogue's actual movements; never substitute a different exercise.
const legacyNames=['Seated dumbbell curl','Seated lateral raise','Supported dumbbell row','Standing calf raise','Dumbbell floor press','Dumbbell hip hinge','Heel slide','Supine march','Band pull-apart','Seated band row','Easy walking warm-up','Walk at your own pace','Easy walking finish','March in place','Side steps','Standing reaches'];
legacyNames.forEach(name=>{const id='legacy-'+name.toLowerCase().replace(/[^a-z0-9]+/g,'-');E[id]={name,title:[name.toUpperCase()],art:'bodyweight',sets:2,reps:'At your own pace',rest:60,weight:0,last:[],equipment:'From your saved week',weightNote:'Use the load from your saved workout.',needs:[],regions:[],legacy:true};});
const copy=x=>JSON.parse(JSON.stringify(x));
function items(ids){return ids.map(id=>({id,sets:E[id].sets,reps:E[id].reps,rest:E[id].rest}));}
const starters=[
 {id:'upper',name:'Upper Body',routine:'upper',tone:'lavender',minutes:45,items:items(['bench','pull','row','press','raise','cable']),starter:true},
 {id:'lower',name:'Lower Body',routine:'lower',tone:'peach',minutes:40,items:items(['squat','rdl','legpress','curl','calf']),starter:true},
 {id:'full',name:'Full Body',routine:'full',tone:'sage',minutes:45,items:items(['squat','bench','rdl','pull','row']),starter:true},
 {id:'bodyweight',name:'Bodyweight Foundations',routine:'full',tone:'sand',minutes:20,items:items(['chair','wall','hinge']),starter:true}
];
const uid=prefix=>prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9);
function today(now=new Date()){const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));return `${p.year}-${p.month}-${p.day}`;}
const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&!isNaN(Date.parse(d+'T12:00:00Z'))&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;
const validTime=t=>typeof t==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(t);
function addDays(d,n){const x=new Date(d+'T12:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10);}
function weekStart(d=today()){return addDays(d,-((new Date(d+'T12:00:00Z').getUTCDay()+6)%7));}
function cleanItems(list){return(Array.isArray(list)?list:[]).filter(i=>i&&E[i.id]).map(i=>({id:i.id,sets:Math.max(1,Math.min(12,Number(i.sets)||E[i.id].sets)),reps:String(i.reps||E[i.id].reps).slice(0,20),rest:Math.max(0,Math.min(600,Number.isFinite(Number(i.rest))?Number(i.rest):E[i.id].rest))}));}
function blank(){return {version:1,templates:copy(starters),sessions:[],history:[],weeks:{},draft:null,importNotice:0};}
let memory=null;
function storage(){return root.localStorage;}
function read(){let state;try{const raw=JSON.parse(storage().getItem(KEY));if(raw?.version===1&&Array.isArray(raw.templates)&&Array.isArray(raw.sessions)&&Array.isArray(raw.history)){raw.weeks=raw.weeks||{};raw.templates=raw.templates.map(t=>({...t,items:cleanItems(t.items)}));state=raw;}}catch{}state=state||(memory?copy(memory):blank());const before=JSON.stringify(state);migrate(state);memory=copy(state);try{if(JSON.stringify(state)!==before||!storage().getItem(KEY))storage().setItem(KEY,JSON.stringify(state));}catch{}return copy(state);}
function write(state){storage().setItem(KEY,JSON.stringify(state));memory=copy(state);if(typeof root.dispatchEvent==='function')root.dispatchEvent(new Event('fitlens:training-changed'));return state;}
function legacyWeek(plan){
 if(plan?.version!==1||plan.days?.length!==7||!validDate(plan.weekStart))throw new Error('This saved week is invalid.');
 const byName=Object.fromEntries(Object.entries(E).map(([id,e])=>[e.name.toLowerCase(),id]));
 return plan.days.flatMap((d,i)=>{if(!d)return [];const names=Array.isArray(d.exercises)?d.exercises:[];
 if(!names.length||names.some(n=>!byName[String(n).toLowerCase()]))throw new Error('This saved week contains an unsupported exercise. Your original week is kept.');
 return [{key:'week:'+plan.weekStart+':'+(d.sessionId||i+'-'+d.id),legacyId:d.sessionId,date:addDays(plan.weekStart,i),timing:d.timing,template:{name:String(d.title||'My workout').slice(0,80),routine:['upper','lower','full'].includes(d.id)?d.id:'full',tone:'sage',minutes:d.duration||30,items:names.map(n=>({id:byName[String(n).toLowerCase()],sets:d.sets||2})),starter:false}}];});
}
function importRecords(s,records,strict=false){
 s.legacyImports=s.legacyImports||{};
 const occupied=date=>[...s.sessions,...(s.draft?.sessions||[])].some(x=>x.date===date&&x.status!=='skipped');
 if(strict&&records.some(r=>s.legacyImports[r.key]||occupied(r.date)))throw new Error('Your plan already has workouts or suggestions on these days. Open Plan to keep or move them before applying this week.');
 for(const r of records){if(s.legacyImports[r.key])continue;
 // Recognize records imported by the earlier, untracked migration (including moved sessions).
 const old=!strict&&s.sessions.find(x=>validDate(r.date)&&x.name===r.template.name&&String(x.templateId).startsWith('imported')&&!Object.values(s.legacyImports).some(v=>v.sessionId===x.id));
 if(old){s.legacyImports[r.key]={sessionId:old.id,status:'existing'};continue;}
 const t={...r.template,id:uid('imported'),items:cleanItems(r.template.items)};s.templates.push(t);
 const canSchedule=validDate(r.date)&&t.items.length&&!occupied(r.date);
 const item=canSchedule?makeSession(t,r.date,r.timing):null;
 if(item){item.source='legacy';item.legacyKey=r.key;s.sessions.push(item);s.weeks[weekStart(r.date)]=s.weeks[weekStart(r.date)]||'manual';}
 else if(r.date)s.importNotice=(s.importNotice||0)+1;
 s.legacyImports[r.key]={sessionId:item?.id||null,templateId:t.id,status:item?'imported':r.date?'conflict':'unscheduled'};
 }
}
function migrate(s){
 // Sources are independent: one malformed legacy value must not block the other.
 try{const plan=JSON.parse(root.sessionStorage?.getItem('fitlens:weekly-plan'));if(plan){importRecords(s,legacyWeek(plan));if(!s.setupForm&&plan.form)s.setupForm=copy(plan.form);}}catch{}
 try{const singles=JSON.parse(storage().getItem('fitlens:single-sessions:v1'));if(Array.isArray(singles))for(const x of singles){if(!x||typeof x.id!=='string'||typeof x.name!=='string')continue;importRecords(s,[{key:'single:'+x.id,date:x.schedule?.date,timing:x.schedule,template:{name:x.name.slice(0,80),routine:['upper','lower','full'].includes(x.routine)?x.routine:'full',tone:'sage',minutes:30,items:x.items,starter:false}}]);}}catch{}
}
function commitLegacy(plan){const records=legacyWeek(plan),s=read();if(!records.length)throw new Error('Add a workout before applying this week.');importRecords(s,records,true);s.setupForm=copy(plan.form||{});write(s);return records.map(r=>s.legacyImports[r.key].sessionId);}
function makeSession(template,date,timing=null){return {id:uid('session'),templateId:template.id,name:template.name,routine:template.routine||'full',tone:template.tone||'sage',minutes:template.minutes||30,items:cleanItems(template.items),date,time:validTime(timing?.time)?timing.time:null,reminder:{enabled:timing?.enabled===true,before:[0,15,30].includes(timing?.before)?timing.before:0},status:'planned',source:'manual',coach:template.coach?copy(template.coach):null};}
function template(id){return read().templates.find(t=>t.id===id)||null;}
function find(id,draft=false){const s=read();return(draft?s.draft?.sessions||[]:s.sessions).find(x=>x.id===id)||null;}
function saveTemplate(value){const s=read(),t={...value,id:value.id||uid('workout'),name:String(value.name||'My workout').trim().slice(0,80),items:cleanItems(value.items),minutes:Math.max(5,Math.min(180,Number(value.minutes)||30)),starter:value.starter===true};const i=s.templates.findIndex(x=>x.id===t.id);if(i<0)s.templates.push(t);else s.templates[i]=t;write(s);return t;}
function add(templateId,date,{draft=false,time=null,enabled=false,before=0}={}){if(!validDate(date)||date<today())throw new Error('Choose today or a future date.');const s=read(),t=typeof templateId==='object'&&templateId?{...copy(templateId),items:cleanItems(templateId.items)}:s.templates.find(x=>x.id===templateId);if(!t||!t.items.length)throw new Error('Add exercises to this workout first.');if([...s.sessions,...(s.draft?.sessions||[])].some(x=>x.date===date&&x.status!=='skipped'))throw new Error('This day already has a workout. Choose another day.');const item=makeSession(t,date,{time,enabled:validTime(time)&&enabled,before});if(draft&&s.draft)s.draft.sessions.push(item);else{s.sessions.push(item);s.weeks[weekStart(date)]='manual';}write(s);return item;}
function updateSession(id,changes,draft=false){const s=read(),list=draft?s.draft?.sessions||[]:s.sessions,item=list.find(x=>x.id===id);if(!item)throw new Error('This session is no longer available.');if(item.status==='completed')throw new Error('This workout is already completed.');Object.assign(item,{...changes,id:item.id,date:item.date});if(changes.items)item.items=cleanItems(changes.items);write(s);return item;}
function move(id,date,draft=false){if(!validDate(date)||date<today())throw new Error('Choose today or a future date.');const s=read(),list=draft?s.draft?.sessions||[]:s.sessions,item=list.find(x=>x.id===id);if(!item||item.status!=='planned')throw new Error('Only planned workouts can be moved.');const other=list.find(x=>x.date===date&&x.id!==id&&x.status!=='skipped');if(other?.status==='completed')throw new Error('A completed workout already occupies this day.');if(!draft&&s.draft?.sessions.some(x=>x.date===date&&x.status!=='skipped'))throw new Error('A suggested workout is on this day. Apply or move your suggestions first.');if(draft&&s.sessions.some(x=>x.date===date&&x.status!=='skipped'))throw new Error('Your existing workout stays on this day.');const old=item.date;if(other)other.date=old;item.date=date;write(s);return {swapped:Boolean(other),from:old,to:date};}
function remove(id,draft=false){const s=read();if(draft)s.draft.sessions=s.draft.sessions.filter(x=>x.id!==id);else s.sessions=s.sessions.filter(x=>x.id!==id||x.status==='completed');write(s);}
function setTimes(ids,time,{draft=false,changeReminder=false,enabled=false,before=0}={}){if(time!==null&&!validTime(time))throw new Error('Choose a valid time.');const s=read(),list=draft==='mixed'?[...s.sessions,...(s.draft?.sessions||[])]:draft?s.draft?.sessions||[]:s.sessions;list.forEach(x=>{if(ids.includes(x.id)&&x.status==='planned'){x.time=time;if(time===null)x.reminder={...x.reminder,enabled:false};if(changeReminder)x.reminder={enabled,before:[0,15,30].includes(before)?before:0};}});write(s);}
function markWeek(week){const s=read();s.weeks[week]='manual';write(s);}
function generate(settings){
 const s=read(),week=settings.week,frequency=Number(settings.frequency),duration=Number(settings.duration);if(!validDate(week))throw new Error('Choose a week.');
 const existing=s.sessions.filter(x=>weekStart(x.date)===week&&x.status!=='skipped'),count=Math.max(0,frequency-existing.length);if(!count)throw new Error('This week already has that many workouts. Increase the number or arrange it yourself.');
 const dates=[...new Set(settings.days)].sort((a,b)=>a-b).map(i=>addDays(week,i)).filter(d=>d>=today()&&!existing.some(x=>x.date===d));if(dates.length<count)throw new Error(`Choose ${count} available days for your suggestions.`);
 const equipment=settings.place==='gym'?['barbell','dumbbells','machine','bench','bands','mat']:settings.equipment||[],excluded=settings.areas||[];
 const eligible=Object.keys(E).filter(id=>!E[id].legacy&&E[id].needs.every(n=>equipment.includes(n))&&!E[id].regions.some(r=>excluded.includes(r)));
 if(!eligible.length)throw new Error('The small workout library has no match for these conditions. Review your equipment or body-area preferences.');
 const rounds=settings.experience==='regular'?3:2,goal=settings.goal||'habit',prescribe=id=>({id,sets:rounds,reps:goal==='strength'?'6–8':goal==='muscle'?'8–12':goal==='endurance'?'12–15':E[id].reps,rest:goal==='strength'?120:goal==='muscle'?90:goal==='endurance'?45:E[id].rest}),maxItems=duration===20?3:duration===30?4:6;
 const groups=[['bench','pull','row','press','raise','biceps','wall','bandcurl'],['squat','rdl','legpress','curl','calf','chair','hinge','bridge'],['squat','bench','row','press','chair','wall','hinge','deadbug']];
 const generated=[];
 for(let i=0;i<count;i++){const group=(settings.place==='gym'||equipment.includes('dumbbells'))?groups[i%3]:['chair','wall','hinge','bridge','deadbug','bandcurl'];let chosen=group.filter(id=>eligible.includes(id)).slice(0,maxItems);if(!chosen.length)chosen=eligible.slice(0,maxItems);const routine=i%3===0?'upper':i%3===1?'lower':'full',name=chosen.length<3?'A little focused work':settings.place==='gym'?['Upper-body strength','Lower-body foundations','A little of everything'][i%3]:['Bodyweight foundations','Move at your pace','A little full body'][i%3];const t={id:null,name,routine,tone:['lavender','peach','sage'][i%3],minutes:duration,items:chosen.map(prescribe)};const index=count===1?0:Math.round(i*(dates.length-1)/(count-1));const item=makeSession(t,dates[index]);item.source='suggested';if(root.FitLensCoach)item.coach={why:`${duration} min · ${settings.place==='gym'?'gym':'home'} equipment selected.`,signature:root.FitLensCoach.signature(item)};generated.push(item);}
 s.draft={id:uid('draft'),week,sessions:generated,settings:copy(settings)};write(s);return s.draft;
}
function discardDraft(){const s=read();s.draft=null;write(s);}
function applyDraft(){const s=read();if(!s.draft?.sessions.length)throw new Error('Add a workout before applying this week.');for(const item of s.draft.sessions)if(s.sessions.some(x=>x.date===item.date&&x.status!=='skipped'))throw new Error('Your week changed. Move the conflicting suggestion to another day first.');s.sessions.push(...s.draft.sessions);s.weeks[s.draft.week]='suggested';const week=s.draft.week;s.draft=null;write(s);return week;}
function complete({sessionId=null,name,items:performed=[],seconds=0,logs=[],id=null,date=today(),source='fitlens',note='',outcome='completed'}){const stopped=outcome==='stopped',s=read(),key=(stopped?id:sessionId||id)||uid('history');const already=s.history.find(h=>h.id===key);if(already)return already;const item=s.sessions.find(x=>x.id===sessionId),history={id:key,sessionId,name:name||item?.name||'Workout',date,at:new Date().toISOString(),seconds,source,type:'strength',note,outcome:stopped?'stopped':'completed',items:copy(performed),logs:copy(logs)};s.history.push(history);if(item&&!stopped){item.status='completed';item.completedAt=history.at;}write(s);if(!stopped)root.FitLensRhythm?.record({id:key,kind:'workout',name:history.name,date:history.date});return history;}
function removeTemplate(id){const s=read(),t=s.templates.find(t=>t.id===id);if(!t)throw new Error('This workout is no longer in your library.');if(t.starter)throw new Error('Starter workouts stay in the library.');s.templates=s.templates.filter(t=>t.id!==id);write(s);}
function previewWeekCopy(from,to,state=read()){
 if(!validDate(from)||!validDate(to))throw new Error('Choose a valid week.');from=weekStart(from);to=weekStart(to);if(from===to)throw new Error('Choose a different week.');
 const source=state.sessions.filter(s=>weekStart(s.date)===from&&s.status!=='skipped').sort((a,b)=>a.date.localeCompare(b.date));
 const occupied=[...state.sessions,...(state.draft?.sessions||[])].filter(s=>s.status!=='skipped');
 const items=source.map(s=>{const offset=Math.round((new Date(s.date+'T12:00:00Z')-new Date(from+'T12:00:00Z'))/86400000),date=addDays(to,offset),other=occupied.find(x=>x.date===date);return {sourceId:s.id,name:s.name,date,time:s.time||null,reason:date<today()?'past':other?'occupied':!s.items.length?'empty':null,existingName:other?.name||null};});
 return {from,to,items,available:items.filter(i=>!i.reason).length,conflicts:items.filter(i=>i.reason==='occupied').length};
}
function copyWeek(from,to){const s=read(),preview=previewWeekCopy(from,to,s);if(!preview.available)throw new Error('No workouts can be copied to this week.');const added=preview.items.filter(i=>!i.reason).map(i=>{const original=s.sessions.find(x=>x.id===i.sourceId),item=makeSession(original,i.date,{time:i.time,enabled:false});item.templateId=original.templateId||null;item.source='copied';return item;});s.sessions.push(...added);s.weeks[preview.to]='manual';write(s);return {week:preview.to,ids:added.map(i=>i.id),skipped:preview.items.length-added.length};}
function restoreSession(item,draft=false){const s=read(),list=draft?s.draft?.sessions:s.sessions;if(!list)throw new Error('This draft is no longer available.');if([...s.sessions,...(s.draft?.sessions||[])].some(x=>x.id===item.id||x.date===item.date&&x.status!=='skipped'))throw new Error('This day changed. Your workout could not be restored.');list.push(copy(item));write(s);}
function next(s=read()){return s.sessions.filter(x=>x.status==='planned'&&x.date>=today()).sort((a,b)=>(a.date+(a.time||'99:99')).localeCompare(b.date+(b.time||'99:99')))[0]||null;}
const api={KEY,exercises:E,starters,copy,uid,today,validDate,validTime,addDays,weekStart,cleanItems,blank,read,write,template,find,saveTemplate,removeTemplate,add,updateSession,move,remove,setTimes,markWeek,generate,discardDraft,applyDraft,complete,next,previewWeekCopy,copyWeek,restoreSession,commitLegacy};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FitLensTraining=api;
})(typeof window!=='undefined'?window:globalThis);
