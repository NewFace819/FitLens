(() => {
'use strict';
const $=s=>document.querySelector(s),m=FitLensReminders,params=new URLSearchParams(location.search);
const draft=params.get('from')==='draft',singleId=params.get('single'),planKey=draft?'fitlens:weekly-plan-edit':'fitlens:weekly-plan';
const names=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
let plan=null,session=null,selected=0,dirty=false,saving=false;
try{if(singleId)session=m.singles(localStorage).find(s=>s.id===singleId)||null;else plan=FitLensPlan.restore(JSON.parse(sessionStorage.getItem(planKey)));}catch{}
const single=Boolean(singleId),available=plan?plan.days.map((s,i)=>s?i:null).filter(i=>i!==null):[];
const requested=plan?plan.days.findIndex(s=>s?.sessionId===params.get('session')):-1;
selected=requested>=0?requested:available.includes(Number(params.get('day')))&&params.has('day')?Number(params.get('day')):available[0]??0;
const exact=$('#exact-time'),slider=$('#time-slider'),dateInput=$('#session-date');
let dateValue=session?.schedule?.date||m.today();
const getTiming=()=>single?m.timing(session?.schedule):m.timing(plan?.days[selected]?.timing);
let current=getTiming()||{time:'18:30',enabled:false,before:0};
const minutes=v=>Number(v.slice(0,2))*60+Number(v.slice(3));
const format=v=>`${String(Math.floor(v/60)).padStart(2,'0')}:${String(v%60).padStart(2,'0')}`;
const dateLabel=date=>m.validDate(date)?new Intl.DateTimeFormat('en',{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z')):'Choose a date';
// One continuous day: adjacent minutes blend rather than switching scenes.
const skyFrames=[
 [0,'#253653','#65718d','#536876','#374e5a','#8b9cb9'],
 [5,'#675c85','#c694a0','#7d8490','#566f76','#c4a4ba'],
 [6.5,'#b59dc6','#ffc99f','#a0ac91','#778e7b','#f5c29b'],
 [9,'#8fc4de','#e3eee0','#abc397','#7eaa87','#f2e1ab'],
 [12,'#79b7d8','#e3eccc','#a8c18d','#79a37d','#f5dfa4'],
 [15,'#93bcd5','#f3dfb6','#aabd90','#819e7c','#f4d59d'],
 [17,'#b09dc9','#ffc29b','#a9ac87','#7f947b','#f5be88'],
 [18.5,'#8a78ab','#f3a38e','#939491','#687e7c','#e7ac97'],
 [20,'#455275','#9b91b2','#697c87','#4a6670','#aea1c1'],
 [22,'#2b3b5b','#717f9d','#566b7c','#3c5362','#8e9ebc'],
 [24,'#253653','#65718d','#536876','#374e5a','#8b9cb9']
];
const clamp=value=>Math.max(0,Math.min(1,value));
function paintSky(hour){
 const index=skyFrames.findIndex(frame=>frame[0]>hour),a=skyFrames[index-1],b=skyFrames[index],mix=(hour-a[0])/(b[0]-a[0]);
 ['--sky-top','--sky-bottom','--hill-back','--hill-front','--light'].forEach((key,i)=>{
  const from=parseInt(a[i+1].slice(1),16),to=parseInt(b[i+1].slice(1),16);
  const rgb=[16,8,0].map(shift=>Math.round(((from>>shift)&255)*(1-mix)+((to>>shift)&255)*mix));
  $('.phone').style.setProperty(key,`rgb(${rgb.join(',')})`);
 });
 const daylight=clamp((hour-5.5)/1)*clamp((19-hour)/1.5),sunPhase=clamp((hour-6)/12.5);
 const sun=$('.sun');sun.style.transform=`translate(${95+150*sunPhase-218}px,${147-112*Math.sin(Math.PI*sunPhase)-83}px)`;sun.style.opacity=daylight;
 const moonPhase=clamp((hour>=18?hour-18:hour+6)/12),moon=$('.moon');
 moon.style.transform=`translate(${100+145*moonPhase-218}px,${130-85*Math.sin(Math.PI*moonPhase)-56}px)`;moon.style.opacity=1-daylight;
 $('.stars').style.opacity=(1-daylight)*.9;$('.cloud').style.opacity=.12+.33*daylight;
 $('.light-patch').style.opacity=.1+.16*daylight;
}
$('.phone').dataset.mode=single?'single':'week';
FitLensFace.mount($('#reminder-face'),{expression:'calm',allowMotion:()=>true});
function stage(){if(single&&session)session.schedule={date:dateValue,...current};else if(plan?.days[selected])plan.days[selected].timing={...current};dirty=true;$('#save-status').textContent='Unsaved changes';render();}
function render(){
const active=Boolean(single?session:plan);$('#editor-content').hidden=!active;$('#empty-state').hidden=active;$('#save-footer').hidden=!active;
const back=single&&session?'workout-details.html?session='+encodeURIComponent(session.id)+'&v=reminders-8':plan?(draft?'setup-plan.html?view=draft&v=reminders-8':'setup-plan.html?view=week&v=reminders-8'):'workouts.html?v=reminders-8';
$('#back-link').href=back;$('#back-link').setAttribute('aria-label',single?'Back to workout':plan?'Back to your week':'Back to workouts');
$('#context-label').textContent=single?'JUST THIS SESSION':draft?'YOUR DRAFT WEEK':plan?'YOUR WEEK':'YOUR SCHEDULE';
$('#context-description').textContent=single?'Pick a date. Keep it one time.':draft?'Times stay in your draft until you confirm the week.':plan?'Each session keeps its own time.':'A little structure, at your own pace.';
renderSingles();if(!active)return;
const saved=getTiming(),hour=minutes(current.time)/60,period=hour>=6&&hour<12?'morning':hour>=12&&hour<17?'afternoon':hour>=17&&hour<20?'evening':'night';$('.phone').dataset.period=period;
paintSky(hour);
$('#period-label').textContent={morning:'A morning moment',afternoon:'Room in the afternoon',evening:'An evening pause',night:'A quiet moment'}[period];
exact.value=current.time;$('#readable-time').value=current.time;$('#readable-time').textContent=current.time;slider.value=minutes(current.time);slider.setAttribute('aria-valuetext',current.time);
$('#choose-day').hidden=single;$('#date-section').hidden=!single;$('#times-disclosure').hidden=single;$('#apply-all').hidden=single;$('#apply-all').disabled=!saved||available.length<2;$('#remove-day').hidden=!saved;
$('#unset-label').hidden=Boolean(saved);$('#use-time').hidden=Boolean(saved);$('#use-time').textContent='Use '+current.time;
dateInput.value=dateValue;dateInput.min=single&&saved?m.today():'';dateInput.required=single&&Boolean(saved);
const date=single?dateValue:m.dayDate(plan.weekStart,selected);$('#editing-day').textContent=dateLabel(date);$('#editing-session').textContent=single?session.name:plan.days[selected].title;
$('#enabled').setAttribute('aria-checked',String(current.enabled));$('#notification-details').hidden=!current.enabled;$('#remind-before').value=String(current.before);
const notice=m.notificationDate(date,current);$('#preview-time').textContent=notice?.time||current.time;$('#delivery-note').textContent=current.enabled&&notice?`${dateLabel(notice.date)} at ${notice.time} · notification preview`:'Optional. Your session can have a time without a reminder.';
$('#schedule-summary').textContent=saved?`${dateLabel(date)} · ${current.time}${current.enabled?' · Reminder on':''}`:'No time set for this session';$('#save-button').disabled=!dirty;
$('#save-button').childNodes[0].textContent=draft?'Keep in draft ':'Save changes ';
if(plan){const picker=$('#day-picker');if(!picker.children.length)names.forEach((name,i)=>{const b=document.createElement('button');b.type='button';b.dataset.day=i;b.textContent=name[0];b.setAttribute('role','radio');b.addEventListener('click',()=>selectDay(i));b.addEventListener('keydown',e=>{let n=available.indexOf(selected);if(e.key==='ArrowRight')n=(n+1)%available.length;else if(e.key==='ArrowLeft')n=(n+available.length-1)%available.length;else return;e.preventDefault();selectDay(available[n]);picker.children[available[n]].focus();});picker.append(b);});
[...picker.children].forEach((b,i)=>{b.disabled=!available.includes(i);b.tabIndex=i===selected?0:-1;b.setAttribute('aria-checked',String(i===selected));b.classList.toggle('has-time',Boolean(plan.days[i]?.timing));b.setAttribute('aria-label',`${names[i]}, ${plan.days[i]?plan.days[i].title+(plan.days[i].timing?', '+plan.days[i].timing.time:', no time set'):'rest day'}`);});
$('#day-times').replaceChildren(...available.map(i=>{const row=document.createElement('div');row.className='day-time-row';const day=document.createElement('span'),value=document.createElement('span');day.textContent=names[i];value.textContent=plan.days[i].timing?plan.days[i].timing.time+(plan.days[i].timing.enabled?' · Reminder on':''):'Not set';row.append(day,value);return row;}));}
}
function renderSingles(){if(draft){$('#individual-list').hidden=true;return;}let all=[];try{all=m.singles(localStorage).filter(s=>s.schedule&&s.id!==singleId);}catch{}$('#individual-list').hidden=!all.length;if(!plan&&!session&&all.length){$('#empty-state h2').textContent='Your sessions, your time.';$('#empty-state p').textContent='Choose an individual session below, or create another workout.';}$('#individual-links').replaceChildren(...all.map(s=>{const link=document.createElement('a'),text=document.createElement('span'),meta=document.createElement('small'),arrow=document.createElement('span');link.href='reminders.html?single='+encodeURIComponent(s.id)+'&v=sky-9';text.textContent=s.name;meta.textContent=dateLabel(s.schedule.date)+' · '+s.schedule.time;arrow.textContent='›';text.append(meta);link.append(text,arrow);return link;}));}
function selectDay(day){if(!available.includes(day)||day===selected)return;selected=day;current=getTiming()||{time:'18:30',enabled:false,before:0};render();}
exact.addEventListener('input',()=>{if(m.validTime(exact.value)){current.time=exact.value;stage();}});exact.addEventListener('blur',()=>{if(!exact.value)exact.value=current.time;});exact.addEventListener('click',()=>{try{exact.showPicker();}catch{}});
slider.addEventListener('input',()=>{current.time=format(Number(slider.value));stage();});$('#use-time').addEventListener('click',stage);
$('#enabled').addEventListener('click',()=>{current.enabled=!current.enabled;stage();});$('#remind-before').addEventListener('change',()=>{current.before=Number($('#remind-before').value);stage();});
dateInput.addEventListener('input',()=>{dateValue=dateInput.value;stage();});$('#tomorrow').addEventListener('click',()=>{dateValue=m.dayDate(m.today(),1);stage();});
$('#apply-all').addEventListener('click',()=>{if(!getTiming())return;available.forEach(i=>plan.days[i].timing={...current});dirty=true;$('#save-status').textContent='Updated in this draft. Save to keep changes.';render();});
$('#remove-day').addEventListener('click',()=>{if(single)session.schedule=null;else plan.days[selected].timing=null;current={time:'18:30',enabled:false,before:0};dirty=true;$('#save-status').textContent='Time removed. Save to keep changes.';render();});
$('#reminder-form').addEventListener('submit',event=>{event.preventDefault();if(!dirty||saving)return;
if(single&&session.schedule){if(!m.validDate(dateValue)||!dateInput.validity.valid){dateInput.reportValidity();return;}const now=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date());if(dateValue<m.today()||(dateValue===m.today()&&current.time<=now)){$('#save-status').textContent='Choose a session time in the future, or remove its time.';return;}}
try{saving=true;if(single)m.saveSingle(localStorage,session);else sessionStorage.setItem(planKey,JSON.stringify(plan));dirty=false;render();$('#save-status').textContent=draft?'Kept in draft · confirm your week to apply':single?'Saved for this session · preview only':'Saved with your week · preview only';}catch{$('#save-status').textContent='Couldn’t save here. Please try again.';}finally{saving=false;}
});
// A local confirmation offers an explicit way to leave without committing a draft.
const back=$('#back-link');back.addEventListener('click',e=>{if(dirty){if(!confirm('Leave without saving these time changes?'))e.preventDefault();else dirty=false;}});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
render();
})();
