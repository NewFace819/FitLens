(()=>{'use strict';window.FitLensStart=function(item,{plannedId=null,returnUrl=null}={}){
 const M=FitLensTraining;if(!item?.items?.length)throw new Error('Add an exercise before starting this workout.');
 let areas=[];try{areas=FitLensProfile.createStore(localStorage,sessionStorage).read().body.areas;}catch{}
 if(item.items.some(i=>M.exercises[i.id]?.regions.some(r=>areas.includes(r))))throw new Error('Some exercises use areas you avoid. Open the workout and replace them before starting.');
 const routine=['upper','lower','full'].includes(item.routine)?item.routine:'full';
 const start=()=>{window.FitLensAllowWorkoutLeave?.();sessionStorage.setItem('fitlens-ui-session-plan',JSON.stringify({routine,items:item.items,sessionName:item.name,sessionId:null,plannedId,workoutId:plannedId?null:item.id,launchId:M.uid('launch'),returnUrl,minutes:item.minutes,coach:item.coach||null}));sessionStorage.removeItem('fitlens-ui-active');location.href='workout-active.html?routine='+routine+(plannedId?'&planned='+encodeURIComponent(plannedId):'');};
 let active,previous;try{active=JSON.parse(sessionStorage.getItem('fitlens-ui-active'));previous=JSON.parse(sessionStorage.getItem('fitlens-ui-session-plan'));}catch{}
 if(active&&previous&&!['completed','stopped'].includes(active.phase)){
  const resume=()=>{window.FitLensAllowWorkoutLeave?.();location.href='workout-active.html?routine='+previous.routine+'&resume=1'+(previous.plannedId?'&planned='+encodeURIComponent(previous.plannedId):'');};
  if(plannedId?previous.plannedId===plannedId:!previous.plannedId&&item.id&&previous.workoutId===item.id){resume();return;}
  document.getElementById('unfinished-session')?.remove();const d=document.createElement('dialog');d.id='unfinished-session';d.className='session-choice';d.setAttribute('aria-labelledby','unfinished-title');d.innerHTML='<h2 id="unfinished-title">A workout is in progress.</h2><p id="unfinished-name"></p><p>Starting another workout discards this unfinished session.</p><button type="button" id="resume-existing">Resume workout</button><button type="button" id="replace-existing">Discard & start new</button><button type="button" id="cancel-start">Keep browsing</button>';d.querySelector('#unfinished-name').textContent=previous.sessionName||'Your current workout';document.body.append(d);d.querySelector('#resume-existing').onclick=resume;d.querySelector('#replace-existing').onclick=()=>{d.close();start();};d.querySelector('#cancel-start').onclick=()=>d.close();d.showModal();return;
 }
 start();
};})();

(()=>{if(document.querySelector('link[data-session-choice]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href='training-launch.css';l.dataset.sessionChoice='';document.head.append(l);})();
