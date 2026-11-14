/* Plan page: view a week, add / change time / move / remove sessions, build a suggested week.
   All data goes through window.FitLensWorkout (workout-store.js) and window.FitLensDraftModel. */
(function(){
'use strict';
const store=window.FitLensWorkout,Draft=window.FitLensDraftModel,Dates=window.FitLensDates,C=window.FitLensConstants;
const $=s=>document.querySelector(s),phone=$('.workouts-phone');
const DAY=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const LABEL={habit:'Build a habit',strength:'Get stronger',muscle:'Build muscle',endurance:'Improve stamina',knees:'Knees',back:'Lower back',wrists:'Wrists',shoulders:'Shoulders',ankles:'Ankles',hips:'Hips',dumbbells:'Dumbbells',bands:'Bands',mat:'Mat',bench:'Bench'};
const REASONS={conflict:'You already have a workout at that time on that day.',invalidTime:'That time is not valid.',invalidDate:'That day is not valid.',notFound:'That session no longer exists.',workoutNotFound:'That workout no longer exists.',storage:'Couldn’t keep this on your device. Please try again.'};

function placeSheet(d){const r=phone.getBoundingClientRect();d.style.position='fixed';d.style.left=r.left+'px';d.style.bottom=Math.max(0,innerHeight-r.bottom)+'px';d.style.width=r.width+'px';}
function openSheet(d){placeSheet(d);d.showModal();}
window.addEventListener('resize',()=>document.querySelectorAll('dialog[open]').forEach(placeSheet));
document.querySelectorAll('.close-sheet').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
const announce=t=>{$('#plan-announce').textContent=t;};
const status=t=>{$('#plan-status').textContent=t;};

const params=new URLSearchParams(location.search);
const thisWeek=Dates.weekStartOf(Dates.todayStr());
let week=Dates.weekStartOf(params.get('week')||'')||thisWeek;
const titleOf=id=>{const w=store.getWorkout(id);return w?w.title:'Workout no longer available';};
const fmtDay=d=>new Intl.DateTimeFormat('en',{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(d+'T12:00:00Z'));

function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}

function render(){
 const dates=Dates.weekDates(week),sessions=store.getWeekSchedule(week),today=Dates.todayStr();
 $('#week-label').textContent=week===thisWeek?'This week':week===Dates.addDays(thisWeek,7)?'Next week':'Week of '+fmtDay(week);
 $('#week-range').textContent=fmtDay(dates[0])+' – '+fmtDay(dates[6]);
 $('#copy-week').disabled=!sessions.length;
 const list=$('#plan-days');list.replaceChildren();
 dates.forEach((date,i)=>{
  const li=el('li','plan-day'+(date===today?' is-today':'')),head=el('div','plan-day-head'),h=el('h2',null,DAY[i]);h.append(el('small',null,fmtDay(date)));
  const add=el('button','plan-add','+');add.type='button';add.setAttribute('aria-label','Add a workout on '+DAY[i]+' '+fmtDay(date));add.addEventListener('click',()=>openAdd(date,i));
  head.append(h,add);li.append(head);
  const mine=sessions.filter(s=>s.date===date);
  if(!mine.length)li.append(el('p','plan-empty','Rest day. Add something if you feel like it.'));
  else{const ul=el('ul','plan-sessions');for(const s of mine){const row=el('li'),b=el('button','plan-session'+(s.status==='done'?' is-done':''));b.type='button';
   const copy=el('span'),name=el('strong',null,titleOf(s.workoutId)),meta=el('small',null,(s.time?s.time+' · ':'No time set · ')+(s.status==='done'?'Done':'Planned'));copy.append(name,meta);
   b.append(copy,el('span',null,'›'));b.setAttribute('aria-label','Edit '+titleOf(s.workoutId)+' on '+DAY[i]);b.addEventListener('click',()=>openSession(s.id));row.append(b);ul.append(row);}li.append(ul);}
  list.append(li);
 });
}

/* Week navigation */
function go(delta){week=Dates.addDays(week,delta);history.replaceState(null,'','?week='+week);status('');render();announce($('#week-label').textContent);}
$('#prev-week').addEventListener('click',()=>go(-7));$('#next-week').addEventListener('click',()=>go(7));

/* Add a workout to a day */
let addDate=null;
function openAdd(date,i){
 addDate=date;$('#add-day').textContent=(DAY[i]+' · '+fmtDay(date)).toUpperCase();$('#add-error').textContent='';
 const sel=$('#add-workout');sel.replaceChildren();
 const all=store.listWorkouts(),mineFirst=[...all.filter(w=>w.source==='custom'),...all.filter(w=>w.source==='template')];
 for(const w of mineFirst){const o=el('option',null,w.title+(w.source==='custom'?' (yours)':''));o.value=w.id;sel.append(o);}
 $('#add-form').elements.time.value='';openSheet($('#add-sheet'));
}
$('#add-form').addEventListener('submit',e=>{
 e.preventDefault();const f=e.currentTarget;
 const r=store.addSession({workoutId:f.elements.workout.value,date:addDate,time:f.elements.time.value||null});
 if(!r.ok){$('#add-error').textContent=REASONS[r.reason]||'Couldn’t add this workout.';return;}
 $('#add-sheet').close();render();status('Added '+titleOf(r.session.workoutId)+'.');announce('Workout added');
});

/* Edit a session */
let editing=null;
function openSession(id){
 editing=store.listSessions().find(s=>s.id===id);if(!editing){render();return;}
 $('#session-title').textContent=titleOf(editing.workoutId);$('#session-error').textContent='';
 const dates=Dates.weekDates(Dates.weekStartOf(editing.date)),sel=$('#session-date');sel.replaceChildren();
 dates.forEach((d,i)=>{const o=el('option',null,DAY[i]+' · '+fmtDay(d));o.value=d;sel.append(o);});
 sel.value=editing.date;$('#session-day').textContent=fmtDay(editing.date).toUpperCase();$('#session-time').value=editing.time||'';
 $('#session-open').href='workout-details.html?workout='+encodeURIComponent(editing.workoutId);
 $('#session-done').hidden=editing.status==='done';
 openSheet($('#session-sheet'));
}
$('#session-form').addEventListener('submit',e=>{
 e.preventDefault();if(!editing)return;
 const r=store.updateSession(editing.id,{date:$('#session-date').value,time:$('#session-time').value||null});
 if(!r.ok){$('#session-error').textContent=REASONS[r.reason]||'Couldn’t save these changes.';return;}
 $('#session-sheet').close();render();status('Saved.');announce('Session updated');
});
$('#session-remove').addEventListener('click',()=>{if(!editing)return;store.removeSession(editing.id);$('#session-sheet').close();render();status('Removed from your plan.');announce('Session removed');});
$('#session-done').addEventListener('click',()=>{if(!editing)return;store.markSessionDone(editing.id);$('#session-sheet').close();render();status('Marked as done.');announce('Session marked done');});

/* Copy week */
$('#copy-week').addEventListener('click',()=>{
 const r=store.copyWeek(week,Dates.addDays(week,7));
 if(!r.ok){status('Couldn’t copy this week.');return;}
 status(r.created.length?`Copied ${r.created.length} ${r.created.length===1?'session':'sessions'} to next week`+(r.skipped?` (${r.skipped} skipped, same time already taken).`:'.'):'Nothing new to copy.');
});

/* Build my week */
function profileDefaults(){
 // Use the real profile when another module provides one; otherwise sensible defaults.
 try{if(window.FitLensProfile&&typeof window.FitLensProfile.getProfile==='function')return Draft.cleanProfile(window.FitLensProfile.getProfile());}catch{}
 return Draft.cleanProfile({});
}
function chips(container,values,name,checked){container.replaceChildren();for(const v of values){const l=el('label'),i=document.createElement('input');i.type='checkbox';i.name=name;i.value=v;i.checked=checked.includes(v);l.append(i,document.createTextNode(LABEL[v]||v));container.append(l);}}
let draft=null;
$('#build-week').addEventListener('click',()=>{
 const p=profileDefaults();
 const g=$('#build-goal');g.replaceChildren();for(const v of C.Goal){const o=el('option',null,LABEL[v]);o.value=v;g.append(o);}g.value=p.goal;
 $('#build-days').value=String(p.daysPerWeek);
 chips($('#build-equipment'),C.Equipment.filter(x=>['dumbbells','bands','mat','bench'].includes(x)),'equipment',p.equipment);
 chips($('#build-regions'),C.Region,'region',p.avoidRegions);
 $('#build-form').hidden=false;$('#build-preview').hidden=true;$('#build-error').textContent='';draft=null;openSheet($('#build-sheet'));
});
function readForm(){const f=$('#build-form');return {goal:f.elements.goal.value,daysPerWeek:Number(f.elements.days.value),minutes:30,equipment:[...f.querySelectorAll('input[name=equipment]:checked')].map(i=>i.value),avoidRegions:[...f.querySelectorAll('input[name=region]:checked')].map(i=>i.value)};}
$('#build-form').addEventListener('submit',e=>{
 e.preventDefault();
 draft=Draft.generateDraft(readForm(),week,store.listWorkouts());
 $('#build-form').hidden=true;$('#build-preview').hidden=false;const ol=$('#build-list');ol.replaceChildren();
 if(!draft){ol.append(el('li',null,'We couldn’t find a safe set of workouts for those answers. Try fewer areas to avoid, or add equipment.'));$('#build-apply').hidden=true;return;}
 $('#build-apply').hidden=false;
 draft.sessions.forEach(s=>{const li=el('li',null,DAY[Dates.weekDates(week).indexOf(s.date)]+' · '+fmtDay(s.date));li.append(el('small',null,titleOf(s.workoutId)));ol.append(li);});
});
$('#build-back').addEventListener('click',()=>{$('#build-form').hidden=false;$('#build-preview').hidden=true;});
$('#build-apply').addEventListener('click',()=>{
 if(!draft)return;const r=Draft.applyDraft(draft,store);
 if(!r.ok){$('#build-error').textContent='Couldn’t apply this plan.';return;}
 $('#build-sheet').close();render();status(r.added?`Added ${r.added} ${r.added===1?'session':'sessions'} to your week.`:'Those sessions are already in your plan.');announce('Plan applied');
});

render();window.addEventListener('pageshow',render);
})();
