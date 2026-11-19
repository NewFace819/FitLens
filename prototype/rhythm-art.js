(function(root){'use strict';
const shapes=['M-25-10C-22-27 4-28 20-16C34-5 24 20 8 25C-13 32-33 12-25-10Z','M-24-13C-14-30 13-28 25-9C33 8 14 28-4 26C-25 25-34 4-24-13Z','M-24-8C-24-25-3-32 16-21C35-10 29 15 11 24C-8 34-29 15-24-8Z'];
function symbol(kind='workout'){
 const paths={workout:'<path d="M-10-7 7 10M-15-4-4-15M4 15 15 4M-17-9-9-17M9 17 17 9"/>',walk:'<path d="M-15 3-9-11-2-8-3-1 5 5 14 8Q18 9 17 15H-15Z"/><path d="M-14 9H3M-4-4 0-7M0 0 4-3"/>',rest:'<path d="M-13 11C-21-6-3-15 14-14 18 4 7 18-7 14M-13 16 6-5"/>'};
 return `<g class="pebble-symbol" data-kind="${kind}" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">${paths[kind]||paths.workout}</g>`;
}
function pebble(done,i=0,small=false,kind='workout'){return `<svg viewBox="-36 -36 72 72" aria-hidden="true"><path class="pebble-shape ${done?'filled':''}" d="${shapes[i%3]}"/>${done?symbol(kind):'<circle class="pebble-core" cx="0" cy="0" r="3"/>'}</svg>`;}
function trail(w,clickable=true){const target=w?.target||3,done=Math.min(w?.sessions.length||0,target);return `<div class="rh-trail" style="--slots:${target}"><svg class="rh-thread" viewBox="0 0 300 80" preserveAspectRatio="none" aria-hidden="true"><path d="M22 43C70 13 119 73 165 43S247 17 280 42"/></svg>${Array.from({length:target},(_,i)=>{
 const session=w?.sessions[i],label=i<done?(session.kind==='walk'?'Walk':'Workout'):'Session '+(i+1);
 return `<${clickable?'button':'span'} ${clickable?'type="button"':''} class="rh-stone ${i<done?'is-done':''}" ${clickable?`data-session-index="${i}" aria-label="${i<done?'View '+esc(session.name):'Session '+(i+1)+' not completed'}"`:''}>${pebble(i<done,i,false,session?.kind)}<span class="rh-stone-kind">${label}</span><span class="rh-stone-date">${i<done?shortDate(session.date):'Not done'}</span></${clickable?'button':'span'}>`;
 }).join('')}</div>`;}
function shortDate(s){return new Intl.DateTimeFormat('en',{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(s+'T12:00:00Z'));}
function range(w){return shortDate(w)+' – '+shortDate(FitLensRhythm.shift(w,6));}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
root.FitLensRhythmArt={pebble,symbol,trail,shortDate,range,esc};
})(window);
