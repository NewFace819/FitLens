/* Sample routines for UI review. These targets are not personalized prescriptions. */
const catalog={bench:{name:'Bench Press',art:'bench',sets:3,reps:'8–12',rest:90},pull:{name:'Lat Pulldown',art:'pull',sets:3,reps:'10–12',rest:90},row:{name:'Seated Row',art:'row',sets:3,reps:'10–12',rest:90},press:{name:'Shoulder Press',art:'press',sets:3,reps:'8–12',rest:90},raise:{name:'Lateral Raise',art:'raise',sets:3,reps:'12–15',rest:60},cable:{name:'Triceps Pushdown',art:'cable',sets:3,reps:'10–15',rest:60},squat:{name:'Goblet Squat',art:'press',sets:3,reps:'8–12',rest:90},rdl:{name:'Romanian Deadlift',art:'bench',sets:3,reps:'8–12',rest:90},legpress:{name:'Leg Press',art:'row',sets:3,reps:'10–12',rest:90},curl:{name:'Leg Curl',art:'row',sets:3,reps:'10–15',rest:60},calf:{name:'Calf Raise',art:'raise',sets:3,reps:'12–15',rest:60},biceps:{name:'Biceps Curl',art:'press',sets:3,reps:'10–12',rest:60}};
const exerciseIllustrations={squat:'gobletsquat',raise:'lateralraise',pull:'latpulldown',legpress:'legpress',rdl:'romaniandeadlift',row:'seatedrow',press:'shoulderpress',cable:'tricepspushdown'};
function exerciseImage(item){return exerciseIllustrations[item.id]?`assets/workout_illustrations/${exerciseIllustrations[item.id]}.svg`:`assets/icons/exercise-${item.art}.svg`;}
const routines={upper:{title:['UPPER','BODY'],number:'01',minutes:50,muscles:'Chest, back & shoulders',equipment:'Barbell, dumbbells & cable machines',color:'#dcd7ed',accent:'#d68b65',items:['bench','pull','row','press','raise','cable']},lower:{title:['LOWER','BODY'],number:'02',minutes:48,muscles:'Legs & glutes',equipment:'Kettlebell, barbell, dumbbells & leg machines',color:'#edcfb8',accent:'#ab6d52',items:['squat','rdl','legpress','curl','calf']},full:{title:['FULL','BODY'],number:'03',minutes:60,muscles:'Upper body, legs & glutes',equipment:'Barbell, dumbbells & cable machines',color:'#d3dfb5',accent:'#759271',items:['squat','bench','rdl','pull','press','row','raise']}};
const params=new URLSearchParams(location.search);let storedSession=null;
try{storedSession=FitLensReminders.singles(localStorage).find(s=>s.id===params.get('session'))||null;}catch{}
const key=storedSession?.routine||(Object.hasOwn(routines,params.get('routine'))?params.get('routine'):'upper');
const routine=storedSession?{...routines[key],title:[storedSession.name,''],number:'YOUR SESSION',minutes:0,muscles:'Your own session',equipment:'Based on the exercises you add.',items:[]}:routines[key];
const $=s=>document.querySelector(s),phone=$('.details-phone');let items=storedSession?storedSession.items.filter(i=>catalog[i.id]).map(i=>({...catalog[i.id],...i})):routine.items.map(id=>({...catalog[id],id})),editing=false,selected=0;
phone.dataset.routine=key;phone.style.setProperty('--routine-color',routine.color);phone.style.setProperty('--art-accent',routine.accent);
$('#routine-title').replaceChildren(document.createTextNode(routine.title[0]),document.createElement('br'),document.createTextNode(routine.title[1]),Object.assign(document.createElement('span'),{textContent:'.'}));
$('#routine-number').textContent='/ '+routine.number;$('#duration').textContent=storedSession?'Your pace. Your own session.':`About ${routine.minutes} min`;$('#muscle-caption').textContent=routine.muscles;$('#equipment').textContent=routine.equipment;$('.body-art').src=`assets/illustrations/${key}.svg`;$('.body-art').alt=`${routine.title.join(' ')} workout illustration`;
if(params.get('from')==='picker')$('#back-link').href='workouts.html?choose=1&v=reminders-8';
function placeSheet(dialog){const r=phone.getBoundingClientRect();Object.assign(dialog.style,{left:r.left+'px',width:r.width+'px',bottom:Math.max(0,innerHeight-r.bottom)+'px'})}
function openSheet(dialog){placeSheet(dialog);dialog.showModal()}
window.addEventListener('resize',()=>document.querySelectorAll('dialog[open]').forEach(placeSheet));
document.querySelectorAll('.close-sheet').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
function announce(text){$('#workout-announcement').textContent=text}
function render(){const list=$('#exercise-list');list.replaceChildren();items.forEach((item,index)=>{
 const row=document.createElement('div');row.className='exercise-row';const ordinal=document.createElement('span');ordinal.className='exercise-index';ordinal.textContent=String(index+1).padStart(2,'0');row.append(ordinal);
 const button=document.createElement('button');button.type='button';button.className='exercise-main';button.setAttribute('aria-label',`Edit ${item.name}, ${item.sets} sets, ${item.reps} reps`);
 button.innerHTML=`<span class="exercise-art${exerciseIllustrations[item.id]?' has-illustration':''}"><img src="${exerciseImage(item)}" alt=""></span><span class="exercise-copy"><strong></strong><span><b>${item.sets} sets</b> × <span class="reps"></span> reps</span></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>`;
 button.querySelector('strong').textContent=item.name;button.querySelector('.reps').textContent=item.reps;button.addEventListener('click',()=>editExercise(index));row.append(button);
 if(editing){const controls=document.createElement('div');controls.className='reorder-buttons';for(const direction of [-1,1]){const b=document.createElement('button');b.type='button';b.textContent=direction<0?'↑':'↓';b.setAttribute('aria-label',`Move ${item.name} ${direction<0?'up':'down'}`);b.disabled=index+direction<0||index+direction>=items.length;b.addEventListener('click',()=>{[items[index],items[index+direction]]=[items[index+direction],items[index]];render();announce(`${item.name} moved ${direction<0?'up':'down'}`);const target=$('#exercise-list').children[index+direction].querySelector('.exercise-main');target.focus()});controls.append(b)}row.append(controls)}list.append(row)
 });if(!items.length){const empty=document.createElement('p');empty.className='empty-session-hint';empty.textContent='Add your first exercise to get started.';list.append(empty);}$('#start-workout').disabled=!items.length;if(storedSession){storedSession.items=items.map(i=>({...i}));try{FitLensReminders.saveSingle(localStorage,storedSession);}catch{announce('Exercise changes could not be kept on this device.');}}$('#exercise-total').textContent=`${items.length} ${items.length===1?'exercise':'exercises'}`;$('#footer-exercises').textContent=`${items.length} ${items.length===1?'exercise':'exercises'}`;
}
function editExercise(index){selected=index;const item=items[index],form=$('#exercise-form');$('#editor-title').textContent=item.name;for(const field of ['sets','reps','rest'])form.elements[field].value=item[field];openSheet($('#exercise-editor'))}
$('#exercise-form').addEventListener('submit',e=>{e.preventDefault();const form=e.currentTarget;const reps=form.elements.reps.value.trim();if(!reps)return;Object.assign(items[selected],{sets:Number(form.elements.sets.value),reps,rest:Number(form.elements.rest.value)});$('#exercise-editor').close();render();announce('Exercise updated.')});
$('#edit-workout').addEventListener('click',()=>{editing=!editing;$('#edit-workout').textContent=editing?'Done':'Edit';$('#edit-workout').setAttribute('aria-pressed',String(editing));render()});
$('#add-exercise').addEventListener('click',()=>{const list=$('#library-list');list.replaceChildren();for(const id of ['biceps','raise','pull','squat']){const item=catalog[id],b=document.createElement('button');b.type='button';b.className='library-option';b.innerHTML='<span><strong></strong><small></small></span><span>＋</span>';b.querySelector('strong').textContent=item.name;b.querySelector('small').textContent=`${item.sets} sets × ${item.reps} reps`;b.addEventListener('click',()=>{items.push({...item,id});$('#exercise-library').close();render();announce(`${item.name} added`)});list.append(b)}openSheet($('#exercise-library'))});
$('#routine-menu').addEventListener('click',()=>openSheet($('#options-sheet')));
$('#reset-routine').addEventListener('click',()=>{items=routine.items.map(id=>({...catalog[id],id}));$('#options-sheet').close();render();announce('Original routine restored.')});
render();

// Open the review study without pretending a workout was recorded.
document.querySelector('#preview-review').href='workout-review.html?routine='+encodeURIComponent(key);

// Camera preparation is a separate UI study, not a recorded workout.
document.querySelector('#preview-camera').href='camera-setup.html?routine='+encodeURIComponent(key);

// Open the local active-session UI with the routine currently being edited.
$('#start-workout').addEventListener('click',()=>{
 if(!items.length)return;
 try{sessionStorage.setItem('fitlens-ui-session-plan',JSON.stringify({routine:key,items,sessionName:storedSession?.name||null,sessionId:storedSession?.id||null}));sessionStorage.removeItem('fitlens-ui-active');}catch{}
 location.href='workout-active.html?routine='+encodeURIComponent(key)+(storedSession?'&session='+encodeURIComponent(storedSession.id):'')+'&v=reminders-8';
});

const scheduleButton=document.createElement('button');scheduleButton.id='schedule-workout';scheduleButton.type='button';scheduleButton.textContent=storedSession?.schedule?'Change date & reminder':'Schedule for later';$('#start-workout').after(scheduleButton);
if(storedSession?.schedule){const when=document.createElement('p');when.className='single-schedule-label';when.textContent=new Intl.DateTimeFormat('en',{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(storedSession.schedule.date+'T12:00:00Z'))+' · '+storedSession.schedule.time+' · One time';$('#duration').after(when);}
scheduleButton.addEventListener('click',()=>{try{if(!storedSession)storedSession=FitLensReminders.createSingle({upper:'Upper Body',lower:'Lower Body',full:'Full Body'}[key],items.map(i=>({...i})),key);storedSession.items=items.map(i=>({...i}));FitLensReminders.saveSingle(localStorage,storedSession);location.href='reminders.html?single='+encodeURIComponent(storedSession.id)+'&v=sky-9';}catch{announce('Couldn’t open scheduling. Please try again.');}});
