(()=>{'use strict';
const p=new URLSearchParams(location.search);if(!p.has('sessions'))return;
const M=FitLensTraining,$=s=>document.querySelector(s),draft=p.get('draft')==='mixed'?'mixed':p.get('draft')==='1',ids=[...new Set(p.get('sessions').split(','))],sessions=ids.map(id=>draft==='mixed'?(M.find(id)||M.find(id,true)):M.find(id,draft)).filter(x=>x&&x.status==='planned');
const back='plan.html'+(sessions.length?'?week='+M.weekStart(sessions[0].date):'');$('#back-link').href=back;
if(!sessions.length){$('#editor-content').hidden=true;$('#empty-state').hidden=false;$('#save-footer').hidden=true;return;}
let hasTime=Boolean(sessions[0].time),time=sessions[0].time||'18:30',enabled=sessions[0].reminder?.enabled||false,before=sessions[0].reminder?.before||0,dirty=false,saving=false;
const batch=sessions.length>1;let changeReminder=!batch;
const minutes=v=>Number(v.slice(0,2))*60+Number(v.slice(3)),format=v=>String(Math.floor(v/60)).padStart(2,'0')+':'+String(v%60).padStart(2,'0');
const fmt=d=>new Intl.DateTimeFormat('en',{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(d+'T12:00:00Z'));
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

FitLensFace.mount($('#reminder-face'),{expression:'calm',allowMotion:()=>!matchMedia('(prefers-reduced-motion:reduce)').matches});
$('.phone').dataset.mode='single';$('#choose-day').hidden=true;$('#date-section').hidden=true;$('#individual-list').hidden=true;$('#apply-all').hidden=true;
$('#context-label').textContent=batch?'YOUR SELECTED SESSIONS':'JUST THIS SESSION';$('#context-description').textContent=batch?'One time, for '+sessions.length+' selected workouts. Each keeps its own day.':'Choose a time, or keep this workout date-only.';
$('#editing-day').textContent=batch?sessions.length+' selected days':fmt(sessions[0].date);$('#editing-session').textContent=batch?'Make a little space.':sessions[0].name;
$('#enabled').setAttribute('aria-label','Show a reminder preview');
const reminder=$('.notification-section');if(batch){const label=document.createElement('label');label.className='batch-reminder';label.innerHTML='<input type="checkbox"> Also update reminders';reminder.prepend(label);label.querySelector('input').onchange=e=>{changeReminder=e.target.checked;dirty=true;render();};}
const quick=document.createElement('div');quick.className='time-quick-picks';quick.setAttribute('aria-label','Quick workout times');[['07:00','Morning'],['12:00','Midday'],['18:30','Evening']].forEach(([value,label])=>{const b=document.createElement('button');b.type='button';b.dataset.quickTime=value;b.innerHTML='<strong>'+value+'</strong><span>'+label+'</span>';b.onclick=()=>{time=value;hasTime=true;dirty=true;render();};quick.append(b);});$('.time-hero').after(quick);
if(batch){const chosen=document.createElement('div');chosen.className='chosen-time-days';chosen.setAttribute('aria-label','Selected workout days');sessions.forEach(s=>{const chip=document.createElement('span');chip.textContent=fmt(s.date);chosen.append(chip);});$('.day-context').append(chosen);$('#editing-session').textContent='One time for these workouts';$('#context-description').textContent='Each workout keeps its own day.';$('#times-disclosure').querySelector('summary').childNodes[0].textContent='Selected workouts ';}
$('#day-times').replaceChildren(...sessions.map(s=>{const row=document.createElement('p');row.textContent=fmt(s.date)+' · '+s.name+' · '+(s.time||'No time set');return row;}));$('#times-disclosure').hidden=!batch;
function render(){const hour=minutes(time)/60;paintSky(hour);const period=hour>=6&&hour<12?'morning':hour>=12&&hour<17?'afternoon':hour>=17&&hour<20?'evening':'night';$('.phone').dataset.period=period;$('#period-label').textContent={morning:'A morning moment',afternoon:'Room in the afternoon',evening:'An evening pause',night:'A quiet moment'}[period];$('#exact-time').value=hasTime?time:'';$('#time-slider').value=minutes(time);$('#time-slider').setAttribute('aria-valuetext',time);$('#readable-time').textContent=hasTime?time:'Choose time';$('#unset-label').hidden=hasTime;$('#use-time').hidden=true;$('#enabled').setAttribute('aria-checked',String(enabled));$('#enabled').disabled=!changeReminder||!hasTime;$('#notification-details').hidden=!changeReminder||!enabled;$('#remind-before').value=String(before);const notice=FitLensReminders.notificationDate(sessions[0].date,{time,enabled,before});$('#preview-time').textContent=notice?.time||time;$('#delivery-note').textContent=changeReminder?(enabled?'Reminder preview · '+before+' minutes before. No notifications are sent.':'Optional reminder preview. No notifications are sent.'):'Your existing reminders stay as they are.';$('#schedule-summary').textContent=(!hasTime?'No time set':time)+' · '+sessions.length+' '+(batch?'sessions':'session');document.querySelectorAll('[data-quick-time]').forEach(b=>b.setAttribute('aria-pressed',String(hasTime&&b.dataset.quickTime===time)));$('.notification-section>.section-heading').hidden=batch&&!changeReminder;$('.notification-section h2').textContent='Reminder preview';$('#save-button').disabled=false;$('#save-button').textContent=batch?'Apply to '+sessions.length+' sessions':'Save time';}
$('#exact-time').oninput=e=>{if(!e.target.value){hasTime=false;enabled=false;dirty=true;render();return;}if(M.validTime(e.target.value)){time=e.target.value;hasTime=true;dirty=true;render();}};$('#time-slider').oninput=e=>{time=format(Number(e.target.value));hasTime=true;dirty=true;render();};$('#enabled').onclick=()=>{if(!changeReminder)return;enabled=!enabled;dirty=true;render();};$('#remind-before').onchange=e=>{before=Number(e.target.value);dirty=true;render();};
$('#reminder-form').onsubmit=e=>{e.preventDefault();try{M.setTimes(sessions.map(s=>s.id),hasTime?time:null,{draft,changeReminder,enabled:hasTime&&enabled,before});saving=true;location.href=back+(back.includes('?')?'&':'?')+'savedTimes='+sessions.length;}catch(err){$('#save-status').textContent=err.message;}};
$('#remove-day').hidden=!sessions.some(s=>s.time);$('#remove-day').onclick=()=>{if(!confirm('Clear the time for these selected workouts? The workouts stay in your plan.'))return;M.setTimes(sessions.map(s=>s.id),null,{draft});saving=true;location.href=back;};
window.addEventListener('beforeunload',e=>{if(dirty&&!saving){e.preventDefault();e.returnValue='';}});render();
})();
