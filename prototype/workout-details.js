/* Sample routines for UI review. These targets are not personalized prescriptions. */
const catalog={bench:{name:'Bench Press',art:'bench',sets:3,reps:'8–12',rest:90},pull:{name:'Lat Pulldown',art:'pull',sets:3,reps:'10–12',rest:90},row:{name:'Seated Row',art:'row',sets:3,reps:'10–12',rest:90},press:{name:'Shoulder Press',art:'press',sets:3,reps:'8–12',rest:90},raise:{name:'Lateral Raise',art:'raise',sets:3,reps:'12–15',rest:60},cable:{name:'Triceps Pushdown',art:'cable',sets:3,reps:'10–15',rest:60},squat:{name:'Goblet Squat',art:'press',sets:3,reps:'8–12',rest:90},rdl:{name:'Romanian Deadlift',art:'bench',sets:3,reps:'8–12',rest:90},legpress:{name:'Leg Press',art:'row',sets:3,reps:'10–12',rest:90},curl:{name:'Leg Curl',art:'row',sets:3,reps:'10–15',rest:60},calf:{name:'Calf Raise',art:'raise',sets:3,reps:'12–15',rest:60},biceps:{name:'Biceps Curl',art:'press',sets:3,reps:'10–12',rest:60}};
const exerciseIllustrations={squat:'gobletsquat',raise:'lateralraise',pull:'latpulldown',legpress:'legpress',rdl:'romaniandeadlift',row:'seatedrow',press:'shoulderpress',cable:'tricepspushdown'};
function exerciseImage(item){return exerciseIllustrations[item.id]?`assets/workout_illustrations/${exerciseIllustrations[item.id]}.svg`:item.art==='bodyweight'?'assets/illustrations/full.svg':`assets/icons/exercise-${item.art}.svg`;}
const routines={upper:{title:['UPPER','BODY'],number:'01',minutes:50,muscles:'Chest, back & shoulders',equipment:'Barbell, dumbbells & cable machines',color:'#dcd7ed',accent:'#d68b65',items:['bench','pull','row','press','raise','cable']},lower:{title:['LOWER','BODY'],number:'02',minutes:48,muscles:'Legs & glutes',equipment:'Kettlebell, barbell, dumbbells & leg machines',color:'#edcfb8',accent:'#ab6d52',items:['squat','rdl','legpress','curl','calf']},full:{title:['FULL','BODY'],number:'03',minutes:60,muscles:'Upper body, legs & glutes',equipment:'Barbell, dumbbells & cable machines',color:'#d3dfb5',accent:'#759271',items:['squat','bench','rdl','pull','press','row','raise']}};
const M=FitLensTraining,params=new URLSearchParams(location.search),draft=params.get('draft')==='1',planned=params.get('planned');
let storedSession=planned?M.find(planned,draft):params.has('new')?{name:'My workout',routine:'full',minutes:30,items:[]}:M.template(params.get('workout')||params.get('routine')||'upper');
if(!storedSession){location.replace(planned?'plan.html':'workouts.html');storedSession={name:'Workout unavailable',routine:'full',minutes:30,items:[]};}
Object.assign(catalog,M.exercises);
const key=storedSession.routine||'full';
const sessionDateLabel=date=>date===M.today()?'Today':date===M.addDays(M.today(),1)?'Tomorrow':new Intl.DateTimeFormat('en',{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
const routine={...routines[key],title:[storedSession.name,''],number:planned?(draft?'DRAFT SESSION':'THIS SESSION'):'YOUR WORKOUT',minutes:storedSession.minutes,muscles:planned?sessionDateLabel(storedSession.date)+' · '+(storedSession.time||'No time set'):'Start now, or add to your week.',equipment:'Based on the exercises you add.',items:storedSession.items.map(i=>i.id)};
const $=s=>document.querySelector(s),phone=$('.details-phone');let items=storedSession?storedSession.items.filter(i=>catalog[i.id]).map(i=>({...catalog[i.id],...i})):routine.items.map(id=>({...catalog[id],id})),editing=false,selected=0;
phone.dataset.routine=key;phone.style.setProperty('--routine-color',routine.color);phone.style.setProperty('--art-accent',routine.accent);
$('#routine-title').classList.add('custom-workout-title');
$('#routine-title').replaceChildren(document.createTextNode(routine.title[0]),document.createTextNode(routine.title[1]?' '+routine.title[1]:''));
$('#routine-number').textContent='/ '+routine.number;$('#duration').textContent=`About ${routine.minutes} min`;$('#muscle-caption').textContent=routine.muscles;$('#equipment').textContent=routine.equipment;$('.body-art').src=`assets/illustrations/${key}.svg`;$('.body-art').alt=`${routine.title.join(' ')} workout illustration`;
if(params.get('from')==='picker')$('#back-link').href='workouts.html?choose=1&v=reminders-8';
function placeSheet(dialog){const r=phone.getBoundingClientRect();Object.assign(dialog.style,{left:r.left+'px',width:r.width+'px',bottom:Math.max(0,innerHeight-r.bottom)+'px'})}
function openSheet(dialog){placeSheet(dialog);dialog.showModal()}
window.addEventListener('resize',()=>document.querySelectorAll('dialog[open]').forEach(placeSheet));
document.querySelectorAll('.close-sheet').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
function announce(text){$('#workout-announcement').textContent=text}
function render(){renderPlannedFocus();const list=$('#exercise-list');list.replaceChildren();items.forEach((item,index)=>{
 const row=document.createElement('div');row.className='exercise-row';const ordinal=document.createElement('span');ordinal.className='exercise-index';ordinal.textContent=String(index+1).padStart(2,'0');row.append(ordinal);
 const button=document.createElement('button');button.type='button';button.className='exercise-main';button.setAttribute('aria-label',`Edit ${item.name}, ${item.sets} sets, ${item.reps} reps`);
 button.innerHTML=`<span class="exercise-art${exerciseIllustrations[item.id]?' has-illustration':''}"><img src="${exerciseImage(item)}" alt=""></span><span class="exercise-copy"><strong></strong><span><b>${item.sets} sets</b> × <span class="reps"></span> reps</span></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>`;
 button.querySelector('strong').textContent=item.name;button.querySelector('.reps').textContent=item.reps;button.addEventListener('click',()=>editExercise(index));row.append(button);
 if(editing){const controls=document.createElement('div');controls.className='reorder-buttons';for(const direction of [-1,1]){const b=document.createElement('button');b.type='button';b.textContent=direction<0?'↑':'↓';b.setAttribute('aria-label',`Move ${item.name} ${direction<0?'up':'down'}`);b.disabled=index+direction<0||index+direction>=items.length;b.addEventListener('click',()=>{[items[index],items[index+direction]]=[items[index+direction],items[index]];render();announce(`${item.name} moved ${direction<0?'up':'down'}`);const target=$('#exercise-list').children[index+direction].querySelector('.exercise-main');target.focus()});controls.append(b)}row.append(controls)}list.append(row)
 });if(!items.length){const empty=document.createElement('p');empty.className='empty-session-hint';empty.textContent='Add your first exercise to get started.';list.append(empty);}$('#start-workout').disabled=!items.length;$('#exercise-total').textContent=`${items.length} ${items.length===1?'exercise':'exercises'}`;$('#footer-exercises').textContent=`${items.length} ${items.length===1?'exercise':'exercises'}`;
}
function editExercise(index){selected=index;const item=items[index],form=$('#exercise-form');$('#editor-title').textContent=item.name;for(const field of ['sets','reps','rest'])form.elements[field].value=item[field];openSheet($('#exercise-editor'))}
$('#exercise-form').addEventListener('submit',e=>{e.preventDefault();const form=e.currentTarget;const reps=form.elements.reps.value.trim();if(!reps)return;Object.assign(items[selected],{sets:Number(form.elements.sets.value),reps,rest:Number(form.elements.rest.value)});$('#exercise-editor').close();render();announce('Exercise updated.')});
$('#edit-workout').addEventListener('click',()=>{editing=!editing;$('#edit-workout').textContent=editing?'Done':'Edit';$('#edit-workout').setAttribute('aria-pressed',String(editing));render()});
$('#add-exercise').addEventListener('click',()=>{const list=$('#library-list');list.replaceChildren();for(const id of Object.keys(catalog)){const item=catalog[id],b=document.createElement('button');b.type='button';b.className='library-option';b.innerHTML='<span><strong></strong><small></small></span><span>＋</span>';b.querySelector('strong').textContent=item.name;b.querySelector('small').textContent=`${item.sets} sets × ${item.reps} reps`;b.addEventListener('click',()=>{items.push({...item,id});$('#exercise-library').close();render();announce(`${item.name} added`)});list.append(b)}openSheet($('#exercise-library'))});
$('#routine-menu').addEventListener('click',()=>openSheet($('#options-sheet')));
$('#reset-routine').addEventListener('click',()=>{items=routine.items.map(id=>({...catalog[id],id}));$('#options-sheet').close();render();announce('Original routine restored.')});
render();

// Open the review study without pretending a workout was recorded.
document.querySelector('#preview-review').href='workout-review.html?routine='+encodeURIComponent(key);

// Camera preparation is a separate UI study, not a recorded workout.
document.querySelector('#preview-camera').href='camera-setup.html?routine='+encodeURIComponent(key);


$('#back-link').href=planned?'plan.html?week='+M.weekStart(storedSession.date):'workouts.html';
const fields=document.createElement('div');fields.className='workout-fields';fields.innerHTML='<label>Workout name<input id="workout-name" maxlength="80" required></label><label>Minutes<input id="workout-minutes" type="number" min="5" max="180" required></label>';$('.exercise-section').before(fields);$('#workout-name').value=storedSession.name;$('#workout-minutes').value=storedSession.minutes;
fields.oninput=()=>{$('#routine-title').textContent=$('#workout-name').value||'My workout';};
function snapshot(){if(!$('#workout-name').reportValidity()||!$('#workout-minutes').reportValidity())return null;return {...storedSession,name:$('#workout-name').value.trim(),minutes:Number($('#workout-minutes').value),items:M.cleanItems(items)};}
const note=$('.closing-line');note.className='detail-message';note.setAttribute('role','status');note.textContent=planned?'Changes apply to this session only.':storedSession.starter?'Save your own version to keep these changes.':'Your workouts, ready whenever you are.';
function tell(text){note.textContent=text;announce(text);}
function persist(){if(planned&&JSON.stringify(M.find(planned,draft))!==JSON.stringify(storedSession)){tell('This session changed elsewhere. Reload it before saving your changes.');return null;}const value=snapshot();if(!value)return null;try{storedSession=planned?M.updateSession(planned,value,draft):M.saveTemplate({...value,id:value.starter?null:value.id,starter:false});if(!planned)history.replaceState(null,'','workout-details.html?workout='+encodeURIComponent(storedSession.id));tell(planned?'Session saved.':'Workout saved to your library.');syncDeleteWorkout();rememberWorkoutSave();return storedSession;}catch(e){tell(e.message);return null;}}
const save=document.createElement('button');save.type='button';save.id='save-workout';save.className='detail-save';save.textContent=planned?'Save this session':'Save workout';save.onclick=persist;fields.after(save);
const schedule=document.createElement('button');schedule.type='button';schedule.className='detail-schedule';schedule.textContent=planned?'Time & reminder':'Schedule for later';schedule.onclick=()=>{const value=snapshot();if(!value)return;if(planned){const saved=persist();if(!saved)return;FitLensTimeSheet([planned],{draft,onSaved:()=>{storedSession=M.find(planned,draft);$('#muscle-caption').textContent=sessionDateLabel(storedSession.date)+' · '+(storedSession.time||'No time set');tell('Time saved for this session.');}});}else try{FitLensSchedule(value);}catch(e){tell(e.message);}};$('#start-workout').after(schedule);
if(draft){$('#start-workout').textContent='Try this workout';note.textContent='Try this workout on its own. Your suggested week stays a draft.';}
$('#start-workout').onclick=()=>{const value=snapshot();if(value)try{FitLensStart(value,{plannedId:draft?null:planned,returnUrl:draft?location.pathname+location.search:null});}catch(e){tell(e.message);}};
const originalEdit=editExercise;editExercise=function(index){originalEdit(index);const form=$('#exercise-form');let remove=form.querySelector('.remove-exercise');if(!remove){remove=document.createElement('button');remove.type='button';remove.className='remove-exercise';remove.textContent='Remove exercise';form.append(remove);}remove.onclick=()=>{items.splice(selected,1);$('#exercise-editor').close();render();};};
if(planned&&storedSession.status!=='completed'){const replace=document.createElement('a');replace.className='option-row';replace.textContent='Replace workout';replace.href='plan.html?week='+M.weekStart(storedSession.date)+'&replace='+encodeURIComponent(planned)+(draft?'&draft=1':'');$('#options-sheet').append(replace);const remove=document.createElement('button');remove.className='option-row';remove.type='button';remove.textContent='Remove from this week';remove.onclick=()=>{const item=M.find(planned,draft);if(!item)return;M.remove(planned,draft);sessionStorage.setItem('fitlens:plan-undo',JSON.stringify({item,draft}));window.FitLensAllowWorkoutLeave();location.href='plan.html?week='+M.weekStart(storedSession.date)+'&removed=1';};$('#options-sheet').append(remove);}
if(storedSession.status==='completed'){fields.querySelectorAll('input').forEach(e=>e.disabled=true);save.hidden=schedule.hidden=$('#add-exercise').hidden=$('#edit-workout').hidden=true;$('#start-workout').disabled=true;$('#start-workout').textContent='Completed';document.querySelectorAll('.exercise-main').forEach(b=>b.disabled=true);tell('Completed. Your workout is recorded in Today.');}

if(planned&&storedSession.status==='planned'&&!draft){const done=document.createElement('button');done.type='button';done.className='option-row';done.textContent='Already completed this workout?';done.onclick=()=>location.href='workouts.html?log='+encodeURIComponent(planned);$('#options-sheet').append(done);}

function renderPlannedFocus(){let host=document.querySelector('#routine-muscle-map');if(!host){host=document.createElement('section');host.id='routine-muscle-map';host.setAttribute('aria-label','Planned training focus');document.querySelector('.equipment-note').before(host);}FitLensMuscleMap.mount(host,FitLensMuscles.aggregate([{items}],{planned:true}),{mode:'Workout preview · planned sets',intro:items.reduce((sum,item)=>sum+item.sets,0)+' planned sets'});}
const muscleOriginalEdit=editExercise;editExercise=function(index){muscleOriginalEdit(index);let host=document.querySelector('#exercise-muscle-map');if(!host){host=document.createElement('section');host.id='exercise-muscle-map';host.className='mm-exercise';document.querySelector('#exercise-form').after(host);}FitLensMuscleMap.mount(host,FitLensMuscles.aggregate([{items:[items[index]]}],{planned:true}),{title:'Muscle groups',mode:'Exercise preview',intro:items[index].name});};

const deleteWorkout=document.createElement('button');deleteWorkout.type='button';deleteWorkout.id='delete-workout';deleteWorkout.className='option-row';deleteWorkout.style.color='#97513c';deleteWorkout.textContent='Delete workout';deleteWorkout.onclick=()=>{if(confirm('Delete this saved workout? Your planned sessions and workout history will stay.')){try{M.removeTemplate(storedSession.id);window.FitLensAllowWorkoutLeave();location.href='workouts.html';}catch(e){tell(e.message);$('#options-sheet').close();}}};$('#options-sheet').append(deleteWorkout);
function syncDeleteWorkout(){const button=document.getElementById('delete-workout');if(button)button.hidden=Boolean(planned||!storedSession.id||storedSession.starter);}
syncDeleteWorkout();

function workoutFingerprint(){return JSON.stringify({name:$('#workout-name').value,minutes:Number($('#workout-minutes').value),items:M.cleanItems(items)});}
let savedWorkoutFingerprint=workoutFingerprint(),allowWorkoutLeave=false;
function rememberWorkoutSave(){savedWorkoutFingerprint=workoutFingerprint();syncSaveWorkout();}
window.FitLensAllowWorkoutLeave=()=>{allowWorkoutLeave=true;};
$('#back-link').addEventListener('click',event=>{if(workoutFingerprint()!==savedWorkoutFingerprint&&!confirm('Leave without saving your workout changes?')){event.preventDefault();return;}allowWorkoutLeave=true;});
window.addEventListener('beforeunload',event=>{if(!allowWorkoutLeave&&workoutFingerprint()!==savedWorkoutFingerprint){event.preventDefault();event.returnValue='';}});

function syncSaveWorkout(){const dirty=workoutFingerprint()!==savedWorkoutFingerprint;save.hidden=storedSession.status==='completed'||Boolean(storedSession.id&&!dirty);}
const renderBeforeSaveState=render;render=function(){renderBeforeSaveState();syncSaveWorkout();};
fields.addEventListener('input',syncSaveWorkout);
syncSaveWorkout();

// A restored or already-open Details page must not save an obsolete occurrence over Plan.
function refreshPlannedSession(){
 if(!planned||JSON.stringify(M.find(planned,draft))===JSON.stringify(storedSession))return;
 if(workoutFingerprint()!==savedWorkoutFingerprint){tell('This session changed elsewhere. Reload it before saving your changes.');return;}
 window.FitLensAllowWorkoutLeave();location.reload();
}
addEventListener('pageshow',refreshPlannedSession);
addEventListener('storage',event=>{if(event.key===M.KEY)refreshPlannedSession();});
