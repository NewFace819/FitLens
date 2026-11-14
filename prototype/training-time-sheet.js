/* Compact time editor; the same setTimes model used by the full-page study. */
(()=>{'use strict';
window.FitLensTimeSheet=function(ids,{draft=false,onSaved}={}){
 const M=FitLensTraining,sessions=[...new Set(ids)].map(id=>draft==='mixed'?(M.find(id)||M.find(id,true)):M.find(id,draft)).filter(s=>s?.status==='planned');if(!sessions.length)return;
 const opener=document.activeElement,host=document.querySelector('.fl-phone')||document.body,sheet=document.createElement('dialog'),batch=sessions.length>1;
 document.getElementById('time-sheet')?.remove();sheet.id='time-sheet';sheet.className='schedule-sheet time-sheet';sheet.setAttribute('aria-labelledby','time-sheet-title');
 sheet.innerHTML='<div class="sheet-grip"></div><header class="schedule-header"><div><span class="schedule-kicker" id="time-sheet-day"></span><h2 id="time-sheet-title"></h2></div><button class="schedule-close" type="button" aria-label="Close time editor">×</button></header><form class="time-sheet-form"><div class="time-sheet-body"><div class="window-scene" aria-hidden="true">'+"<svg viewBox=\"0 0 342 214\" class=\"scene\">\n          <defs>\n            <linearGradient id=\"sheet-sky\" x2=\"0\" y2=\"1\"><stop class=\"sky-top\"/><stop offset=\"1\" class=\"sky-bottom\"/></linearGradient>\n            <clipPath id=\"sheet-window-clip\"><path d=\"M72 169V92a99 80 0 0 1 198 0v77Z\"/></clipPath>\n            <mask id=\"sheet-moon-mask\" maskUnits=\"userSpaceOnUse\" x=\"198\" y=\"36\" width=\"40\" height=\"40\"><circle cx=\"218\" cy=\"56\" r=\"19\" fill=\"white\"/><circle cx=\"226\" cy=\"49\" r=\"17\" fill=\"black\"/></mask>\n          </defs>\n          <path class=\"light-patch\" d=\"m69 166 204 0 52 48H18Z\"/>\n          <path d=\"M64 173V92a107 88 0 0 1 214 0v81Z\" fill=\"#e3dccc\"/>\n          <g clip-path=\"url(#sheet-window-clip)\">\n            <path d=\"M72 169V92a99 80 0 0 1 198 0v77Z\" fill=\"url(#sheet-sky)\"/>\n            <g class=\"stars\" fill=\"#fff5d7\"><circle cx=\"110\" cy=\"48\" r=\"1.6\"/><circle cx=\"219\" cy=\"23\" r=\"1.5\"/><circle cx=\"242\" cy=\"81\" r=\"1.4\"/><path d=\"m150 29 1.2 4 4 1.2-4 1.2-1.2 4-1.2-4-4-1.2 4-1.2Z\"/></g>\n            <circle class=\"sun\" cx=\"218\" cy=\"83\" r=\"23\" fill=\"#f9dc9a\"/>\n            <g class=\"moon\"><circle cx=\"218\" cy=\"56\" r=\"19\" fill=\"#f6efd2\" mask=\"url(#sheet-moon-mask)\"/></g>\n            <path class=\"cloud\" d=\"M83 91h34m-23-5h36m72 27h41m-30-6h43\" fill=\"none\" stroke=\"#fff7e6\" stroke-width=\"5\" stroke-linecap=\"round\" opacity=\".45\"/>\n            <path class=\"hill-back\" d=\"M54 152q55-61 111-15t124-16v63H54Z\"/>\n            <path class=\"hill-front\" d=\"M58 163q85-45 144-3t87-15v40H58Z\"/>\n            <path d=\"M171-21v191M70 98h202\" fill=\"none\" stroke=\"#f2eddf\" stroke-width=\"7\"/>\n          </g>\n          <path d=\"M59 171h224v10H59Z\" fill=\"#c4bba5\"/><path d=\"M55 169h232v7H55Z\" fill=\"#eee7d7\"/>\n          <g class=\"plant\"><path d=\"M90 169v-37\" stroke=\"#57765b\" stroke-width=\"3\" fill=\"none\"/><path d=\"M90 148q-24-3-19-20 20 0 19 20m0-9q1-23 19-22 6 17-19 22\" fill=\"#7b956c\"/><path d=\"m76 151 29 0-5 23H81Z\" fill=\"#c8896c\"/></g>\n          \n        </svg>"+'</div><div class="time-sheet-editor"><label for="sheet-exact-time" class="time-tap"><output id="sheet-time" aria-hidden="true">--:--</output><span aria-hidden="true">✎</span><input id="sheet-exact-time" type="time" aria-label="Workout time"></label><p class="time-sheet-hint">Tap to type, or slide to choose.</p></div><input id="sheet-time-slider" type="range" min="0" max="1435" step="5" aria-label="Choose workout time"><div class="time-sheet-landmarks"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:55</span></div><details class="time-sheet-reminder"><summary>Reminder preview <span id="sheet-reminder-label">Off</span></summary><div class="reminder-pills" role="group" aria-label="Reminder preview timing"><button type="button" data-reminder="off">Off</button><button type="button" data-reminder="0">At start</button><button type="button" data-reminder="15">15 min</button><button type="button" data-reminder="30">30 min</button></div><p class="schedule-demo-note">Preview only · No notifications sent.</p></details><p class="schedule-error" role="alert"></p></div><footer class="time-sheet-footer"><button type="button" class="time-sheet-remove">Remove time</button><button class="time-sheet-save" type="submit">Save time</button></footer></form>';
 host.append(sheet);const $=s=>sheet.querySelector(s),input=$('#sheet-exact-time'),slider=$('#sheet-time-slider');
 let time=sessions[0].time||null,preview=sessions[0].time||'18:30',reminder=sessions[0].reminder?.enabled?String(sessions[0].reminder.before||0):'off',changeReminder=!batch,saving=false;
 $('#time-sheet-title').textContent=batch?sessions.length+' workouts':sessions[0].name;
 $('#time-sheet-day').textContent=batch?'YOUR SELECTED DAYS':new Intl.DateTimeFormat('en',{weekday:'long',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(sessions[0].date+'T12:00:00Z'));
 $('#sheet-reminder-label').textContent=batch?'Keep existing':'Off';
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
  sheet.style.setProperty(key,`rgb(${rgb.join(',')})`);
 });
 const daylight=clamp((hour-5.5)/1)*clamp((19-hour)/1.5),sunPhase=clamp((hour-6)/12.5);
 const sun=$('.sun');sun.style.transform=`translate(${95+150*sunPhase-218}px,${147-112*Math.sin(Math.PI*sunPhase)-83}px)`;sun.style.opacity=daylight;
 const moonPhase=clamp((hour>=18?hour-18:hour+6)/12),moon=$('.moon');
 moon.style.transform=`translate(${100+145*moonPhase-218}px,${130-85*Math.sin(Math.PI*moonPhase)-56}px)`;moon.style.opacity=1-daylight;
 $('.stars').style.opacity=(1-daylight)*.9;$('.cloud').style.opacity=.12+.33*daylight;
 $('.light-patch').style.opacity=.1+.16*daylight;
}

 const toMinutes=t=>Number(t.slice(0,2))*60+Number(t.slice(3));
 function render(){input.value=time||'';$('#sheet-time').textContent=time||'--:--';slider.value=toMinutes(preview);slider.setAttribute('aria-valuetext',time||'No time selected');paintSky(toMinutes(preview)/60);$('.time-sheet-remove').hidden=!sessions.some(s=>s.time);$('.time-sheet-save').textContent=batch?'Save times':'Save time';$('#sheet-reminder-label').textContent=batch&&!changeReminder?'Keep existing':!time?'Off':reminder==='off'?'Off':reminder==='0'?'At start':reminder+' min before';sheet.querySelectorAll('[data-reminder]').forEach(b=>{b.setAttribute('aria-pressed',String((!time?'off':reminder)===b.dataset.reminder));b.disabled=!time&&b.dataset.reminder!=='off';});}
 slider.oninput=()=>{const n=Number(slider.value);preview=time=String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');render();};
 input.oninput=()=>{if(!input.value){time=null;reminder='off';render();}else if(M.validTime(input.value)){preview=time=input.value;render();}};
 sheet.querySelectorAll('[data-reminder]').forEach(b=>b.onclick=()=>{reminder=b.dataset.reminder;changeReminder=true;render();});
 function place(){const r=host.getBoundingClientRect(),v=window.visualViewport,available=v?v.height:innerHeight;sheet.style.width=Math.min(440,r.width-24)+'px';sheet.style.left=r.left+(r.width-Math.min(440,r.width-24))/2+'px';sheet.style.bottom=Math.max(0,innerHeight-((v?.offsetTop||0)+available),innerHeight-r.bottom)+12+'px';sheet.style.height=Math.min(600,r.height*.7,available-24)+'px';sheet.style.maxHeight=available-24+'px';}
 function save(clear=false){if(saving)return;try{saving=true;M.setTimes(sessions.map(s=>s.id),clear?null:time,{draft,changeReminder:clear||changeReminder,enabled:!clear&&Boolean(time)&&reminder!=='off',before:reminder==='off'?0:Number(reminder)});sheet.close();onSaved?.();}catch(e){saving=false;$('.schedule-error').textContent=e.message;}}
 $('.time-sheet-form').onsubmit=e=>{e.preventDefault();save();};$('.time-sheet-remove').onclick=()=>save(true);$('.schedule-close').onclick=()=>sheet.close();
 sheet.addEventListener('click',e=>{if(e.target===sheet){const r=sheet.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)sheet.close();}});
 sheet.addEventListener('close',()=>{removeEventListener('resize',place);window.visualViewport?.removeEventListener('resize',place);opener?.focus({preventScroll:true});sheet.remove();});addEventListener('resize',place);window.visualViewport?.addEventListener('resize',place);render();place();sheet.showModal();
};
})();
