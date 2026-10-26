(() => {
'use strict';
const $=s=>document.querySelector(s),model=FitLensPlan,phone=$('.setup-phone');
let state=model.normalize(),step=0,plan=null,selectedDay=null,moving=false;
try{state=model.normalize(JSON.parse(sessionStorage.getItem('fitlens:plan-draft'))||{});}catch{}
const face=FitLensFace.mount($('#setup-face'),{expression:'waiting',allowMotion:()=>true,themeTarget:$('#setup-theme')});
const steps=[...document.querySelectorAll('.setup-step')];
const dayNames=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
function reminderFor(day){return plan?.days[day]?.timing||null;}
const timeButton=document.createElement('button');timeButton.id='set-session-time';timeButton.type='button';timeButton.textContent='Set time & reminder ↗';$('#move-session').before(timeButton);
timeButton.addEventListener('click',()=>{if(!plan||selectedDay===null)return;try{sessionStorage.setItem('fitlens:weekly-plan-edit',JSON.stringify(plan));location.href='reminders.html?from=draft&session='+encodeURIComponent(plan.days[selectedDay].sessionId)+'&v=sky-9';}catch{$('#move-instruction').textContent='Couldn’t open the time editor. Please try again.';}});
const dumbbell='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m7 7 10 10M4 9l5-5m6 16 5-5M2 7l5-5m10 20 5-5"/></svg>';
function saveDraft(){try{sessionStorage.setItem('fitlens:plan-draft',JSON.stringify(state));}catch{}}
function fold(id,open){const el=$(id);el.dataset.open=String(open);el.inert=!open;el.setAttribute('aria-hidden',String(!open));}
function mark(group,value,attr){const buttons=[...document.querySelectorAll(`[${attr}]`)];buttons.forEach((b,i)=>{const checked=String(value)===b.getAttribute(attr);b.setAttribute('aria-checked',String(checked));b.tabIndex=checked||(!value&&i===0)?0:-1;});}
function radio(attr,change){const buttons=[...document.querySelectorAll(`[${attr}]`)];buttons.forEach((b,i)=>{b.addEventListener('click',()=>change(b.getAttribute(attr)));b.addEventListener('keydown',e=>{let n;if(['ArrowRight','ArrowDown'].includes(e.key))n=(i+1)%buttons.length;if(['ArrowLeft','ArrowUp'].includes(e.key))n=(i+buttons.length-1)%buttons.length;if(e.key==='Home')n=0;if(e.key==='End')n=buttons.length-1;if(n!==undefined){e.preventDefault();buttons[n].click();buttons[n].focus({preventScroll:true});}});});}
function update(){
mark(null,state.goal,'data-goal');mark(null,state.experience,'data-experience');mark(null,state.frequency,'data-frequency');mark(null,state.duration,'data-duration');mark(null,state.place,'data-place');mark(null,state.body,'data-body');
fold('#experience-fold',Boolean(state.goal));fold('#equipment-fold',state.place==='home');fold('#regions-fold',state.body==='yes');
document.querySelectorAll('[data-equipment]').forEach(b=>b.setAttribute('aria-pressed',String(state.equipment.includes(b.dataset.equipment))));
document.querySelectorAll('[data-region]').forEach(b=>b.setAttribute('aria-pressed',String(state.regions.includes(b.dataset.region))));
const days=model.patterns[state.frequency],mini=$('#mini-week');
if(!mini.children.length)dayNames.forEach((name,i)=>{const d=document.createElement('div');d.className='mini-day';d.innerHTML=`<b>${name.slice(0,1)}</b><span>${dumbbell}</span>`;mini.append(d);});
[...mini.children].forEach((d,i)=>{const train=days.includes(i);d.classList.toggle('training',train);d.setAttribute('aria-label',`${dayNames[i]}: ${train?'sample workout':'rest'}`);d.querySelector('svg').style.opacity=train?'1':'0';});
mini.setAttribute('aria-label',`${state.frequency} sessions, suggested on ${days.map(i=>dayNames[i]).join(', ')}`);$('#week-total').textContent=state.frequency*state.duration;
const hints=[!state.goal?'Choose your goal to get started.':!state.experience?'A little about your recent training.':'You can change this later.','A suggested starting point. Make it yours.',!state.place?'Choose where you’ll train.':state.place==='home'&&!state.equipment.length?'Choose your equipment, or just bodyweight.':!state.body?'Let us know if there are areas to avoid.':state.body==='yes'&&!state.regions.length?'Choose at least one area to leave out.':'Ready to see your week?','Nothing is locked in. Move a session if you like.'];
$('#setup-hint').textContent=step===3&&!plan?'Your exclusions are kept. No plan has been created.':hints[step];$('#setup-next').disabled=step===3?!plan:!model.valid(state,step);$('#next-label').textContent=step===3?'Start this week':step===2?'See my week':'Continue';saveDraft();
}
function go(to){
const previous=step;step=Math.max(0,Math.min(3,to));steps.forEach((s,i)=>s.hidden=i!==step);$('#setup-scroll').scrollTop=0;phone.dataset.step=step;
const progress=$('.setup-progress');progress.setAttribute('aria-valuenow',Math.min(3,step+1));progress.setAttribute('aria-valuetext',step===3?'Your draft week':`Step ${step+1} of 3`);[...progress.children].forEach((s,i)=>s.classList.toggle('active',i<=step));
face.set(step===3?'content':step===0?'waiting':step===2&&state.body==='yes'?'concerned':'happy',{duration:400});
if(step===3)renderPlan();update();if(step===3&&plan)$('#draft-week').querySelectorAll('.draft-day').forEach((row,i)=>row.animate([{opacity:0,transform:'translateY(9px)'},{opacity:1,transform:'translateY(0)'}],{duration:260,delay:i*25,fill:'both',easing:'ease-out'}));const heading=steps[step].querySelector('h1');heading.focus({preventScroll:true});
steps[step].animate([{opacity:0,transform:`translateX(${to<previous?-14:14}px)`},{opacity:1,transform:'translateX(0)'}],{duration:280,easing:'cubic-bezier(.2,.7,.3,1)'});
}
function changed(){plan=null;update();}
radio('data-goal',v=>{state.goal=v;face.set('happy');changed();});
radio('data-experience',v=>{state.experience=v;face.set('content');changed();});
radio('data-frequency',v=>{state.frequency=Number(v);changed();});radio('data-duration',v=>{state.duration=Number(v);changed();});
radio('data-place',v=>{state.place=v;changed();});radio('data-body',v=>{state.body=v;face.set(v==='yes'?'concerned':'happy');changed();});
document.querySelectorAll('[data-equipment]').forEach(b=>b.addEventListener('click',()=>{const v=b.dataset.equipment;if(v==='none')state.equipment=state.equipment.includes(v)?[]:['none'];else{state.equipment=state.equipment.filter(x=>x!=='none');state.equipment=state.equipment.includes(v)?state.equipment.filter(x=>x!==v):[...state.equipment,v];}changed();}));
document.querySelectorAll('[data-region]').forEach(b=>b.addEventListener('click',()=>{const v=b.dataset.region;state.regions=state.regions.includes(v)?state.regions.filter(x=>x!==v):[...state.regions,v];changed();}));
$('#setup-mascot').addEventListener('click',()=>{face.set(state.body==='yes'&&step===2?'calm':'energized');$('#setup-mascot').animate([{transform:'rotate(-4deg)'},{transform:'rotate(4deg)'},{transform:'rotate(-4deg)'}],{duration:450});clearTimeout(face.resetTimer);face.resetTimer=setTimeout(()=>face.set(step===3?'content':step===0&&!state.goal?'waiting':state.body==='yes'&&step===2?'concerned':'happy'),750);});
function dateFor(i){const d=new Date(plan.weekStart+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+i);return d;}
function renderPlan(){
$('#draft-summary').textContent=`${state.frequency} sessions · ${state.duration} min · ${state.place==='gym'?'Gym':'Home'}`;
$('#move-session').textContent='Move to another day ↔';$('#draft-week').before($('#session-peek'));$('#draft-week').replaceChildren();$('#blocked-plan').hidden=Boolean(plan);$('#session-peek').hidden=true;$('#move-instruction').textContent='';
$('#draft-exclusions').hidden=state.body!=='yes';$('#draft-exclusions').textContent=state.body==='yes'?`Left out: ${state.regions.map(k=>model.regionNames[k]).join(', ')}.`:'';
$('#draft-title').innerHTML=plan?'Your week.<br>A little more you.':'Let’s take<br>another look.';if(!plan){face.set('waiting');return;}
plan.days.forEach((session,i)=>{const date=dateFor(i),b=document.createElement('button');b.className='draft-day '+(session?'training':'rest');b.type='button';if(session)b.dataset.kind=session.kind;b.setAttribute('aria-label',`${dayNames[i]}, ${date.getUTCDate()}: ${session?session.title+', '+session.duration+' minutes':'Rest day'}`);b.setAttribute('aria-pressed','false');
const stamp=document.createElement('span');stamp.className='day-date';stamp.append(document.createTextNode(dayNames[i]));const number=document.createElement('strong');number.textContent=date.getUTCDate();stamp.append(number);const copy=document.createElement('span');copy.className='day-copy';const title=document.createElement('strong');title.textContent=session?session.title:'Room to rest';copy.append(title);if(session){const meta=document.createElement('small');const timing=reminderFor(i);meta.textContent=`${session.duration} min · ${timing?timing.time+' · '+(timing.enabled?'Reminder on':'Reminder off'):'Time not set'}`;copy.append(meta);}const arrow=document.createElement('span');arrow.className='day-arrow';arrow.setAttribute('aria-hidden','true');arrow.textContent=session?'›':'—';b.append(stamp,copy,arrow);b.addEventListener('click',()=>selectDay(i));$('#draft-week').append(b);});
if(selectedDay!==null&&plan.days[selectedDay])showPeek();
}
function showPeek(){const s=plan.days[selectedDay];if(!s)return;const timing=reminderFor(selectedDay);timeButton.textContent=timing?'Change time & reminder ↗':'Set time & reminder ↗';const row=$('#draft-week').querySelectorAll('.draft-day')[selectedDay];row.after($('#session-peek'));$('#session-peek').hidden=false;$('#peek-day').textContent=dayNames[selectedDay].toUpperCase()+' / '+new Intl.DateTimeFormat('en',{month:'short',day:'numeric',timeZone:'UTC'}).format(dateFor(selectedDay));$('#peek-title').textContent=s.title;$('#peek-description').textContent=`${s.duration} minutes · ${s.sets} sample rounds${s.id==='walk'?' at your own pace':', with room for a warm-up and breaks'}.`;$('#peek-exercises').replaceChildren(...s.exercises.map(name=>{const li=document.createElement('li');li.textContent=name;return li;}));[...$('#draft-week').querySelectorAll('.draft-day')].forEach((b,i)=>{b.classList.toggle('selected',i===selectedDay);b.setAttribute('aria-pressed',String(i===selectedDay));});}
function selectDay(index){if(moving){if(index===selectedDay){cancelMove();return;}[plan.days[index],plan.days[selectedDay]]=[plan.days[selectedDay],plan.days[index]];selectedDay=index;moving=false;renderPlan();showPeek();$('#setup-announcement').textContent=`Session moved to ${dayNames[index]}.`;return;}if(!plan.days[index]){$('#move-instruction').textContent='A rest day. Choose a workout day to move or swap a session.';return;}selectedDay=index;$('#move-instruction').textContent='';showPeek();}
function cancelMove(){moving=false;$('#move-instruction').textContent='';[...$('#draft-week').querySelectorAll('.draft-day')].forEach(b=>b.classList.remove('move-target'));$('#move-session').textContent='Move to another day ↔';}
$('#move-session').addEventListener('click',()=>{if(moving){cancelMove();return;}moving=true;$('#move-instruction').textContent='Choose another day. Occupied days will swap.';$('#move-session').textContent='Cancel move';[...$('#draft-week').querySelectorAll('.draft-day')].forEach((b,i)=>b.classList.toggle('move-target',i!==selectedDay));});
$('#setup-back').addEventListener('click',()=>{if(step===0)location.href='home.html?v=reminders-8';else{cancelMove();go(step-1);}});
$('#edit-answers').addEventListener('click',()=>{cancelMove();go(0);});$('#edit-constraints').addEventListener('click',()=>go(2));
$('#setup-next').addEventListener('click',()=>{if($('#setup-next').disabled)return;if(step<2){go(step+1);return;}if(step===2){plan=model.build(state);selectedDay=null;moving=false;go(3);return;}try{sessionStorage.setItem('fitlens:weekly-plan',JSON.stringify(plan));location.href='home.html?v=reminders-8';}catch{$('#setup-hint').textContent='This browser cannot keep your plan. You can still explore the draft.';}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&moving){cancelMove();$('#move-session').focus();}});
if(['week','draft'].includes(new URLSearchParams(location.search).get('view'))){try{const isDraft=new URLSearchParams(location.search).get('view')==='draft';const saved=model.restore(JSON.parse(sessionStorage.getItem(isDraft?'fitlens:weekly-plan-edit':'fitlens:weekly-plan')));if(saved){plan=saved;state=model.normalize(saved.form);go(3);}else go(0);}catch{go(0);}}else go(0);
})();
