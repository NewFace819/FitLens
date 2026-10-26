(() => {
'use strict';
const card=document.querySelector('.fl-session-card');if(!card)return;
const heading=document.querySelector('#fl-workout-title'),action=card.querySelector('.fl-session-action>span:first-child'),title=card.querySelector('h3');
card.href='setup-plan.html?v=reminders-8';action.textContent='Build my week';heading.textContent='Your first week';
function refresh(){let plan;try{plan=FitLensPlan.restore(JSON.parse(sessionStorage.getItem('fitlens:weekly-plan')));}catch{}if(!plan)return;
const next=plan.days.map((s,i)=>s?{...s,day:i}:null).find(Boolean);if(!next)return;
heading.textContent='Your next session';title.textContent=next.title;card.href='setup-plan.html?view=week&v=reminders-8';action.textContent='View your week';
let meta=card.querySelector('.home-plan-meta');if(!meta){meta=document.createElement('p');meta.className='home-plan-meta';title.after(meta);}meta.textContent=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][next.day]+' · '+(next.timing?next.timing.time+' · ':'')+next.duration+' min';
card.classList.add('has-weekly-plan');card.querySelector('.fl-session-art img').src=next.kind==='muscle'?'assets/illustrations/dumbbells.svg':next.kind==='strength'?'assets/illustrations/kettlebell.svg':'assets/svg/walking-medicine.svg';}
refresh();window.addEventListener('pageshow',refresh);
})();
