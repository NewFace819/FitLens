(function(){'use strict';
window.mountFoodDiscovery=function(MEALS,openMeal,esc){
const $=s=>document.querySelector(s),dialog=$('#food-dialog'),F=FitLensFood,params=new URLSearchParams(location.search),preview=['workout','walk','ordinary'].includes(params.get('preview')),mode=params.get('preview');
let storage;try{storage=localStorage;}catch{storage={getItem(){throw Error();},setItem(){throw Error();}};}
const store=F.createStore(storage,preview),today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};

const META=FitLensCatalog.meals;
const meals=Object.entries(MEALS).filter(([key,m])=>key===m.id).map(([,m])=>m);

const allergens={egg:'Egg',soy:'Soy',wheat:'Wheat',fish:'Fish',shellfish:'Shellfish',peanut:'Peanut',milk:'Milk',tree_nut:'Tree nuts',sesame:'Sesame'};

let occasion=preview?'Lunch':new Date().getHours()<10?'Breakfast':new Date().getHours()<15?'Lunch':'Dinner',query='',filters={time:0,budget:'any',vegetarian:false,saved:false,type:'any',occasion:'any'},index=0,opener=null;

let foodReturn=null;
try{const saved=JSON.parse(sessionStorage.getItem('fitlens:chat-context:'+params.get('chatReturn')));if(saved?.source==='food'&&saved.view){foodReturn=saved;if(['Breakfast','Lunch','Dinner','Snack'].includes(saved.view.occasion))occasion=saved.view.occasion;query=typeof saved.view.query==='string'?saved.view.query:'';if(saved.view.filters)filters={...filters,...saved.view.filters};if(preview&&saved.context?.choices)store.preferences({...store.get().preferences,...saved.context.choices});}}catch{}
function connectFoodChat(link,id){if(!link)return;link.addEventListener('click',event=>{
 const m=id?MEALS[id]:null,p=prefs(),token='food-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
 const snapshot={source:'food',returnUrl:'food.html'+location.search,view:{occasion,query,filters,scrollTop:$('#food-scroll').scrollTop,slideIndex:index,recipeProgress:m?{id:m.id,ingredients:[...document.querySelectorAll('.ingredient-row input')].map((node,i)=>node.checked?i:-1).filter(i=>i>=0),steps:[...document.querySelectorAll('.step-toggle[aria-pressed="true"]')].map(node=>node.dataset.step)}:null},context:{type:m?'meal':'food',title:m?m.short:'Ideas for '+occasion.toLowerCase(),image:m?.image||null,occasion,choices:{diet:p.diet,allergens:[...p.allergens],time:p.time,budget:p.budget,reviewed:p.reviewed},recipe:m?{id:m.id,ingredients:[...m.ingredients],minutes:m.minutes,condition:m.cookCondition,tools:[...m.tools]}:null}};
 try{sessionStorage.setItem('fitlens:chat-context:'+token,JSON.stringify(snapshot));link.href='chat.html?context='+encodeURIComponent(token);}catch{event.preventDefault();$('#food-announcement').textContent='Couldn’t attach this food context. Please try again.';}
 });}
const mealHref=id=>{const u=new URL(location.href);u.searchParams.set('meal',id);return u.pathname+u.search;};
const prefs=()=>store.get().preferences;
const context=()=>preview?(mode==='ordinary'?null:{kind:mode,name:mode==='workout'?'Upper body workout':'A 25-minute walk'}):((window.FitLensRhythm?.read()?.sessions||[]).filter(e=>e.date===today()).at(-1)||null);

function notify(saved,text){$('#food-announcement').textContent=saved?text:text+' — kept for this visit only.';$('#food-storage-note').hidden=saved;const status=$('#storage-message');if(status){status.hidden=saved;status.textContent='Kept for this visit. Your browser could not save the changes.';}}
function sheet(title,html){if(!dialog.open)opener=document.activeElement;$('#food-dialog-title').textContent=title;$('#food-dialog-content').innerHTML=html;const r=$('.food-phone').getBoundingClientRect();Object.assign(dialog.style,{left:r.left+'px',width:r.width+'px',bottom:Math.max(0,innerHeight-r.bottom)+'px'});if(!dialog.open)dialog.showModal();dialog.scrollTop=0;}
function close(){dialog.close();if(opener?.isConnected)opener.focus({preventScroll:true});}
$('#food-dialog-close').onclick=close;dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});

function preferencesSheet(){const p=prefs();sheet('Your food preferences.',`<p class="sheet-intro">A few choices help us find meals that fit your day.</p><form id="food-preferences"><label class="field-label">Eating style<select name="diet"><option value="any">No preference</option><option value="vegetarian">Vegetarian</option><option value="plant">Plant-based</option></select></label><fieldset class="avoid-options"><legend>Ingredients to avoid</legend><p>Choose any ingredients you need to leave out.</p>${Object.entries(allergens).map(([key,label])=>`<label><input type="checkbox" name="allergen" value="${key}" ${p.allergens.includes(key)?'checked':''}>${label}</label>`).join('')}</fieldset><div class="field-pair"><label class="field-label">Prep time<select name="time"><option value="0">Any</option><option value="10">Up to 10 min</option><option value="15">Up to 15 min</option><option value="20">Up to 20 min</option><option value="30">Up to 30 min</option><option value="45">Up to 45 min</option></select></label><label class="field-label">Budget per person<select name="budget"><option value="any">Any</option><option value="simple">Under ₫30,000</option><option value="regular">₫30,000–50,000</option><option value="special">Over ₫50,000</option></select></label></div><p class="sheet-footnote">Ingredient labels follow the recipe shown. When you exclude ingredients, restaurant dishes with unconfirmed ingredients are hidden. Prices are estimates per person.</p><button class="food-primary" type="submit">Use these choices </button></form>`);const form=$('#food-preferences');for(const key of ['diet','time','budget'])form.elements[key].value=String(p[key]);form.onsubmit=e=>{e.preventDefault();const data=new FormData(form),saved=store.preferences({diet:data.get('diet'),allergens:data.getAll('allergen'),goal:p.goal,time:Number(data.get('time')),budget:data.get('budget'),reviewed:true});close();renderSuggestions();renderList();renderPreferenceLine();notify(saved,'Food preferences updated');};}

function renderPreferenceLine(){const p=prefs();$('#food-preference-line').innerHTML=p.reviewed?`<span>${p.diet==='plant'?'Plant-based':p.diet==='vegetarian'?'Vegetarian':'Your food choices'}${p.allergens.length?' · '+p.allergens.length+' ingredients excluded':''}</span><button type="button" id="edit-food-choices">Edit</button>`:`<span>Make these ideas your own.</span><button type="button" id="edit-food-choices">Food preferences</button>`;$('#edit-food-choices').onclick=preferencesSheet;}

function reason(m){
  const p=prefs();
  if(p.time&&m.minutes&&m.minutes<=p.time)return `Fits your ${p.time}-minute preparation window.`;
  if(p.diet==='plant'||p.diet==='vegetarian')return p.diet==='plant'?'Made with plant-based ingredients.':'A meat-free option for your next meal.';

  if(p.budget==='simple'&&m.budget==='simple')return `An everyday option at ${m.cost||'under ₫30,000'} per person.`;
  return m.note||m.subtitle||'A familiar meal for your day.';
}

function suggestions(){
  const p=prefs();
  return F.rank(meals,p,context(),store.day(today()),occasion)
    .filter(m=>(!p.time||(m.minutes>0&&m.minutes<=p.time))&&(p.budget==='any'||m.budget===p.budget))
    .slice(0,5);
}

function position(){const rail=$('#meal-rail'),slides=[...rail.children];if(!slides.length)return;index=slides.reduce((best,s,i)=>Math.abs(s.offsetLeft-rail.scrollLeft-rail.offsetLeft)<Math.abs(slides[best].offsetLeft-rail.scrollLeft-rail.offsetLeft)?i:best,0);$('#rail-position').textContent=`${String(index+1).padStart(2,'0')} / ${String(slides.length).padStart(2,'0')}`;}

function move(delta){const rail=$('#meal-rail'),slides=[...rail.children],next=Math.max(0,Math.min(slides.length-1,index+delta));if(slides[next])rail.scrollTo({left:slides[next].offsetLeft-slides[0].offsetLeft,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});}

function renderSuggestions(){
  const c=context(),p=prefs(),items=suggestions();
  $('#food-context').innerHTML=c?`<span class="context-mark" aria-hidden="true">${c.kind==='walk'?'↝':'✓'}</span><div><strong>${esc(c.name)}</strong><span>Completed today${c.kind==='walk'?' · a little time outdoors':''}</span></div>`:`<span class="context-mark" aria-hidden="true">☼</span><div><strong>A meal for the day ahead.</strong><span>Choose what works for you.</span></div>`;
  $('#suggestion-caption').textContent=p.reviewed?'Chosen around your food preferences.':'Familiar meals, simple ingredients and everyday budgets.';
  $('#meal-rail').innerHTML=items.length?items.map((m,i)=>`<article class="meal-slide"><a class="suggestion-photo" href="${esc(mealHref(m.id))}" data-discover-meal="${m.id}" aria-label="See the recipe for ${esc(m.title)}"><img src="${m.image}" alt="${esc(m.alt)}" style="object-position:${m.position}" ${i?'loading="lazy"':'fetchpriority="high"'}><span class="suggestion-number" aria-hidden="true">${String(i+1).padStart(2,'0')}</span></a><div class="suggestion-copy"><p class="suggestion-meta">${m.time} <span>·</span> ${({simple:'Budget-friendly',regular:'Standard',special:'A little extra'})[m.budget]}</p><h2 lang="vi"><a href="${esc(mealHref(m.id))}" data-discover-meal="${m.id}">${esc(m.short)}</a></h2><p class="suggestion-reason">${reason(m)}</p><a href="${esc(mealHref(m.id))}" class="suggestion-link" data-discover-meal="${m.id}">See the recipe </a></div></article>`).join(''):`<div class="suggestion-empty"><h2>No meals match these choices yet.</h2><p>Try a little more preparation time or another budget. Your ingredient exclusions stay in place.</p><button type="button" id="adjust-suggestions">Review my choices</button></div>`;
  $('#rail-controls').hidden=items.length<2;
  $('#meal-rail').scrollLeft=0;
  index=0;
  $('#adjust-suggestions')?.addEventListener('click',preferencesSheet);
  position();
}

function filterSheet(){
  sheet('Find your kind of meal.',`<form id="food-filter-form"><label class="field-label">Prep time<select name="time"><option value="0">Any time</option><option value="10">Up to 10 min</option><option value="15">Up to 15 min</option><option value="20">Up to 20 min</option><option value="30">Up to 30 min</option><option value="45">Up to 45 min</option></select></label><label class="field-label">Budget per person<select name="budget"><option value="any">Any budget</option><option value="simple">Under ₫30,000</option><option value="regular">₫30,000–50,000</option><option value="special">Over ₫50,000</option></select></label><label class="field-label">Preparation<select name="type"><option value="any">Any</option><option value="home">Prepare at home</option><option value="out">Eat out</option><option value="ready">Ready to eat</option></select></label><label class="field-label">Meal<select name="occasion"><option value="any">Any meal</option><option value="Breakfast">Breakfast</option><option value="Lunch">Lunch or dinner</option><option value="Snack">Snack</option></select></label><label class="filter-check"><input name="vegetarian" type="checkbox" ${filters.vegetarian?'checked':''}> Vegetarian recipes</label><label class="filter-check"><input name="saved" type="checkbox" ${filters.saved?'checked':''}> Saved recipes</label><p class="sheet-footnote">Times depend on the preparation notes in each recipe. Restaurant dishes with unconfirmed ingredients are hidden when you exclude ingredients.</p><button class="food-primary" type="submit">Show recipes </button><button type="button" class="sheet-text-button" id="reset-food-filters">Clear filters</button></form>`);
  const form=$('#food-filter-form');
  form.elements.time.value=String(filters.time);form.elements.type.value=filters.type||'any';form.elements.occasion.value=filters.occasion||'any';
  form.elements.budget.value=filters.budget;
  form.onsubmit=e=>{
    e.preventDefault();
    const f=new FormData(form);
    filters={time:Number(f.get('time')),budget:f.get('budget'),vegetarian:f.has('vegetarian'),saved:f.has('saved'),type:f.get('type'),occasion:f.get('occasion')};
    close();
    renderList();
  };
  $('#reset-food-filters').onclick=()=>{
    filters={time:0,budget:'any',vegetarian:false,saved:false,type:'any',occasion:'any'};
    close();
    renderList();
  };
}

function why(){const p=prefs(),c=context(),bua={Breakfast:'breakfast',Lunch:'lunch',Dinner:'dinner',Snack:'snacks'}[occasion];sheet('Why these meals?',`<div class="why-meals"><p>These are ideas for <strong>${bua}</strong>. Breakfast and snacks have their own choices. Lunch and dinner draw from main meals, with a different starting order.</p><dl><dt>Your food choices</dt><dd>${p.reviewed?(p.diet==='plant'?'Plant-based':p.diet==='vegetarian'?'Vegetarian':'No eating-style restrictions'):'No preferences added yet. These are general ideas.'}${p.allergens.length?' · Excluding '+p.allergens.map(a=>allergens[a]).join(', ')+'. Restaurant dishes with unconfirmed ingredients are hidden.':''}</dd><dt>Time and budget</dt><dd>${p.time?'Up to '+p.time+' minutes with the preparation noted in the recipe':'No preparation-time limit'} · ${({any:'flexible budget',simple:'under ₫30,000',regular:'₫30,000–50,000',special:'over ₫50,000'})[p.budget]} per person, estimated.</dd><dt>A little variety</dt><dd>Meals you log today move further down the suggestions. Combining more preferences may leave fewer choices.</dd>${c?`<dt>Your activity today</dt><dd>${esc(c.name)}. This is a note of your day. Suggestions are currently ordered by meal and the preferences above.</dd>`:''}</dl><button class="food-primary" id="why-edit">Change my food choices </button></div>`);$('#why-edit').onclick=()=>{close();preferencesSheet();};}

function renderList(){
  const p=prefs(),items=meals.filter(m=>F.eligible(m,p)&&F.matches(m,query,filters)&&(!filters.saved||store.get().saved.includes(m.id))),n=Number(!!filters.time)+Number(filters.budget!=='any')+Number(filters.vegetarian)+Number(!!filters.saved)+Number(!!filters.type&&filters.type!=='any')+Number(!!filters.occasion&&filters.occasion!=='any');
  $('#food-filter-button').textContent='Filters'+(n?' · '+n:'');
  $('#recipe-results-count').textContent=`${items.length} ${items.length===1?'recipe':'recipes'}${query?' found':''}`;
  $('#active-food-filters').innerHTML=[filters.time?`Up to ${filters.time} min`:null,({simple:'Budget-friendly',regular:'Standard',special:'A little extra'})[filters.budget]||null,filters.vegetarian?'Vegetarian':null,filters.saved?'Saved':null,({home:'Prepare at home',out:'Eat out',ready:'Ready to eat'})[filters.type]||null,({Breakfast:'Breakfast',Lunch:'Main meals',Snack:'Snack'})[filters.occasion]||null].filter(Boolean).map(t=>`<span>${t}</span>`).join('')+(n?'<button type="button" id="clear-food-filters">Clear</button>':'');
  $('#clear-food-filters')?.addEventListener('click',()=>{filters={time:0,budget:'any',vegetarian:false,saved:false,type:'any',occasion:'any'};renderList();});
  $('#recipe-results').innerHTML=items.length?items.map(m=>`<article class="directory-row"><a class="directory-photo" href="${esc(mealHref(m.id))}" data-discover-meal="${m.id}" aria-label="See the recipe for ${esc(m.title)}"><img src="${m.image}" alt="${esc(m.alt)}" loading="lazy" style="object-position:${m.position}"></a><div><p>${m.time} · ${m.serves||'1 serving'} · ${m.cost||''}</p><h3 lang="vi"><a href="${esc(mealHref(m.id))}" data-discover-meal="${m.id}">${esc(m.short)}</a></h3><span>${m.plant?'Plant-based':m.vegetarian?'Vegetarian':'Meat or fish'}</span></div></article>`).join(''):`<div class="directory-empty"><h3>No recipes match yet.</h3><p>Try another ingredient or fewer filters. Ingredient exclusions stay in place; restaurant dishes with unconfirmed ingredients may be hidden.</p><button id="reset-food-search" type="button">Clear search & filters</button><button type="button" id="empty-food-preferences">Review food preferences</button></div>`;
  $('#reset-food-search')?.addEventListener('click',()=>{query='';$('#food-search').value='';filters={time:0,budget:'any',vegetarian:false,saved:false,type:'any',occasion:'any'};renderList();});
  $('#empty-food-preferences')?.addEventListener('click',preferencesSheet);
}

const mealLabels={Breakfast:'Breakfast',Lunch:'Lunch',Dinner:'Dinner',Snack:'Snack'};
const referenceAmounts={"b-01": "1 egg sandwich", "b-02": "1 bowl of oats", "b-03": "1 bowl of porridge", "b-04": "1 sandwich", "b-05": "1 bowl of pho", "b-06": "1 bowl of noodles", "b-07": "1 sweet potato, 2 eggs and tomatoes", "b-08": "1 plate of stir-fried noodles", "m-14": "1 bowl of rice noodles", "m-15": "1 serving of fish soup and rice", "m-18": "1 rice bowl", "m-19": "1 plate of pasta and a side salad", "m-20": "1 serving of fish, potatoes and vegetables", "m-21": "1 bowl of noodles", "m-22": "1 serving of grilled pork and noodles", "m-24": "1 bowl of noodles", "s-27": "2 rolls", "s-28": "1 bowl of yogurt and fruit", "s-29": "1 sweet potato or corn on the cob", "s-30": "2 eggs and cucumber"};
let removedLog=null,diaryNotice='';
const entryName=e=>MEALS[e.meal]?.short||e.name||'Logged meal';
const validLogs=()=>store.day(today()).filter(e=>MEALS[e.meal]||e.meal==='custom'&&e.name);
const logOccasion=()=>{const h=new Date().getHours();return h<5?'Snack':h<11?'Breakfast':h<16?'Lunch':h<22?'Dinner':'Snack';};
const portionLabel=e=>e.meal==='custom'?(e.amount||'Amount not noted'):e.portion===null?'Portion not noted':(e.portion===0.5?'½':e.portion===1.5?'1½':'1')+(e.portion===1.5?' servings':' serving');
function renderToday(){
 const list=validLogs();
 $('#today-food-summary').innerHTML=`<div><p class="eyebrow">TODAY’S MEALS</p><h2>${list.length?list.length+' '+(list.length===1?'meal logged.':'meals logged.'):'What did you eat?'}</h2><p>${list.length?'Look back at your meals, or add something you just ate.':'Log what you ate to help us suggest something different next time. Portions can wait.'}</p></div><button type="button" id="view-food-log">${list.length?'View today’s meals':'Log a meal'} </button>`;
 $('#view-food-log').onclick=()=>list.length?logSheet():pickLogMeal();
 const top=$('#open-food-diary');if(top){top.innerHTML=`Log meal <span aria-hidden="true">${list.length?list.length:'+'}</span>`;top.setAttribute('aria-label',list.length?'Today’s meals, '+list.length+' meals logged':'Log a meal today');top.onclick=()=>validLogs().length?logSheet():pickLogMeal();}
}
function logSheet(){
 const list=validLogs();
 sheet('Today’s meals.',`<p class="diary-date">${esc(new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'}))}</p><button class="food-primary diary-add" id="diary-add">Log a meal <span>+</span></button>${diaryNotice?`<p class="diary-notice" role="status">${esc(diaryNotice)}</p>`:''}${removedLog?`<div class="diary-undo"><span>Removed ${esc(entryName(removedLog))}.</span><button id="undo-food-log">Undo</button></div>`:''}${list.length?Object.keys(mealLabels).map(group=>{const entries=list.filter(e=>e.occasion===group);return entries.length?`<section class="diary-group"><h3>${mealLabels[group]}<span>${entries.length} ${entries.length===1?'dish':'dishes'}</span></h3>${entries.map(e=>`<div class="diary-row"><button class="diary-edit" data-edit-log="${esc(e.key)}" aria-label="Edit ${esc(entryName(e))}"><strong>${esc(entryName(e))}</strong><span>${esc(portionLabel(e))}</span></button><button class="diary-remove" data-remove-log="${esc(e.key)}" aria-label="Remove ${esc(entryName(e))}">Remove</button></div>`).join('')}</section>`:'';}).join(''):'<div class="diary-empty"><span aria-hidden="true">—</span><h3>Nothing logged yet.</h3><p>Choose a recipe or write the name of what you ate.</p></div>'}`);
 $('#diary-add').onclick=()=>pickLogMeal();
 $('#undo-food-log')?.addEventListener('click',()=>{const e=removedLog;if(!e)return;const saved=store.log(today(),e.meal,e.occasion,e.portion,e.key,{name:e.name,amount:e.amount});removedLog=null;diaryNotice='Meal restored.';refresh();notify(saved,diaryNotice);logSheet();});
 dialog.querySelectorAll('[data-edit-log]').forEach(b=>b.onclick=()=>{const e=list.find(e=>e.key===b.dataset.editLog);e.meal==='custom'?customMealSheet(e):portionSheet(e.meal,e);});
 dialog.querySelectorAll('[data-remove-log]').forEach(b=>b.onclick=()=>{removedLog={...list.find(e=>e.key===b.dataset.removeLog)};diaryNotice='';const saved=store.remove(today(),b.dataset.removeLog);refresh();notify(saved,'Meal removed from today');logSheet();});
}
function pickLogMeal(initial=''){
 sheet('What did you eat?',`<p class="sheet-intro">Log what you ate to help us suggest something different next time.</p><button class="diary-back" id="picker-back">Today’s meals</button><label class="diary-search"><span class="sr-only">Find a dish to log</span><input type="search" id="log-meal-search" placeholder="e.g. cơm gà, bánh mì…" maxlength="80" autocomplete="off" value="${esc(initial)}"></label><div id="log-pick-results"></div>`);
 $('#picker-back').onclick=logSheet;
 function results(){const text=$('#log-meal-search').value.trim(),recent=store.recent(today(),5).filter(e=>MEALS[e.meal]||e.name),matching=text?meals.filter(m=>F.matches(m,text,{budget:'any'})):meals.filter(m=>F.forOccasion(m,logOccasion())).slice(0,5);
 $('#log-pick-results').innerHTML=`<button class="custom-meal-choice" id="new-custom-meal"><span aria-hidden="true">+</span><div><strong>${text?'Log “'+esc(text)+'”':'Write another dish'}</strong><small>${text?'Use the name you just entered':'It does not need to be in our recipes'}</small></div></button>${!text&&recent.length?`<h3 class="log-pick-heading">Recently logged</h3>${recent.map((e,i)=>`<button class="log-pick-row recent-pick" data-recent-log="${i}"><span class="recent-log-symbol" aria-hidden="true">↶</span><span><strong>${esc(entryName(e))}</strong><small>${esc(portionLabel(e))}</small></span><i aria-hidden="true">+</i></button>`).join('')}`:''}<h3 class="log-pick-heading">${text?matching.length+' recipes found':'From our recipes'}</h3>${matching.length?matching.map(m=>`<button class="log-pick-row" data-pick-log="${m.id}"><img src="${m.image}" alt="" loading="lazy"><span><strong>${esc(m.short)}</strong><small>${esc(referenceAmounts[m.id]||'1 serving of rice and sides')}</small></span><i aria-hidden="true">+</i></button>`).join(''):'<p class="log-no-match">This dish is not in our recipes yet. You can still log its name above.</p>'}`;
 $('#new-custom-meal').onclick=()=>customMealSheet(null,text);
 dialog.querySelectorAll('[data-pick-log]').forEach(b=>b.onclick=()=>portionSheet(b.dataset.pickLog));
 dialog.querySelectorAll('[data-recent-log]').forEach(b=>b.onclick=()=>{const e=recent[Number(b.dataset.recentLog)];if(e.meal==='custom')customMealSheet(null,e.name,e.amount);else portionSheet(e.meal);});
 }
 $('#log-meal-search').oninput=results;results();
}
function afterLog(saved){diaryNotice=saved?'Meal logged. You can edit it any time.':'Kept for this visit. Your browser could not save it for later.';removedLog=null;refresh();notify(saved,'Meal logged');logSheet();}
function customMealSheet(entry=null,name='',amount=''){
 sheet(entry?'Edit your meal.':'Add your own meal.',`<button class="diary-back" id="custom-back">${entry?'Today’s meals':'Choose a dish'}</button><form id="custom-meal-form"><label class="field-label" for="custom-meal-name">What did you eat?</label><input class="diary-text-input" id="custom-meal-name" name="name" required maxlength="80" placeholder="e.g. phở gà" value="${esc(entry?.name||name)}"><label class="field-label" for="custom-meal-occasion">Which meal?</label><select class="diary-select" id="custom-meal-occasion" name="occasion">${Object.entries(mealLabels).map(([key,label])=>`<option value="${key}">${label}</option>`).join('')}</select><label class="field-label" for="custom-meal-amount">Amount <span class="optional-label">· optional</span></label><input class="diary-text-input" id="custom-meal-amount" name="amount" maxlength="80" placeholder="e.g. 1 bowl, half a plate…" value="${esc(entry?.amount||amount)}"><p class="sheet-footnote">An estimate in your own words is enough.</p><button class="food-primary diary-submit" type="submit">${entry?'Save changes':'Log this meal'} <span>✓</span></button></form>`);
 $('#custom-back').onclick=()=>entry?logSheet():pickLogMeal($('#custom-meal-name').value);
 $('#custom-meal-occasion').value=entry?.occasion||logOccasion();
 $('#custom-meal-form').onsubmit=e=>{e.preventDefault();const form=e.currentTarget,data=new FormData(form),name=String(data.get('name')).trim();if(!name){$('#custom-meal-name').setCustomValidity('Please enter a dish name.');$('#custom-meal-name').reportValidity();return;}afterLog(store.log(today(),'custom',data.get('occasion'),null,entry?.key,{name,amount:data.get('amount')}));};
 $('#custom-meal-name').oninput=e=>e.target.setCustomValidity('');
}
function portionSheet(id,entry){
 const m=MEALS[id],value=entry?entry.portion:null,reference=referenceAmounts[m.id]||'1 serving of rice and sides';
 sheet(entry?'Edit your meal.':'Log what you ate.',`<button class="diary-back" id="portion-back">${entry?'Today’s meals':'Choose another dish'}</button><div class="log-selected-meal"><img src="${m.image}" alt=""><div><p class="eyebrow">YOUR CHOSEN DISH</p><h3 lang="vi">${esc(m.short)}</h3></div></div><form id="portion-form"><label class="field-label" for="log-occasion">Which meal?</label><select class="diary-select" id="log-occasion" name="occasion">${Object.entries(mealLabels).map(([key,label])=>`<option value="${key}">${label}</option>`).join('')}</select><p class="sheet-footnote portion-reference">One serving is about ${esc(reference)}.</p><fieldset class="portion-options"><legend>About how much? <span class="optional-label">· optional</span></legend>${[[0.5,'½'],[1,'1'],[1.5,'1½']].map(([n,label])=>`<label><input type="radio" name="portion" value="${n}" ${n===value?'checked':''}><span><strong>${label}</strong>${n===1.5?'servings':'serving'}</span></label>`).join('')}</fieldset><label class="unknown-portion"><input type="radio" name="portion" value="unknown" ${value===null?'checked':''}> Not sure about the portion</label><button class="food-primary diary-submit" type="submit">${entry?'Save changes':'Log this meal'} <span>✓</span></button></form>`);
 $('#portion-back').onclick=()=>entry?logSheet():pickLogMeal();
 $('#log-occasion').value=entry?.occasion||logOccasion();
 $('#portion-form').onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget),p=f.get('portion');afterLog(store.log(today(),id,f.get('occasion'),p==='unknown'?null:Number(p),entry?.key));};
}

function detailInfo(id){
 const m=MEALS[id],p=prefs(),allowed=F.eligible(m,p);
 return `<aside class="recipe-recommendation"><p class="eyebrow">${allowed?'ABOUT THIS DISH':'CHECK YOUR FOOD CHOICES'}</p><p>${allowed?reason(m):m.ingredientsVerified===false?'The restaurant ingredients have not been confirmed against your exclusions.':'This recipe includes ingredients or an eating style you have chosen to avoid.'}</p><p class="recipe-allergens">${m.allergens.length?'Ingredients to note: '+m.allergens.map(a=>allergens[a]||a).join(', ')+'.':'Ingredients and seasonings are listed below.'} ${esc(m.allergensNote||'')}</p><button type="button" data-food-save="${id}" aria-pressed="${store.get().saved.includes(m.id)}">${store.get().saved.includes(m.id)?'✓ Saved for later':'Save for later +'} </button><button type="button" data-food-log-quick="${id}">I ate this +</button></aside>`;
}

function refresh(rebuild=true){renderToday();if(rebuild)renderSuggestions();renderList();document.dispatchEvent(new CustomEvent('food-log-updated'));}

const api={
  portionSheet,
  detailInfo,
  connectFoodChat,
  returnScroll:foodReturn?.view.scrollTop??null,
  returnRecipeProgress:foodReturn?.view.recipeProgress||null,
  renderLog:id=>{
    const entries=store.day(today()).filter(e=>e.meal===MEALS[id].id);
    return `<button class="log-button" type="button" data-log-action="add"><span>${entries.length?'Log another meal':'I ate this'}</span><span>+</span></button>${entries.length?'<button class="recipe-view-log" type="button" data-log-action="view">✓ Logged today · View or edit</button>':''}`;
  },
  save:id=>{
    const saved=store.toggleSave(MEALS[id].id);
    renderList();
    notify(saved,store.get().saved.includes(MEALS[id].id)?'Recipe saved for later':'Recipe removed from saved');
  },
  saved:id=>store.get().saved.includes(MEALS[id].id),
  logSheet,
  refresh
};

$('#food-overview-view').innerHTML=`<nav class="table-nav" aria-label="Food navigation"><a href="home.html" class="icon-button" aria-label="Back to Home"><svg viewBox="0 0 24 24"><path d="m14 6-6 6 6 6M8 12h12"/></svg></a><a class="table-brand" href="home.html">FITLENS<span>THE EVERYDAY TABLE</span></a><button class="nav-edition diary-nav" id="open-food-diary" type="button">Log meal <span>+</span></button></nav><header class="discovery-intro"><h1>At the <em>table.</em></h1><div id="food-context" class="food-context"></div></header><section class="next-meal" aria-label="Next meal suggestions"><div class="next-meal-heading"><label class="occasion-label">IDEAS FOR<select id="meal-occasion" aria-label="Meal to suggest">${['Breakfast','Lunch','Dinner','Snack'].map(s=>`<option value="${s}">${s}</option>`).join('')}</select></label><button id="why-food" type="button">Why these?</button></div><p id="suggestion-caption" class="suggestion-caption"></p><div class="meal-rail" id="meal-rail" tabindex="0" aria-label="Suggested recipes"></div><div class="rail-controls" id="rail-controls"><span id="rail-position" aria-live="polite"></span></div><div class="food-preference-line" id="food-preference-line"></div></section><a class="food-chat-invitation" id="food-chat-invitation" href="chat.html?source=food"><span><strong>Nothing quite right?</strong><span>Tell FitLens what you have at home.</span></span></a><section class="recipe-directory" aria-labelledby="recipe-directory-title"><p class="eyebrow">THE EVERYDAY KITCHEN</p><h2 id="recipe-directory-title">Find something else.</h2><div class="food-search-row"><label class="food-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg><input id="food-search" type="search" placeholder="Dish or ingredient" aria-label="Search dishes or ingredients" autocomplete="off"></label><button id="food-filter-button" type="button">Filters</button></div><div id="active-food-filters" class="active-food-filters"></div><p class="recipe-results-count" id="recipe-results-count" aria-live="polite"></p><div id="recipe-results"></div></section><section class="today-food-summary" id="today-food-summary" aria-label="Today’s meals"></section><p id="food-storage-note" class="food-storage-note" role="status" hidden>Kept for this visit only.</p><footer class="table-end"><span class="end-rule"></span><a href="home.html">Back to your day </a></footer>`;

$('#meal-occasion').value=occasion;$('#food-search').value=query;connectFoodChat($('#food-chat-invitation'));
$('#meal-occasion').onchange=e=>{occasion=e.target.value;renderSuggestions();$('#food-announcement').textContent='Showing ideas for '+($('#meal-occasion').options[$('#meal-occasion').selectedIndex].text).toLowerCase();};
$('#food-search').oninput=e=>{query=e.target.value;renderList();};
$('#food-filter-button').onclick=filterSheet;
$('#why-food').onclick=why;


$('#meal-rail').addEventListener('scroll',position,{passive:true});
$('#meal-rail').onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();move(e.key==='ArrowRight'?1:-1);}};
if($('#browse-meals'))$('#browse-meals').onclick=()=>$('#recipe-directory-title').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'});
$('#food-overview-view').addEventListener('click',e=>{const a=e.target.closest('[data-discover-meal]');if(a&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&!e.altKey){e.preventDefault();openMeal(a.dataset.discoverMeal);}});

renderPreferenceLine();
renderSuggestions();
renderList();
renderToday();
if(foodReturn?.view.slideIndex){const rail=$('#meal-rail'),slides=[...rail.children],target=slides[foodReturn.view.slideIndex];if(target)rail.scrollLeft=target.offsetLeft-slides[0].offsetLeft;}
return api;
};
})();
