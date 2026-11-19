/* Main Home: existing local models in live mode; frozen fixtures in explicit demo mode. */
(()=>{'use strict';
const $=s=>document.querySelector(s),M=window.FitLensTraining,phone=$('#v2-phone'),scroll=$('#home-scroll'),params=new URLSearchParams(location.search),demo=params.has('demo');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateText=(d,o)=>new Intl.DateTimeFormat('en',{timeZone:'UTC',...o}).format(new Date(d+'T12:00:00Z'));
const short=d=>dateText(d,{month:'short',day:'numeric'}),full=d=>dateText(d,{weekday:'long',month:'long',day:'numeric',year:'numeric'});
const definitions=[...FitLensHomeV2Fixtures.definitions,...FitLensHomeV2StageFixtures];
let demoId=definitions.some(x=>x.id===params.get('demo'))?params.get('demo'):'scheduled-workout',today=demo?FitLensHomeV2Fixtures.today:M.today(),selected=demo?definitions.find(x=>x.id===demoId).initialDate:today,snapshot,expanded=false;
const systemTheme=matchMedia('(prefers-color-scheme:dark)');let theme=['light','dark'].includes(params.get('theme'))?params.get('theme'):'system';
let treatment=params.get('treatment')==='editorial'?'editorial':'spatial';
let showMascot=params.get('mascot')!=='0',showActivity=params.get('activity')!=='0';
const edge=document.createElement('div');edge.className='home-main-scroll-edge';edge.setAttribute('aria-hidden','true');phone.append(edge);
function scrollEdge(){edge.style.opacity=String(Math.max(0,Math.min(1,scroll.scrollTop/64)));}
scroll.addEventListener('scroll',scrollEdge,{passive:true});
const safeSession=key=>{try{return JSON.parse(sessionStorage.getItem(key));}catch{return null;}};
const recordURL=r=>r.source==='fitlens'&&r.trainingId?'workout-review.html?completed='+encodeURIComponent(r.trainingId):'workouts.html?entry='+encodeURIComponent(r.id);
function load(){
 if(demo){const f=definitions.find(x=>x.id===demoId);return {...f,plans:Object.fromEntries(Object.entries(f.plans).map(([d,p])=>[d,[p]])),records:Object.fromEntries(Object.entries(f.records).map(([d,rs])=>[d,rs.map(r=>({...r,href:null}))])),live:f.live?{...f.live,stopped:false}:null};}
 try{
  // Read and migrate through the existing model; never replace user data with a fixture.
  void localStorage.length;
  const state=M.read(),records={},plans={};
  for(const r of FitLensActivities.read())(records[r.date]??=[]).push({...r,minutes:Number.isFinite(r.seconds)?Math.round(r.seconds/60):null,sets:r.trainingId?r.sets:null,outcome:r.outcome==='stopped'?'Stopped early':r.trainingId?'Completed':'Saved',href:recordURL(r)});
  for(const p of state.sessions.filter(x=>x.status==='planned').sort((a,b)=>(a.time||'99:99').localeCompare(b.time||'99:99')))(plans[p.date]??=[]).push({...p,exercises:p.items?.length});
  const active=safeSession('fitlens-ui-active'),payload=safeSession('fitlens-ui-session-plan');
  const sameLaunch=active&&payload&&(!payload.launchId||active.launchId===payload.launchId)&&active.routine===payload.routine&&Array.isArray(payload.items)&&JSON.stringify(active.ids)===JSON.stringify(payload.items.map(i=>i.id));
  const live=sameLaunch&&['working','rest','paused','stopped'].includes(active.phase)?{name:payload.sessionName||'Workout',completedSets:active.logs?.flat().filter(x=>x.done).length??0,totalSets:active.logs?.flat().length??null,minutes:Number.isFinite(active.elapsed)?Math.floor(active.elapsed/60):null,stopped:active.phase==='stopped',href:'workout-active.html?routine='+encodeURIComponent(active.routine)+'&resume=1'+(payload.plannedId?'&planned='+encodeURIComponent(payload.plannedId):'')}:null;
  return {kind:'live',records,plans,live};
 }catch{return {kind:'error',records:{},plans:{},live:null};}
}
const link=(label,href,quiet=false)=>`<a class="${quiet?'v2-text-button':'v2-button'}" href="${esc(href)}"${demo?' data-demo-action="true"':''}>${esc(label)}</a>`;
const logLink=()=>link('Log activity','workouts.html?logActivity=1&logDate='+selected,true);
const actions=html=>'<div class="v2-stage-actions">'+html+'</div>';
const title=s=>'<div class="v2-stage-heading"><h1 id="v2-stage-title">'+esc(s)+'</h1></div>';
function syncURL(){const u=new URL(location.href);if(demo){u.searchParams.set('demo',demoId);if(selected!==definitions.find(x=>x.id===demoId).initialDate)u.searchParams.set('date',selected);else u.searchParams.delete('date');if(treatment==='editorial')u.searchParams.set('treatment',treatment);else u.searchParams.delete('treatment');}if(treatment==='editorial')u.searchParams.set('treatment',treatment);else u.searchParams.delete('treatment');for(const[key,on]of[['mascot',showMascot],['activity',showActivity]]){if(on)u.searchParams.delete(key);else u.searchParams.set(key,'0');}if(theme==='system')u.searchParams.delete('theme');else u.searchParams.set('theme',theme);history.replaceState(history.state,'',u);}
function appearance(){phone.classList.toggle('home-hide-mascot',!showMascot);$('.hybrid-activity').hidden=!showActivity;phone.dataset.treatment=treatment;phone.dataset.theme=theme==='system'?(systemTheme.matches?'dark':'light'):theme;}
function renderWeek(){const first=M.weekStart(selected),current=first===M.weekStart(today),viewport=$('#v2-date-viewport'),left=viewport.scrollLeft;
 $('#v2-week-title').textContent=current?'This week':short(first)+' – '+short(M.addDays(first,6));
 $('#v2-dates').innerHTML=Array.from({length:7},(_,i)=>{const date=M.addDays(first,i),rs=snapshot.records[date]||[],ps=snapshot.plans[date]||[],weekday=dateText(date,{weekday:'short'}),stopped=rs.filter(r=>r.outcome==='Stopped early').length;
 const label=[full(date),date===today?'today':'',date===selected?'selected':'',rs.length-stopped?`${rs.length-stopped} recorded activities`:'',stopped?`${stopped} stopped sessions`:'',ps.length?`${ps.length} planned workouts`:'',['error','unavailable'].includes(snapshot.kind)?'activity data unavailable':''].filter(Boolean).join(', ');
 return `<button type="button" class="v2-day" data-date="${date}" aria-label="${esc(label)}" aria-pressed="${date===selected}"${date===today?' aria-current="date"':''} tabindex="${date===selected?0:-1}"><span class="v2-weekday">${weekday}</span><strong class="v2-day-number">${Number(date.slice(-2))}</strong><span class="v2-day-marks" aria-hidden="true">${rs.length||ps.length?'<span class="hybrid-content-dot"></span>':''}</span></button>`;
 }).join('');viewport.scrollLeft=left;
}
function renderAttention(){const a=$('#v2-attention');let html='';
 if(snapshot.live&&selected!==today)html='<div class="v2-attention-copy"><strong>'+(snapshot.live.stopped?'Session stopped':'Workout in progress')+'</strong><small>'+esc(snapshot.live.name)+'</small></div>'+link(snapshot.live.stopped?'Finish check-in':'Resume',snapshot.live.href||'#',true);
 if(snapshot.safety)html='<div class="v2-attention-copy"><strong>'+esc(snapshot.safety.label)+'</strong><small>Check-in · '+short(snapshot.safety.date)+'</small></div>'+link('Review note','#',true);
 a.hidden=!html;a.innerHTML=html;
}
function recordRows(rs){return '<div class="v2-records">'+rs.map(r=>`<a class="home-record" href="${esc(r.href||'#')}"${demo?' data-demo-action="true"':''}><span><strong>${esc(r.name)}</strong><small>${[Number.isFinite(r.minutes)?r.minutes+' min':null,r.outcome].filter(Boolean).map(esc).join(' · ')}</small></span><span aria-hidden="true">›</span></a>`).join('')+'</div>';}
function activeStage(live,heading,buttons){
 const count=n=>Number.isInteger(n)&&n>=0,metrics=[];
 if(count(live.completedSets)){
  const known=count(live.totalSets)&&live.totalSets>0&&live.totalSets>=live.completedSets;
  metrics.push(`<div><dt>Sets recorded</dt><dd aria-label="${live.completedSets}${known?' of '+live.totalSets:''}"><span class="home-stat-visual" aria-hidden="true"><span class="home-stat-number">${live.completedSets}</span>${known?'<span class="home-stat-unit home-stat-total">/ '+live.totalSets+'</span>':''}</span></dd></div>`);
 }
 if(typeof live.minutes==='number'&&Number.isFinite(live.minutes)&&live.minutes>=0)metrics.push(`<div><dt>Time recorded</dt><dd aria-label="${esc(live.minutes)} minutes"><span class="home-stat-visual" aria-hidden="true"><span class="home-stat-number">${esc(live.minutes)}</span><span class="home-stat-unit">min</span></span></dd></div>`);
 return `<div class="hybrid-stage-surface home-active-stage" data-emphasis="strong" data-session-kind="active"><p class="v2-session-status">Workout in progress.</p>${title(heading)}${metrics.length?'<dl class="home-active-metrics" data-columns="'+metrics.length+'">'+metrics.join('')+'</dl>':''}${actions(buttons)}</div>`;
}
function renderStage(){const ps=snapshot.plans[selected]||[],planned=ps[0],rs=snapshot.records[selected]||[],isToday=selected===today,live=isToday&&snapshot.live;let kind,heading,body='',buttons='';
 $('#v2-selected-date').textContent=isToday?'Today, '+short(selected):dateText(selected,{weekday:'short',month:'short',day:'numeric',...(selected.slice(0,4)!==today.slice(0,4)?{year:'numeric'}:{})});$('#v2-selected-date').setAttribute('aria-label',full(selected));$('#v2-today').hidden=isToday;
 if(['error','unavailable'].includes(snapshot.kind)){kind=snapshot.kind;heading=kind==='error'?'Activity couldn’t be loaded.':'Activity unavailable.';body='<p class="v2-stage-body">'+(kind==='error'?'Try again to view your activity.':'No activity data is available for this day.')+'</p>';buttons=kind==='error'?'<button class="v2-button" data-home-retry type="button">Try again</button>':link('Open workouts','workouts.html');}
 else if(live){kind=live.stopped?'stopped':'active';heading=live.name;buttons=link(live.stopped?'Finish check-in':'Resume workout',live.href||'#');if(live.stopped)body='<p class="v2-session-status">Session stopped.</p><p class="v2-stage-body">Finish your check-in to save this session.</p>';}
 else if(planned&&selected>=today){kind=isToday?'scheduled':'upcoming';heading=planned.name;buttons=isToday?`<button type="button" class="v2-button" data-start-planned="${esc(planned.id||'sample')}">Start workout</button>`:link('View workout','workout-details.html?planned='+encodeURIComponent(planned.id||''));buttons+=link(isToday?'Workout details':'View plan',isToday?'workout-details.html?planned='+encodeURIComponent(planned.id||''):'plan.html?week='+M.weekStart(selected),true);}
 else if(isToday&&rs.length){kind=rs[0].outcome==='Stopped early'?'stopped-record':'completed';heading=rs[0].name;buttons=link('View session',rs[0].href||'#')+logLink();if(kind==='stopped-record')body='<p class="v2-session-status">Stopped early · saved today</p>';}
 else if(rs.length){kind='historical';heading='Recorded activity.';body=recordRows(rs.slice(0,expanded?rs.length:2));if(rs.length>2)body+=`<button class="v2-text-button" type="button" id="home-expand-records" aria-expanded="${expanded}">${expanded?'Show fewer':`View all ${rs.length} activities`}</button>`;buttons=logLink();}
 else if(selected<today){kind='historical-empty';heading='No recorded activity.';if(planned)body='<p class="v2-stage-body">'+esc(planned.name)+' · scheduled for this day.</p>';buttons=logLink()+link('View plan','plan.html?week='+M.weekStart(selected),true);}
 else if(selected>today){kind='upcoming-open';heading='No workout scheduled.';buttons=link('Schedule workout','plan.html?week='+M.weekStart(selected));}
 else{kind=snapshot.kind==='new'?'new':'open';heading=kind==='new'?'No activity yet.':'No workout scheduled.';buttons=link('Choose a workout','workouts.html')+logLink();}
 const view={kind,title:heading};const stage=$('#v2-stage');stage.dataset.state=kind;stage.dataset.date=selected;stage.dataset.composition='refined';
 const adapted={plans:{[selected]:planned},records:snapshot.records,live:snapshot.live};
 const composed=kind==='active'?activeStage(snapshot.live,heading,buttons):FitLensHomeHybridStage.render({view,fixture:adapted,selectedDate:selected,actionsHTML:actions(buttons)});
 let html=composed||`<div class="hybrid-stage-surface" data-emphasis="quiet">${title(heading)}${body}${actions(buttons)}</div>`;
 if(['active','stopped','scheduled','upcoming','completed','stopped-record'].includes(kind)&&rs.length>(['completed','stopped-record'].includes(kind)?1:0))html+='<div class="home-saved-today"><h2>Saved on this day</h2>'+recordRows(rs.slice(['completed','stopped-record'].includes(kind)?1:0))+'</div>';
 if(ps.length>1)html+='<p class="home-extra-plan">'+link(`View all ${ps.length} planned workouts`,'plan.html?week='+M.weekStart(selected),true)+'</p>';
 $('#v2-stage-content').innerHTML=html;
}
function renderBento(){const rs=(snapshot.records[today]||[]).filter(r=>demo?r.type==='Workout':Boolean(r.trainingId)),unknown=['error','unavailable'].includes(snapshot.kind);
 const sum=key=>unknown||rs.some(r=>!Number.isFinite(r[key]))?'—':(key==='minutes'&&!demo?Math.round(rs.reduce((n,r)=>n+r.seconds,0)/60):rs.reduce((n,r)=>n+r[key],0)).toLocaleString('en-US');
 $('#hybrid-workout-minutes').textContent=sum('minutes');$('#hybrid-workout-sets').textContent=sum('sets');
}
function render({announce=false}={}){const top=scroll.scrollTop;appearance();renderWeek();renderAttention();renderStage();renderBento();scroll.scrollTop=top;scrollEdge();inset();if(announce)$('#v2-announcement').textContent=full(selected)+'. '+$('#v2-stage-title').textContent;}
function reveal(){const button=$(`.v2-day[data-date="${selected}"]`),v=$('#v2-date-viewport'),r=button.getBoundingClientRect(),vr=v.getBoundingClientRect();if(r.left<vr.left)v.scrollLeft-=vr.left-r.left;else if(r.right>vr.right)v.scrollLeft+=r.right-vr.right;button.focus({preventScroll:true});}
function choose(date,focus=false){if(!M.validDate(date))return;selected=date;expanded=false;render({announce:true});if(focus)reveal();if(demo)syncURL();}
function inset(){phone.style.setProperty('--v2-content-bottom-inset',Math.ceil(phone.getBoundingClientRect().bottom-$('.v2-bottom').getBoundingClientRect().top+16)+'px');}
$('#v2-dates').addEventListener('click',e=>{const b=e.target.closest('[data-date]');if(b)choose(b.dataset.date,true);});
$('#v2-dates').addEventListener('keydown',e=>{const b=e.target.closest('[data-date]');if(!b)return;const delta={ArrowLeft:-1,ArrowRight:1};let date;if(e.key in delta)date=M.addDays(b.dataset.date,delta[e.key]);else if(e.key==='Home')date=M.weekStart(selected);else if(e.key==='End')date=M.addDays(M.weekStart(selected),6);else return;e.preventDefault();choose(date,true);});
$('#v2-previous-week').onclick=()=>choose(M.addDays(selected,-7));$('#v2-next-week').onclick=()=>choose(M.addDays(selected,7));$('#v2-today').onclick=()=>choose(today);
const glyphs={home:'<path d="m3 10 9-7 9 7v10h-6v-7H9v7H3Z"/>',workouts:'<path d="m8 8 8 8M5 10l5-5m4 14 5-5M3 8l5-5m8 18 5-5"/>',plan:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v5m10-5v5M3 11h18"/>',insights:'<path d="M4 20V12m6 8V8m6 12v-6m5 6V4"/>'};
$('#v2-dock').innerHTML=[['Today','home.html','home'],['Workouts','workouts.html','workouts'],['Plan','plan.html','plan'],['Insights','insights.html','insights']].map(([label,href,key])=>`<a class="v2-tab" href="${href}"${key==='home'?' aria-current="page"':''}${demo?' data-demo-action="true"':''}><svg viewBox="0 0 24 24" aria-hidden="true">${glyphs[key]}</svg><span>${label}</span></a>`).join('');
const notice=document.createElement('dialog');notice.className='home-notice';notice.setAttribute('aria-labelledby','home-notice-title');notice.innerHTML='<h2 id="home-notice-title"></h2><p></p><button type="button" class="v2-button">Close</button>';phone.append(notice);let noticeFocus;
function showNotice(heading,message){noticeFocus=document.activeElement;$('#home-notice-title').textContent=heading;notice.querySelector('p').textContent=message;const r=phone.getBoundingClientRect();notice.style.left=r.left+16+'px';notice.style.top=r.top+Math.min(180,r.height/4)+'px';notice.style.width=r.width-32+'px';notice.showModal();}
notice.querySelector('button').onclick=()=>notice.close();notice.addEventListener('close',()=>noticeFocus?.isConnected&&noticeFocus.focus({preventScroll:true}));
document.addEventListener('click',e=>{const target=e.target.closest('[data-demo-action],[data-start-planned],[data-home-link],[data-home-retry],#home-expand-records');if(!target)return;
 if(target.hasAttribute('data-home-retry')){snapshot=load();render({announce:true});return;}
 if(target.id==='home-expand-records'){expanded=!expanded;render();$('#home-expand-records')?.focus({preventScroll:true});return;}
 if(demo){e.preventDefault();showNotice('Demo only','This action is a preview. No workout, activity or account data will be changed.');return;}
 if(target.dataset.homeLink==='steps'){location.href='steps.html';return;}
 if(target.hasAttribute('data-start-planned')){try{const p=M.find(target.dataset.startPlanned);if(!p||p.status!=='planned'||p.date!==M.today())throw Error('This workout has changed. Review your plan before starting.');FitLensStart(p,{plannedId:p.id,returnUrl:location.href});}catch(error){snapshot=load();render();showNotice('Workout unavailable',error.message);}}
});
$('#home-profile-link').onclick=()=>{if(demo)showNotice('Demo Account','Account editing is available in live mode. This demo does not read or change your profile.');else if(window.FitLensAccountSheet)FitLensAccountSheet.open();else location.href='profile.html?from=home';};
FitLensFace.mount($('#hybrid-mascot'),{expression:'happy',allowMotion:()=>false});
FitLensSun.mount($('#hybrid-steps-sun'),FitLensStepsData.days[FitLensStepsData.today],{compact:true});
$('#hybrid-steps-sun').setAttribute('aria-label','3,150 steps — sample data');
if(demo){phone.dataset.demo='true';const tag=document.createElement('button');tag.type='button';tag.className='home-demo-badge';tag.textContent='Demo · sample data ↓';$('.hybrid-hero').append(tag);
 const panel=document.createElement('aside');panel.className='home-demo-panel home-settings-panel';panel.setAttribute('aria-label','Demo controls');panel.innerHTML='<h2>Home demo</h2><p>Sample data only. Actions do not change saved workouts or your account.</p><label for="home-demo-state">State</label><select id="home-demo-state">'+definitions.map(f=>`<option value="${f.id}">${esc(f.label)}</option>`).join('')+'</select><label for="home-demo-theme">Appearance</label><select id="home-demo-theme"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select><a href="home.html">Return to live Home</a>';
 $('.v2-workbench').append(panel);const treatmentControl=document.createElement('div');treatmentControl.innerHTML='<label for="home-demo-treatment">Context Stage</label><select id="home-demo-treatment"><option value="spatial">Spatial</option><option value="editorial">Editorial</option></select>';panel.insertBefore(treatmentControl,panel.querySelector('a'));$('#home-demo-treatment').value=treatment;$('#home-demo-treatment').onchange=e=>{treatment=e.target.value;appearance();syncURL();};tag.onclick=()=>{panel.scrollIntoView({block:'center'});$('#home-demo-state').focus({preventScroll:true});};$('#home-demo-state').value=demoId;$('#home-demo-theme').value=theme;
 $('#home-demo-state').onchange=e=>{demoId=e.target.value;selected=definitions.find(f=>f.id===demoId).initialDate;expanded=false;snapshot=load();render();scroll.scrollTop=0;syncURL();};$('#home-demo-theme').onchange=e=>{theme=e.target.value;appearance();syncURL();};
 if(M.validDate(params.get('date')))selected=params.get('date');syncURL();
}else{const script=document.createElement('script');script.src='account-sheet.js?v=2';script.onerror=()=>{$('#home-profile-link').onclick=()=>{location.href='profile.html?from=home';};};document.head.append(script);}
// Workbench controls are outside the app frame in both live and demo mode.
if(!demo){
 const panel=document.createElement('aside');panel.className='home-settings-panel';panel.setAttribute('aria-label','Home settings');
 panel.innerHTML='<h2>Home settings</h2><p>Adjust the view without changing your saved activity.</p><label for="home-settings-state">Data & state</label><select id="home-settings-state"><option value="live">Live · saved data</option>'+definitions.map(f=>`<option value="${f.id}">${esc(f.label)}</option>`).join('')+'</select><label for="home-settings-theme">Appearance</label><select id="home-settings-theme"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select><label for="home-settings-treatment">Context Stage</label><select id="home-settings-treatment"><option value="spatial">Spatial</option><option value="editorial">Editorial</option></select>';
 $('.v2-workbench').append(panel);$('#home-settings-theme').value=theme;$('#home-settings-treatment').value=treatment;
 $('#home-settings-state').onchange=e=>{const u=new URL(location.href);u.hash='';u.searchParams.delete('date');if(e.target.value==='live')u.searchParams.delete('demo');else u.searchParams.set('demo',e.target.value);location.href=u.href;};
 $('#home-settings-theme').onchange=e=>{theme=e.target.value;appearance();syncURL();};$('#home-settings-treatment').onchange=e=>{treatment=e.target.value;appearance();syncURL();};
}
const workbenchPanel=$('.home-settings-panel'),visibilityControls=document.createElement('div');
visibilityControls.innerHTML='<label class="home-setting-check"><input type="checkbox" id="home-settings-mascot">Show mascot</label><label class="home-setting-check"><input type="checkbox" id="home-settings-activity">Show activity bento</label><p class="home-settings-note">View settings stay in this page’s link. Sample states do not change saved data.</p>';
workbenchPanel.append(visibilityControls);$('#home-settings-mascot').checked=showMascot;$('#home-settings-activity').checked=showActivity;
$('#home-settings-mascot').onchange=e=>{showMascot=e.target.checked;appearance();syncURL();};$('#home-settings-activity').onchange=e=>{showActivity=e.target.checked;appearance();syncURL();};
function refresh(){if(demo)return;const previousToday=today;today=M.today();if(selected===previousToday)selected=today;snapshot=load();render();}
systemTheme.addEventListener('change',appearance);for(const name of ['pageshow','storage','fitlens:training-changed','fitlens:activity-changed'])addEventListener(name,refresh);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});addEventListener('resize',inset);
snapshot=load();render();const observer=new ResizeObserver(inset);observer.observe(phone);observer.observe($('.v2-bottom'));
})();
