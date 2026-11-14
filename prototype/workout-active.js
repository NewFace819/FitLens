'use strict';
// Local UI prototype. All default numbers and history below are illustrative.
const $=s=>document.querySelector(s),phone=$('.session-phone');
const params=new URLSearchParams(location.search);
const routineKey=['upper','lower','full'].includes(params.get('routine'))?params.get('routine'):'upper';
const C=FitLensCoach,U=FitLensCoachUI;
const names={upper:'Upper Body',lower:'Lower Body',full:'Full Body'};
const catalog={
 bench:{name:'Bench Press',title:['BENCH','PRESS'],art:'bench',sets:3,reps:'8–12',rest:90,weight:20,last:[12,10,10],equipment:'Barbell · Chest',weightNote:'Total bar weight, including the bar.'},
 pull:{name:'Lat Pulldown',title:['LAT','PULLDOWN'],art:'pull',sets:3,reps:'10–12',rest:90,weight:25,last:[12,11,10],equipment:'Cable · Back',weightNote:'Weight shown on the machine stack.'},
 row:{name:'Seated Row',title:['SEATED','ROW'],art:'row',sets:3,reps:'10–12',rest:90,weight:25,last:[12,12,10],equipment:'Cable · Back',weightNote:'Weight shown on the machine stack.'},
 press:{name:'Shoulder Press',title:['SHOULDER','PRESS'],art:'press',sets:3,reps:'8–12',rest:90,weight:7.5,last:[12,10,8],equipment:'Dumbbells · Shoulders',weightNote:'Dumbbell weight is per hand.'},
 raise:{name:'Lateral Raise',title:['LATERAL','RAISE'],art:'raise',sets:3,reps:'12–15',rest:60,weight:5,last:[12,12,10],equipment:'Dumbbells · Shoulders',weightNote:'Dumbbell weight is per hand.'},
 cable:{name:'Triceps Pushdown',title:['TRICEPS','PUSHDOWN'],art:'cable',sets:3,reps:'10–15',rest:60,weight:15,last:[15,12,12],equipment:'Cable · Triceps',weightNote:'Weight shown on the machine stack.'},
 squat:{name:'Goblet Squat',title:['GOBLET','SQUAT'],art:'press',sets:3,reps:'8–12',rest:90,weight:12,last:[12,10,10],equipment:'Kettlebell · Legs',weightNote:'Weight of the single kettlebell.'},
 rdl:{name:'Romanian Deadlift',title:['ROMANIAN','DEADLIFT'],art:'bench',sets:3,reps:'8–12',rest:90,weight:20,last:[12,10,10],equipment:'Barbell · Legs',weightNote:'Total bar weight, including the bar.'},
 legpress:{name:'Leg Press',title:['LEG','PRESS'],art:'row',sets:3,reps:'10–12',rest:90,weight:40,last:[12,12,10],equipment:'Machine · Legs',weightNote:'Log the machine load consistently.'},
 curl:{name:'Leg Curl',title:['LEG','CURL'],art:'row',sets:3,reps:'10–15',rest:60,weight:15,last:[15,12,12],equipment:'Machine · Hamstrings',weightNote:'Weight shown on the machine stack. Illustration placeholder.'},
 calf:{name:'Calf Raise',title:['CALF','RAISE'],art:'raise',sets:3,reps:'12–15',rest:60,weight:5,last:[15,15,12],equipment:'Dumbbells · Calves',weightNote:'Dumbbell weight is per hand. Illustration placeholder.'},
 biceps:{name:'Biceps Curl',title:['BICEPS','CURL'],art:'press',sets:3,reps:'10–12',rest:60,weight:5,last:[12,10,10],equipment:'Dumbbells · Biceps',weightNote:'Dumbbell weight is per hand. Illustration placeholder.'}
};
Object.assign(catalog,window.FitLensTraining?.exercises||{});
const exerciseIllustrations={squat:'gobletsquat',raise:'lateralraise',pull:'latpulldown',legpress:'legpress',rdl:'romaniandeadlift',row:'seatedrow',press:'shoulderpress',cable:'tricepspushdown'};
function exerciseImage(item){return exerciseIllustrations[item.id]?`assets/workout_illustrations/${exerciseIllustrations[item.id]}.svg`:item.art==='bodyweight'?'assets/illustrations/full.svg':`assets/icons/exercise-${item.art}.svg`;}
const defaults={upper:['bench','pull','row','press','raise','cable'],lower:['squat','rdl','legpress','curl','calf'],full:['squat','bench','rdl','pull','press','row','raise']};
let customSessionName=null,customSessionId=null;
let plan=defaults[routineKey].map(id=>({...catalog[id],id}));
try{const draft=JSON.parse(sessionStorage.getItem('fitlens-ui-session-plan'));if(draft?.routine===routineKey&&Array.isArray(draft.items)&&draft.items.length)plan=draft.items.filter(i=>catalog[i.id]).map(i=>({...catalog[i.id],...i}));}catch{}
try{const draft=JSON.parse(sessionStorage.getItem('fitlens-ui-session-plan'));if(draft?.routine===routineKey&&draft.sessionId===params.get('session')){customSessionName=typeof draft.sessionName==='string'?draft.sessionName:null;customSessionId=draft.sessionId;}}catch{}
if(!plan.length)plan=defaults[routineKey].map(id=>({...catalog[id],id}));
let rhythmSessionId='workout-'+Date.now();
let pausedFrom='working';
let logs=plan.map(ex=>Array.from({length:ex.sets},()=>({weight:ex.needs?.length===0?0:null,reps:null,done:false}))),index=0,phase='working',remaining=0,elapsed=0;
try{const state=JSON.parse(sessionStorage.getItem('fitlens-ui-active'));if(state?.routine===routineKey&&JSON.stringify(state.ids)===JSON.stringify(plan.map(i=>i.id))&&(()=>{try{const payload=JSON.parse(sessionStorage.getItem('fitlens-ui-session-plan'));return !payload?.launchId||payload.launchId===state.launchId;}catch{return false;}})()){rhythmSessionId=state.rhythmSessionId||rhythmSessionId;logs=state.logs;index=state.index;elapsed=state.elapsed;phase=['working','rest','paused','stopped','completed'].includes(state.phase)?state.phase:'working';remaining=state.remaining||0;pausedFrom=state.pausedFrom==='rest'?'rest':'working';}}catch{}
const requested=plan.findIndex(i=>i.id===params.get('exercise'));if(requested>=0)index=requested;
function save(){try{sessionStorage.setItem('fitlens-ui-active',JSON.stringify({routine:routineKey,ids:plan.map(i=>i.id),logs,index,elapsed,phase,remaining,rhythmSessionId,pausedFrom,launchId:JSON.parse(sessionStorage.getItem('fitlens-ui-session-plan')||'{}').launchId||null}));}catch{}}
function commitRhythm(){if(phase==='completed'){const h=FitLensTraining.read().history.find(h=>h.id===rhythmSessionId||h.id===params.get('planned'));const url=h?'workout-review.html?completed='+encodeURIComponent(h.id):'workouts.html';$('#finish-session').href=$('#pain-review').href=url;return h?.id;}const stopped=phase==='stopped';if(!stopped&&totalDone()===0){phase='completed';save();$('#finish-session').href='workouts.html';return;}const h=FitLensTraining.complete({sessionId:params.get('planned'),name:customSessionName||names[routineKey],items:plan,seconds:elapsed,logs,id:rhythmSessionId,outcome:stopped?'stopped':'completed'});sessionStorage.setItem('fitlens:last-completed-id',h.id);phase='completed';save();const url='workout-review.html?routine='+routineKey+'&completed='+encodeURIComponent(h.id);$('#finish-session').href=url;$('#pain-review').href=url;return h.id;}
$('#finish-session').addEventListener('click',commitRhythm);
$('#pain-review').addEventListener('click',commitRhythm);
function say(message){$('#session-announcement').textContent=message;}
function time(s){return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');}
function currentRow(){return logs[index].findIndex(s=>!s.done);}
function totalDone(){return logs.flat().filter(s=>s.done).length;}
function placeSheet(dialog){const r=phone.getBoundingClientRect();Object.assign(dialog.style,{left:r.left+'px',width:r.width+'px',bottom:Math.max(0,innerHeight-r.bottom)+'px'});}
function openSheet(dialog){placeSheet(dialog);dialog.showModal();}
window.addEventListener('resize',()=>document.querySelectorAll('dialog[open]').forEach(placeSheet));
document.querySelectorAll('.close-dialog').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
$('#routine-name').textContent=customSessionName||names[routineKey];
let launchPayload={};try{launchPayload=JSON.parse(sessionStorage.getItem('fitlens-ui-session-plan'))||{};}catch{}
$('#back-routine').href=params.has('planned')?'workout-details.html?planned='+encodeURIComponent(params.get('planned')):launchPayload.workoutId?'workout-details.html?workout='+encodeURIComponent(launchPayload.workoutId):customSessionId?'workout-details.html?session='+encodeURIComponent(customSessionId)+'&v=reminders-8':'workout-details.html?routine='+routineKey;
if(launchPayload.returnUrl){try{const back=new URL(launchPayload.returnUrl,location.href);if(back.origin===location.origin&&back.pathname.endsWith('/workout-details.html'))$('#back-routine').href=back.pathname+back.search;}catch{}}
for(const id of ['finish-session','pain-review'])$('#'+id).href='workout-review.html?routine='+routineKey;
function makeInput(field,row,n){const input=document.createElement('input');input.type='number';input.inputMode=field==='weight'?'decimal':'numeric';input.min=field==='weight'?'0':'1';input.max=field==='weight'?'1000':'999';input.step=field==='weight'?'any':'1';input.value=row[field]??'';input.disabled=row.done||['paused','stopped','completed'].includes(phase);const prior=C.history(plan[index].id,{limit:1})[0]?.sets[n];input.placeholder=prior?String(prior[field]):'—';input.setAttribute('aria-label',`${field==='weight'?'Weight in kilograms':'Repetitions'} for set ${n+1}`);input.addEventListener('input',()=>{row[field]=input.value===''?null:Number(input.value);input.setCustomValidity('');save();});return input;}
function updateCameraLink(){const ex=plan[index],n=currentRow(),row=logs[index][Math.max(0,n)];const p=new URLSearchParams({routine:routineKey,from:'active',exercise:ex.id,name:ex.name,set:String(Math.max(0,n)+1),sets:String(logs[index].length),planned:params.get('planned')||'',weight:String(row.weight??ex.weight),reps:ex.reps,unit:ex.equipment.includes('Dumbbells')?'kg / hand':'kg'});$('#check-form').href='camera-setup.html?'+p;}
function render(){const ex=plan[index],n=currentRow();phone.dataset.phase=phase;$('#elapsed').textContent=time(elapsed);
 $('#exercise-position').textContent=`${String(index+1).padStart(2,'0')} / ${String(plan.length).padStart(2,'0')}`;
 const h=$('#exercise-title');h.replaceChildren(document.createTextNode(ex.title[0]),document.createElement('br'),document.createTextNode(ex.title[1]),Object.assign(document.createElement('span'),{textContent:'.'}));
 h.dataset.long=String(ex.title.some(t=>t.length>7));
 $('#exercise-art').src=exerciseImage(ex);$('#exercise-art').classList.toggle('supplied-art',!!exerciseIllustrations[ex.id]);$('#exercise-equipment').textContent=ex.equipment;
 $('#set-target').textContent=`${logs[index].length} × ${ex.reps} reps`;$('#weight-note').textContent=ex.weightNote;$('#rest-duration').textContent=`Rest ${ex.rest} sec`;
 const progress=$('#exercise-progress');progress.replaceChildren();plan.forEach((_,i)=>{const tick=document.createElement('span');tick.className=i===index?'current':logs[i].every(s=>s.done)?'passed':'';progress.append(tick);});
 const rows=$('#set-rows');rows.replaceChildren();logs[index].forEach((row,i)=>{const line=document.createElement('div');line.className='set-row'+(row.done?' done':i===n?' current':'');const number=document.createElement('span');number.className='set-number';number.textContent=String(i+1).padStart(2,'0');if(i===n)number.setAttribute('aria-label',`Current set ${i+1}`);const previous=document.createElement('button');previous.type='button';previous.className='previous-value';const last=C.history(ex.id,{limit:1})[0],prior=last?.sets[i];previous.disabled=!prior||row.done||['stopped','paused','completed'].includes(phase);previous.innerHTML=prior?`${prior.weight} kg × ${prior.reps}<span>Use last time</span>`:'—';previous.setAttribute('aria-label',prior?`Use last session: ${prior.weight} kilograms and ${prior.reps} reps for set ${i+1}`:'No recorded values for this set');previous.onclick=()=>{if(!prior)return;row.weight=prior.weight;row.reps=prior.reps;render();save();say('Previous values filled. Complete the set when you have done it.');};const weight=makeInput('weight',row,i),reps=makeInput('reps',row,i);const check=document.createElement('button');check.type='button';check.className='set-check';check.setAttribute('aria-label',row.done?`Undo completed set ${i+1}`:`Complete set ${i+1}`);check.innerHTML=row.done?'<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>':i===n?'•':'·';check.disabled=['stopped','paused','completed'].includes(phase);check.addEventListener('click',()=>{if(row.done){row.done=false;phase='working';remaining=0;render();save();}else complete(i);});line.append(number,previous,weight,reps,check);rows.append(line);});
 $('#footer-progress').textContent=`${totalDone()} ${totalDone()===1?'set':'sets'} complete`;
 $('#current-set-label').textContent=n<0?'EXERCISE COMPLETE':`SET ${String(n+1).padStart(2,'0')} / ${String(logs[index].length).padStart(2,'0')}`;
 $('#working-actions').hidden=phase==='rest';$('#rest-panel').hidden=phase!=='rest';
 $('#complete-set').disabled=['paused','stopped','completed'].includes(phase);
 $('#complete-set>span').textContent=phase==='stopped'?'Session stopped':phase==='paused'?'Session paused':n<0?(index===plan.length-1?'Finish Workout':'Next Exercise'):`Complete Set ${n+1}`;
 $('#action-note').textContent=phase==='paused'?'Resume from the menu.':phase==='stopped'?'Session stopped.':C.history(ex.id,{limit:1}).length?'Tap last time to fill. Complete when done.':'Enter what you complete.';
 $('#next-exercise').textContent=plan[index+1]?.name||'Your post-workout check-in';$('#next-count').textContent=plan[index+1]?`${String(index+2).padStart(2,'0')} / ${String(plan.length).padStart(2,'0')}`:'';
 $('#pause-session').firstChild.textContent=phase==='paused'?'Resume session ':'Pause session ';$('#pause-session').disabled=['stopped','completed'].includes(phase);$('#skip-exercise').disabled=['stopped','completed'].includes(phase);$('#add-set').disabled=['paused','stopped','completed'].includes(phase);updateCameraLink();
 if(phase==='rest')renderRest();updateCoachControls();
}
function renderRest(){const ex=plan[index],n=currentRow();$('#rest-clock').textContent=time(remaining);$('#rest-title').innerHTML=remaining?'Rest easy<span>.</span>':'Ready when<br>you are<span>.</span>';$('#rest-eyebrow').textContent=remaining?'TAKE A BREATHER':'YOUR NEXT SET';$('#skip-rest').innerHTML=remaining?'Skip rest ':'Back to sets ';$('#next-set-note').textContent=`Next: Set ${n+1} · ${logs[index][n]?.weight??ex.weight} kg${ex.equipment.includes('Dumbbells')?' / hand':''} · ${ex.reps} reps`;}
function complete(n){if(['stopped','paused','completed'].includes(phase))return;const line=$('#set-rows').children[n],inputs=[...line.querySelectorAll('input')];let valid=true;inputs.forEach(input=>{if(input.value===''||!input.checkValidity()){input.setCustomValidity(input.value===''?'Enter what you completed.':'Check this value.');if(valid){input.reportValidity();input.focus();}valid=false;}});if(!valid)return;logs[index][n].done=true;remaining=plan[index].rest;phase=currentRow()>=0&&remaining>0?'rest':'working';render();save();showMilestone();say(`Set ${n+1} complete.${phase==='rest'?' Rest timer started.':''}`);}
$('#complete-set').addEventListener('click',()=>{const n=currentRow();if(n>=0)complete(n);else if(index<plan.length-1){index++;phase='working';render();save();$('.session-scroll').scrollTop=0;}else {const id=commitRhythm();location.href=id?'workout-review.html?routine='+routineKey+'&completed='+encodeURIComponent(id):'workouts.html';}});
$('#add-set').addEventListener('click',()=>{if(['paused','stopped','completed'].includes(phase))return;logs[index].push({weight:plan[index].needs?.length===0?0:null,reps:null,done:false});render();save();say('Set added.');});
$('#skip-rest').addEventListener('click',()=>{phase='working';remaining=0;render();save();});
$('#add-rest').addEventListener('click',()=>{remaining+=15;renderRest();save();});
$('#check-form').addEventListener('click',e=>{if(phase==='stopped'){e.preventDefault();return;}updateCameraLink();save();});
$('#open-guide').addEventListener('click',()=>{const ex=plan[index];$('#guide-name').textContent=ex.name;$('#guide-art').src=exerciseImage(ex);$('.sheet-footnote').textContent=exerciseIllustrations[ex.id]?'Detailed movement guide to follow.':'Illustration placeholder · detailed movement guide to follow.';$('#guide-copy').textContent=`${ex.equipment}. Your plan: ${logs[index].length} sets of ${ex.reps} reps. Rest ${ex.rest} seconds between sets.`;openSheet($('#guide-dialog'));});
$('#open-lineup').addEventListener('click',()=>{const list=$('#lineup-list');list.replaceChildren();plan.forEach((ex,i)=>{const b=document.createElement('button');b.type='button';b.className='lineup-row'+(i===index?' selected':'');b.innerHTML='<span></span><strong></strong><span></span>';b.children[0].textContent=String(i+1).padStart(2,'0');b.children[1].textContent=ex.name;b.children[2].textContent=`${logs[i].filter(s=>s.done).length}/${logs[i].length}`;b.disabled=phase==='stopped';b.addEventListener('click',()=>{if(index!==i){index=i;if(phase==='paused')pausedFrom='working';else phase='working';remaining=0;}$('#lineup-dialog').close();render();save();$('.session-scroll').scrollTop=0;});list.append(b);});openSheet($('#lineup-dialog'));});
$('#session-menu').addEventListener('click',()=>openSheet($('#menu-dialog')));
$('#pause-session').addEventListener('click',()=>{if(phase==='paused')phase=pausedFrom;else{pausedFrom=phase;phase='paused';}$('#menu-dialog').close();render();save();});
$('#skip-exercise').addEventListener('click',()=>{if(index<plan.length-1)index++;if(phase==='paused')pausedFrom='working';else phase='working';remaining=0;$('#menu-dialog').close();render();save();$('.session-scroll').scrollTop=0;});
$('#report-pain').addEventListener('click',()=>{phase='stopped';remaining=0;render();save();openSheet($('#pain-dialog'));});
const coachTools=document.createElement('div');coachTools.className='coach-inline-tools';coachTools.innerHTML='<button type="button" id="pin-live" aria-pressed="false">☆ Pin as focus</button><button type="button" id="history-live">Last 3 sessions</button>';$('.exercise-poster').after(coachTools);
const liveWhy=document.createElement('div');liveWhy.className='coach-why';liveWhy.hidden=true;coachTools.after(liveWhy);
const milestone=document.createElement('div');milestone.className='coach-milestone';milestone.hidden=true;milestone.setAttribute('role','status');liveWhy.after(milestone);let milestoneExercise=null;
$('#pin-live').onclick=()=>{const id=plan[index].id;C.pin(C.pinned()===id?null:id);updateCoachControls();};$('#history-live').onclick=()=>U.showHistory(plan[index].id);
function updateCoachControls(){const id=plan[index].id,pinned=C.pinned()===id;$('#pin-live').setAttribute('aria-pressed',String(pinned));$('#pin-live').textContent=pinned?'★ Your focus':'☆ Pin as focus';const why=C.why({items:plan,minutes:launchPayload.minutes,coach:launchPayload.coach});liveWhy.hidden=!why;liveWhy.innerHTML=why?'<span aria-hidden="true">↳</span><p>'+U.esc(why)+'</p>':'';const progress=pinned?C.progress(id,logs[index]):null;if(!progress)milestone.hidden=true;else if(!milestone.hidden&&milestoneExercise===id){milestone.innerHTML='<strong>A little step for your focus.</strong>'+U.esc(progress.text);}if(!pinned||milestoneExercise!==id)milestone.hidden=true;}
function showMilestone(){const id=plan[index].id;if(C.pinned()!==id)return;const p=C.progress(id,logs[index]);if(!p)return;milestoneExercise=id;milestone.innerHTML='<strong>A little step for your focus.</strong>'+U.esc(p.text);milestone.hidden=false;}
addEventListener('fitlens:focus-changed',updateCoachControls);
setInterval(()=>{if(phase==='working'||phase==='rest'){elapsed++;$('#elapsed').textContent=time(elapsed);if(phase==='rest'&&remaining>0){remaining--;renderRest();if(remaining===0)say('Rest finished. Start your next set when you are ready.');}save();}},1000);
render();
save();

if(phase==='stopped')openSheet($('#pain-dialog'));
