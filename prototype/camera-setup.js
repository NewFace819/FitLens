/* UI-only states. No media devices, video capture, pose detection, or recording. */
const phone=document.querySelector('.camera-phone');
const statuses={ready:{title:'Ready',description:'Full body and weights in view.',path:'m6 12 4 4 8-8'},adjust:{title:'Step back',description:'Bring your feet into view.',path:'M12 7v6m0 4h.01'}};
function previewState(state){phone.dataset.state=state;const s=statuses[state];document.querySelector('#status-title').textContent=s.title;document.querySelector('#status-description').textContent=s.description;document.querySelector('.status-icon path').setAttribute('d',s.path);document.querySelectorAll('[data-preview-state]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.previewState===state)))}
document.querySelectorAll('[data-preview-state]').forEach(b=>b.addEventListener('click',()=>previewState(b.dataset.previewState)));
document.querySelector('.camera-flip').addEventListener('click',e=>{const mirrored=document.querySelector('.camera-scene').classList.toggle('mirrored');e.currentTarget.setAttribute('aria-pressed',String(mirrored))});
const routine=new URLSearchParams(location.search).get('routine');if(['upper','lower','full'].includes(routine))document.querySelector('#back-link').href='workout-details.html?routine='+routine;

document.querySelector('#return-workout').href=document.querySelector('#back-link').href;

// Return to the optional camera entry point in the local session study.
const cameraParams=new URLSearchParams(location.search);
if(cameraParams.get('from')==='active'){
 const key=['upper','lower','full'].includes(routine)?routine:'upper';
 const back='workout-active.html?routine='+key+'&resume=1';
 document.querySelector('#back-link').href=back;
 document.querySelector('#return-workout').href=back;
 document.querySelector('.exercise-heading h1').textContent=cameraParams.get('name')||'Exercise';
 document.querySelector('.exercise-heading p').firstChild.textContent=({upper:'UPPER BODY',lower:'LOWER BODY',full:'FULL BODY'})[key]+' ';
 document.querySelector('.exercise-heading p span').textContent='SET '+(cameraParams.get('set')||'1')+' / '+(cameraParams.get('sets')||'3');
 const values=document.querySelectorAll('.set-summary strong');
 values[0].replaceChildren(document.createTextNode((cameraParams.get('weight')||'0')+' '),Object.assign(document.createElement('small'),{textContent:cameraParams.get('unit')||'kg'}));
 values[1].replaceChildren(document.createTextNode((cameraParams.get('reps')||'—')+' '),Object.assign(document.createElement('small'),{textContent:'reps'}));
}
