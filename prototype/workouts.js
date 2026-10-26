const routines={upper:{name:'Upper Body',detail:'Chest · Back · Shoulders',count:6,minutes:50},lower:{name:'Lower Body',detail:'Legs · Glutes',count:5,minutes:48},full:{name:'Full Body',detail:'A little of everything',count:7,minutes:60}};
const phone=document.querySelector('.workouts-phone');
function placeSheet(dialog){const r=phone.getBoundingClientRect();dialog.style.position='fixed';dialog.style.left=r.left+'px';dialog.style.bottom=Math.max(0,innerHeight-r.bottom)+'px';dialog.style.width=r.width+'px';}
function openSheet(dialog){placeSheet(dialog);dialog.showModal();}
window.addEventListener('resize',()=>document.querySelectorAll('dialog[open]').forEach(placeSheet));
const picker=document.querySelector('#routine-picker'),next=document.querySelector('#coming-next');
document.querySelector('#choose-workout').addEventListener('click',()=>openSheet(picker));
document.querySelectorAll('.close-sheet,.next-dismiss').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
function selectRoutine(key){const r=routines[key];document.querySelector('#today-title').textContent=r.name;document.querySelector('#today-description').innerHTML=`${r.detail}<br>${r.count} exercises · About ${r.minutes} min`;document.querySelector('#choose-workout').childNodes[0].textContent='Change Workout';document.querySelector('#selection-status').textContent=`${r.name} selected for today.`;if(picker.open)picker.close();document.querySelector('.workouts-scroll').scrollTop=0;}
document.querySelectorAll('[data-routine]').forEach(b=>b.addEventListener('click',()=>{const from=b.closest('#routine-picker')?'&from=picker':'';location.href='workout-details.html?routine='+encodeURIComponent(b.dataset.routine)+from;}));
function previewNote(kind){
if(kind==='schedule'){location.href='setup-plan.html?view=week&v=reminders-8';return;}
document.querySelector('#next-title').textContent='Create Workout';const panel=document.querySelector('#next-description');panel.replaceChildren();const form=document.createElement('form');form.className='quick-form';
form.innerHTML='<label class="name-field">Workout name<input name="name" required maxlength="40" placeholder="e.g. My Sunday session" autocomplete="off"></label><p>Add exercises now, or pick a date for later.</p><button class="next-dismiss" type="submit" name="when" value="now">Create & edit <span aria-hidden="true">↗</span></button><button class="schedule-single" type="submit" name="when" value="later">Schedule for later</button><p class="create-status" role="status"></p>';
form.addEventListener('submit',e=>{e.preventDefault();const name=new FormData(form).get('name').trim();if(!name)return;try{const session=FitLensReminders.createSingle(name);FitLensReminders.saveSingle(localStorage,session);next.close();location.href=e.submitter?.value==='later'?'reminders.html?single='+encodeURIComponent(session.id)+'&v=sky-9':'workout-details.html?session='+encodeURIComponent(session.id)+'&v=reminders-8';}catch{form.querySelector('.create-status').textContent='Couldn’t keep this session. Please try again.';}});
panel.append(form);openSheet(next);
}

document.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>previewNote(b.dataset.open)));
document.querySelector('#empty-workout').addEventListener('click',()=>previewNote('create'));
if(new URLSearchParams(location.search).get('choose')==='1')openSheet(picker);

// Keep reminders available alongside the existing schedule controls.
const reminderLink = document.createElement('a');
reminderLink.href = 'reminders.html?v=sky-9';
reminderLink.className = 'workout-reminder-link';
reminderLink.textContent = 'Workout reminders';
const reminderArrow = document.createElement('span');
reminderArrow.textContent = '↗';
reminderArrow.setAttribute('aria-hidden', 'true');
reminderLink.append(reminderArrow);
document.querySelector('.schedule-section').append(reminderLink);

function renderScheduledSessions(){
let all=[];try{all=FitLensReminders.singles(localStorage).sort((a,b)=>(a.schedule?a.schedule.date+a.schedule.time:'z').localeCompare(b.schedule?b.schedule.date+b.schedule.time:'z'));}catch{}
let section=document.querySelector('#scheduled-singles');if(!section){section=document.createElement('section');section.id='scheduled-singles';section.className='scheduled-singles';document.querySelector('.schedule-section').before(section);}section.hidden=!all.length;section.replaceChildren();if(!all.length)return;const heading=document.createElement('h2');heading.textContent='Your sessions';section.append(heading);
all.forEach(s=>{const a=document.createElement('a'),copy=document.createElement('span'),name=document.createElement('strong'),meta=document.createElement('small'),arrow=document.createElement('span');a.href='workout-details.html?session='+encodeURIComponent(s.id)+'&v=reminders-8';name.textContent=s.name;meta.textContent=s.schedule?new Intl.DateTimeFormat('en',{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(s.schedule.date+'T12:00:00Z'))+' · '+s.schedule.time+' · One time':'Not scheduled · '+s.items.length+' exercises';arrow.textContent='›';copy.append(name,meta);a.append(copy,arrow);section.append(a);});
}
renderScheduledSessions();window.addEventListener('pageshow',renderScheduledSessions);
