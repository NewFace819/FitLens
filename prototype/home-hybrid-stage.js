/* Pure renderer for the isolated hybrid visual trial. No model or action dispatch. */
(()=>{'use strict';const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const positive=n=>typeof n==='number'&&Number.isFinite(n)&&n>0,count=n=>typeof n==='number'&&Number.isInteger(n)&&n>=0;
const title=s=>`<div class="v2-stage-heading"><h1 id="v2-stage-title">${esc(s)}</h1></div>`;
const facts=items=>items.length?`<dl class="v2-session-facts">${items.map(([label,value,unit])=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}${unit?`<span>${esc(unit)}</span>`:''}</dd></div>`).join('')}</dl>`:'';
function render({view,fixture,selectedDate,actionsHTML}){let body='',emphasis='quiet';
 if(view.kind==='scheduled'||view.kind==='upcoming') {const p=fixture.plans[selectedDate];if(!p)return null;emphasis='strong';let when='Scheduled';if(/^([01]\d|2[0-3]):[0-5]\d$/.test(p.time||'')){const[h,m]=p.time.split(':').map(Number);when+=` · ${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`;}const meta=[positive(p.minutes)?`${p.minutes} min`:null,positive(p.exercises)?`${p.exercises} exercises`:null].filter(Boolean);body=`<p class="v2-session-status">${esc(when)}</p>${title(view.title)}${meta.length?`<p class="v2-session-details">${meta.map(esc).join(' · ')}</p>`:''}${actionsHTML}`;}
 else if(view.kind==='active'){emphasis='strong';const live=fixture.live||{},items=[];if(count(live.completedSets))items.push(['Sets recorded',count(live.totalSets)&&live.totalSets>0&&live.totalSets>=live.completedSets?`${live.completedSets} of ${live.totalSets}`:live.completedSets]);if(positive(live.minutes))items.push(['Time recorded',live.minutes,'min']);body=`<p class="v2-session-status">Workout in progress.</p>${title(view.title)}${actionsHTML}${facts(items)}`;}
 else if(view.kind==='completed'){const r=fixture.records[selectedDate]?.[0]||{},items=[];if(positive(r.minutes))items.push(['Duration',r.minutes,'min']);if(count(r.sets)&&r.sets>0)items.push(['Sets recorded',r.sets]);body=`<p class="v2-session-status">Saved today.</p>${title(view.title)}${facts(items)}${actionsHTML}`;}
 else return null;
 return `<div class="hybrid-stage-surface" data-emphasis="${emphasis}" data-session-kind="${view.kind}">${body}</div>`;
}
window.FitLensHomeHybridStage=Object.freeze({render});})();
