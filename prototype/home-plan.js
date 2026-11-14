(() => {
'use strict';
const card=document.querySelector('.fl-session-card');if(!card)return;
const heading=document.querySelector('#fl-workout-title'),action=card.querySelector('.fl-session-action>span:first-child'),title=card.querySelector('h3'),originalTitle=title.innerHTML,originalArt=card.querySelector('.fl-session-art img').src;
card.href='setup-plan.html?v=reminders-8';action.textContent='Build my week';heading.textContent='Your first week';
function refresh(){const next=FitLensTraining.next();
heading.textContent=next?'Your next session':'Your first week';if(next)title.textContent=next.name;else title.innerHTML=originalTitle;card.href=next?'plan.html?week='+FitLensTraining.weekStart(next.date):'setup-plan.html?v=reminders-8';action.textContent=next?'View your week':'Build my week';
let meta=card.querySelector('.home-plan-meta');if(next&&!meta){meta=document.createElement('p');meta.className='home-plan-meta';title.after(meta);}if(meta){meta.hidden=!next;meta.textContent=next?new Intl.DateTimeFormat('en',{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(next.date+'T12:00:00Z'))+' · '+(next.time?next.time+' · ':'')+next.minutes+' min':'';}
card.classList.toggle('has-weekly-plan',Boolean(next));card.querySelector('.fl-session-art img').src=!next?originalArt:next.routine==='upper'?'assets/illustrations/kettlebell.svg':next.routine==='lower'?'assets/illustrations/dumbbells.svg':'assets/svg/walking-medicine.svg';}
refresh();window.addEventListener('pageshow',refresh);window.addEventListener('storage',refresh);window.addEventListener('fitlens:training-changed',refresh);
})();
