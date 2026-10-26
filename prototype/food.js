(function () {
  'use strict';
  const MEALS = {
    chicken: {
      id: 'chicken',
      index: '01',
      indexDisplay: '01 / 03',
      title: 'Cơm gà Hội An',
      time: '45 min',
      meta: 'About 45 min · 2 servings',
      image: 'assets/food/demo/com-ga-hoi-an-demo.svg',
      position: 'center 35%',
      alt: 'Cơm gà Hội An plate with yellow turmeric rice, shredded chicken, herbs, and a small sauce bowl',
      sourceUrl: 'https://elmich.vn/com-ga-hoi-an',
      ingredients: [
        '2 chicken thighs (about 350 g)',
        '1 cup uncooked rice',
        '1 small piece of ginger',
        '½ onion',
        '½ cucumber',
        'A handful of Vietnamese coriander',
        '½ tsp turmeric',
        '1 lime',
        'Fish sauce and salt, to taste'
      ],
      steps: [
        'Simmer the chicken with ginger and onion until cooked through. Keep the broth.',
        'Cook the rice with some chicken broth and turmeric.',
        'Shred the chicken. Slice the cucumber and toss the onion with lime and Vietnamese coriander.',
        'Serve the chicken and herbs over the rice. Add fish sauce to taste.'
      ]
    },
    tofu: {
      id: 'tofu',
      index: '02',
      indexDisplay: '02 / 03',
      title: 'Đậu phụ sốt cà chua',
      time: '20 min',
      meta: 'About 20 min · 2 servings',
      image: 'assets/food/demo/dau-phu-sot-ca-demo.svg',
      position: 'center center',
      alt: 'Golden-fried tofu cubes simmered with tomato sauce and chopped scallions in a pan',
      sourceUrl: 'https://giadinh.suckhoedoisong.vn/ngon-mieng-bua-com-mua-he-voi-mon-dau-phu-sot-ca-chua-172200725103956555.htm',
      ingredients: [
        '250 g firm tofu',
        '2 tomatoes',
        '1 garlic clove',
        '2 scallions',
        '1 tbsp cooking oil',
        '1 tsp soy sauce',
        'Cooked rice, to serve'
      ],
      steps: [
        'Pat the tofu dry and cut it into bite-sized pieces.',
        'Pan-fry the tofu until lightly golden, then set it aside.',
        'Cook the garlic and chopped tomatoes with a splash of water until they soften into a sauce.',
        'Return the tofu to the pan for a few minutes. Finish with soy sauce and scallions; serve with rice.'
      ]
    },
    egg: {
      id: 'egg',
      index: '03',
      indexDisplay: '03 / 03',
      title: 'Cơm lười trứng ốp la sốt Thái',
      time: '15 min',
      meta: 'About 15 min · 1 serving',
      image: 'assets/food/demo/com-trung-sot-thai-demo.svg',
      position: 'center 40%',
      alt: 'Sunny-side up eggs cooking in a skillet with chopped scallions, red chili slices, and sauce',
      sourceUrl: 'https://www.bachhoaxanh.com/kinh-nghiem-hay/huong-dan-lam-com-luoi-trung-op-la-sot-thai-chuan-vi-chua-vang-1583158',
      ingredients: [
        '1 bowl cooked rice',
        '2 eggs',
        '1 garlic clove',
        '1 tbsp soy sauce',
        '1 tsp lime juice',
        '1 tsp sugar',
        'Chili, to taste',
        'A splash of water'
      ],
      steps: [
        'Mix the soy sauce, lime juice, sugar, chili, and water until the sugar dissolves.',
        'Fry the eggs to your liking and warm the rice.',
        'Briefly cook the garlic, then stir in the sauce.',
        'Put the eggs over the rice and spoon the sauce on top.'
      ]
    }
  };


  const EDITORIAL = {
    chicken: {place:'A taste of Hội An',deck:'Golden rice, tender chicken, and a handful of fresh herbs.',serves:'2 servings',credit:'Elmich',headings:['Start with the chicken','Let the broth do the work','Prepare the fresh things','Bring it to the table']},
    tofu: {place:'The everyday kitchen',deck:'Soft tofu in tomato sauce. Something familiar to spoon over warm rice.',serves:'2 servings',credit:'Gia đình & Xã hội',headings:['Prepare the tofu','Give it a golden edge','Make the tomato sauce','Finish gently']},
    egg: {place:'A quick meal at home',deck:'A little heat, a little tang, and eggs to spoon over a bowl of warm rice.',serves:'1 serving',credit:'Bách Hóa XANH',headings:['Mix the sauce','Get the eggs ready','Warm the sauce','Serve over rice']}
  };
  const overview=document.getElementById('food-overview-view');
  const detail=document.getElementById('food-detail-view');
  const scroller=document.getElementById('food-scroll');
  const announcement=document.getElementById('food-announcement');
  let overviewScroll=0;
  let memoryDate='';
  let storageFailed=false;
  let memoryLog=new Set();
  function dateKey(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function loadLog(){const date=dateKey();if(memoryDate!==date){memoryDate=date;memoryLog=new Set();}try{if(storageFailed)return new Set(memoryLog);const value=JSON.parse(localStorage.getItem('fitlens_logged_meals_'+date)||'[]');if(Array.isArray(value))memoryLog=new Set(value.filter(id=>Object.hasOwn(MEALS,id)));}catch{storageFailed=true;}return new Set(memoryLog);}
  function changeLog(id,add){const log=loadLog();add?log.add(id):log.delete(id);memoryLog=log;try{localStorage.setItem('fitlens_logged_meals_'+dateKey(),JSON.stringify([...log]));return true;}catch{storageFailed=true;return false;}}
  function escape(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  const backIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6M8 12h12"/></svg>';
  function updateOverview(){const logged=loadLog();document.querySelectorAll('[data-log-note]').forEach(el=>el.hidden=!logged.has(el.dataset.logNote));}
  function renderLog(id){const logged=loadLog().has(id);return logged?'<div class="logged-state"><span>✓ Added to today</span><button class="remove-meal" type="button" data-log-action="remove">Remove</button></div>':'<button class="log-button" type="button" data-log-action="add"><span>I ate this</span><span aria-hidden="true">+</span></button>';}
  function renderDetail(id){
    const m=MEALS[id],e=EDITORIAL[id];
    detail.innerHTML=`<nav class="recipe-nav" aria-label="Recipe navigation"><button class="icon-button" id="detail-back-btn" aria-label="Back to the meals">${backIcon}</button><span class="recipe-nav-title">THE RECIPE</span><span class="recipe-ordinal">${m.index}</span></nav>
      <div class="recipe-photo" style="--photo-position:${m.position}"><img src="${m.image}" alt="${escape(m.alt)}"></div>
      <header class="recipe-header"><p class="eyebrow">${escape(e.place)}</p><h1 tabindex="-1" id="recipe-title">${escape(m.title)}</h1><p class="recipe-deck">${escape(e.deck)}</p><div class="recipe-facts"><div><span class="fact-label">Cook time</span><span class="fact-value">About ${m.time}</span></div><div><span class="fact-label">Makes</span><span class="fact-value">${e.serves}</span></div></div><nav class="recipe-jumps" aria-label="Jump to recipe section"><button type="button" class="is-active" data-jump="ingredients">Ingredients</button><button type="button" data-jump="method">Method ↓</button></nav></header>
      <div class="recipe-content"><section class="recipe-section" id="ingredients"><div class="recipe-section-top"><h2>What you'll need</h2><span class="section-count" id="ingredient-count" aria-live="polite">0 of ${m.ingredients.length} ready</span></div><p class="ingredient-intro">Tick off ingredients as you get them ready.</p><ul class="ingredient-list">${m.ingredients.map((ing,i)=>`<li><label class="ingredient-row"><input type="checkbox" aria-label="${escape(ing)}"><span>${escape(ing)}</span></label></li>`).join('')}</ul><button type="button" class="reset-ingredients" id="reset-ingredients">Clear checks</button></section>
      <section class="recipe-section" id="method"><p class="eyebrow">THE METHOD</p><h2>In the kitchen.</h2><p class="method-intro">Tap a step number to keep your place.</p><ol class="method-list">${m.steps.map((st,i)=>`<li class="method-step"><button class="step-toggle" type="button" aria-pressed="false" aria-label="Mark step ${i+1} complete" data-step="${i+1}">${String(i+1).padStart(2,'0')}</button><div><h3>${escape(e.headings[i])}</h3><p>${escape(st)}</p></div></li>`).join('')}</ol></section></div>
      <section class="recipe-log" aria-label="Meal log"><p class="eyebrow">YOUR DAY, NOTED</p><h2>Made it to your table?</h2><p>Keep a note of what you ate today.</p><div id="recipe-log-controls">${renderLog(id)}</div><p id="storage-message" class="storage-message" role="status" hidden></p></section>
      <footer class="recipe-footer"><a href="${m.sourceUrl}" target="_blank" rel="noopener noreferrer">Recipe reference ↗</a><span>FitLens · Food</span></footer>`;
    overview.hidden=true;detail.hidden=false;scroller.scrollTop=0;document.title='FitLens — '+m.title;
    document.getElementById('detail-back-btn').addEventListener('click',()=>{if(history.state?.foodFromOverview)history.back();else{history.replaceState({foodView:'overview'},'','food.html');showOverview();}});
    detail.querySelectorAll('[data-jump]').forEach(btn=>btn.addEventListener('click',()=>{detail.querySelectorAll('[data-jump]').forEach(item=>item.classList.toggle('is-active',item===btn));detail.querySelector('#'+btn.dataset.jump).scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});}));
    const checkboxes=[...detail.querySelectorAll('.ingredient-row input')];
    function count(){document.getElementById('ingredient-count').textContent=`${checkboxes.filter(c=>c.checked).length} of ${m.ingredients.length} ready`;}
    checkboxes.forEach(c=>c.addEventListener('change',count));
    document.getElementById('reset-ingredients').addEventListener('click',()=>{checkboxes.forEach(c=>c.checked=false);count();});
    detail.querySelectorAll('.step-toggle').forEach(btn=>btn.addEventListener('click',()=>{const done=btn.getAttribute('aria-pressed')!=='true';btn.setAttribute('aria-pressed',String(done));btn.setAttribute('aria-label',`Mark step ${btn.dataset.step} ${done?'incomplete':'complete'}`);btn.closest('li').classList.toggle('is-done',done);btn.textContent=done?'✓':String(btn.dataset.step).padStart(2,'0');}));
    document.getElementById('recipe-log-controls').addEventListener('click',ev=>{const btn=ev.target.closest('[data-log-action]');if(!btn)return;const scroll=scroller.scrollTop;const added=btn.dataset.logAction==='add';const saved=changeLog(id,added);document.getElementById('recipe-log-controls').innerHTML=renderLog(id);const status=document.getElementById('storage-message');status.hidden=saved;status.textContent='Kept for this visit. Your browser could not save it for later.';updateOverview();scroller.scrollTop=scroll;announcement.textContent=added?'Meal added to today':'Meal removed from today';});
  }
  function showOverview(){detail.hidden=true;overview.hidden=false;updateOverview();scroller.scrollTop=overviewScroll;document.title='FitLens — At the table';}
  function openMeal(id){if(!Object.hasOwn(MEALS,id))return;overviewScroll=scroller.scrollTop;history.pushState({foodFromOverview:true},'',`?meal=${id}`);renderDetail(id);}
  function sync(){const id=new URLSearchParams(location.search).get('meal');if(id&&Object.hasOwn(MEALS,id))renderDetail(id);else{if(id)history.replaceState({foodView:'overview'},'','food.html');showOverview();}}
  document.querySelectorAll('[data-open-meal]').forEach(a=>a.addEventListener('click',ev=>{if(ev.ctrlKey||ev.metaKey||ev.shiftKey||ev.altKey)return;ev.preventDefault();openMeal(a.dataset.openMeal);}));
  document.getElementById('browse-meals').addEventListener('click',()=>document.getElementById('more-meals-title').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'}));
  addEventListener('popstate',sync);addEventListener('pageshow',updateOverview);sync();
})();
