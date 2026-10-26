/* Shared UI fixtures compare cumulative counts at the same time on matching weekdays. */
const dayData=window.FitLensStepsData.days;
const $=s=>document.querySelector(s),format=n=>n.toLocaleString('en-US');
const stage=$('#sun-stage'),sun=window.FitLensSun.mount(stage,dayData[window.FitLensStepsData.today],{countId:'hero-count'});
document.querySelectorAll('button.day-card').forEach(card=>{const day=dayData[Number(card.dataset.date)];if(day)window.FitLensSun.mount(card.querySelector('.mini-orb-wrapper'),day,{compact:true,showData:false});});
function selectDay(date,animate=true){
 const d=dayData[date],delta=d.steps-d.baseline,percent=Math.round(Math.abs(delta)/d.baseline*100);
 document.querySelectorAll('button.day-card').forEach(c=>{const selected=Number(c.dataset.date)===date;c.classList.toggle('active',selected);c.setAttribute('aria-pressed',String(selected));});
 $('#nav-date-label').textContent=`${date===window.FitLensStepsData.today?'Today · ':''}${d.name}, Oct ${date}`;
 $('#hero-period').textContent=date===window.FitLensStepsData.today?'TODAY’S STEPS':`${d.name.toUpperCase()}’S STEPS`;
 $('#hero-badge-text').textContent=delta===0?'At your usual level':`${percent}% ${delta>0?'above':'below'} usual`;
 $('#baseline-label').textContent=`Typical ${d.name} · ${d.referenceTime}`;$('#baseline-count').textContent=format(d.baseline);$('#baseline-difference').textContent=`${delta>=0?'+':'−'}${format(Math.abs(delta))} steps`;
 $('#distance-value').innerHTML=`${d.distance.toFixed(1)}<span>km</span>`;
 $('#duration-value').innerHTML=`${Math.floor(d.minutes/60)}<span>h</span> ${d.minutes%60}<span>m</span>`;
 $('#flow-caption').textContent=date===window.FitLensStepsData.today?'Today':`Oct ${date}`;
 $('#flow-list').innerHTML=d.periods.map(([time,title,steps])=>`<div class="flow-card"><div class="flow-left"><span class="flow-time">${time}</span><div class="flow-title">${title}</div></div><div class="flow-right"><div class="flow-steps">${format(steps)}<span>steps</span></div></div></div>`).join('');
 $('#closing-note').textContent=`Your reference is your own recent ${d.name}s at the same time of day. A quieter day is simply a quieter day.`;
 sun.update(d,{animate});
}
document.querySelectorAll('button.day-card').forEach(c=>c.addEventListener('click',()=>selectDay(Number(c.dataset.date))));
const info=$('#baseline-info'),infoButton=$('.nav-action');
infoButton.addEventListener('click',()=>{info.open=!info.open;if(info.open)info.scrollIntoView({block:'nearest'});});
info.addEventListener('toggle',()=>infoButton.setAttribute('aria-expanded',String(info.open)));
selectDay(window.FitLensStepsData.today,false);
document.fonts.ready.then(()=>sun.open(document.querySelector('.steps-page')));
window.addEventListener('pagehide',()=>sun.cancel());
