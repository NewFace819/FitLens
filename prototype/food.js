(function () {
  'use strict';
  const MEALS = FitLensCatalog.meals;
  const EDITORIAL = FitLensCatalog.editorial;
  const overview = document.getElementById('food-overview-view');
  const detail = document.getElementById('food-detail-view');
  const scroller = document.getElementById('food-scroll');
  const announcement = document.getElementById('food-announcement');
  let overviewScroll = 0;

  function escape(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  const backIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6M8 12h12"/></svg>';
  let discovery;

  function updateOverview() {
    discovery?.refresh(false);
  }

  function renderLog(id) {
    return discovery.renderLog(id);
  }

  function renderDetail(id) {
    const m = MEALS[id], e = EDITORIAL[id];
    if (!m || !e) return;
    detail.innerHTML = `<nav class="recipe-nav" aria-label="Recipe navigation"><button class="icon-button" id="detail-back-btn" aria-label="Back to the meals">${backIcon}</button><span class="recipe-nav-title">THE RECIPE</span><span class="recipe-ordinal">${m.index}</span></nav>
      <div class="recipe-photo" style="--photo-position:${m.position}"><img src="${m.image}" alt="${escape(m.alt)}"></div><p class="recipe-photo-note">${escape(m.photoNote||'Illustrative photo.')}</p>
      <header class="recipe-header"><p class="eyebrow">${escape(e.place)}</p><h1 lang="vi" tabindex="-1" id="recipe-title">${escape(m.title)}</h1><p class="recipe-deck">${escape(e.deck)}</p><div class="recipe-facts"><div><span class="fact-label">${m.type==='out'?'Preparation':'Approx. prep time'}</span><span class="fact-value">${m.time}</span></div><div><span class="fact-label">Makes</span><span class="fact-value">${e.serves}</span></div></div><div class="recipe-preparation"><p>${escape(m.cookCondition)}</p>${m.tools.length?`<p><strong>Equipment:</strong> ${escape(m.tools.join(', '))}</p>`:''}</div>${discovery.detailInfo(id)}<nav class="recipe-jumps" aria-label="Jump to recipe section"><button type="button" class="is-active" data-jump="ingredients">${m.type==='out'?'Ingredients':'Ingredients'}</button><button type="button" data-jump="method">${m.type==='out'?'Ordering notes':'Method'}</button></nav></header>
      <div class="recipe-content"><section class="recipe-section" id="ingredients"><div class="recipe-section-top"><h2>${m.type==='out'?'In an example serving':'What you’ll need'}</h2><span class="section-count" id="ingredient-count" aria-live="polite">${m.type==='out'?'Varies by seller':`0 / ${m.ingredients.length} ready`}</span></div><p class="ingredient-intro">${m.type==='out'?'Confirm the actual ingredients with the seller.':'Tick off ingredients as you get them ready.'}</p><ul class="ingredient-list">${m.ingredients.map((ing, i) => m.type==='out'?`<li class="outside-ingredient">${escape(ing)}</li>`:`<li><label class="ingredient-row"><input type="checkbox" aria-label="${escape(ing)}"><span>${escape(ing)}</span></label></li>`).join('')}</ul><button ${m.type==='out'?'hidden':''} type="button" class="reset-ingredients" id="reset-ingredients">Clear checks</button><a class="food-chat-invitation recipe-chat-invitation" id="recipe-chat-invitation" href="chat.html?source=food"><span><strong>Make it work with what you have.</strong><span>Ask about ingredients or equipment.</span></span></a></section>
      <section class="recipe-section" id="method"><p class="eyebrow">THE METHOD</p><h2>${m.type==='out'?'Before you order.':'In the kitchen.'}</h2><p class="method-intro">${m.type==='out'?'Check with the seller before ordering.':'Tap a step number to keep your place.'}</p><ol class="method-list">${m.steps.map((st, i) => `<li class="method-step"><button class="step-toggle" type="button" aria-pressed="false" aria-label="Mark step ${i + 1}" data-step="${i + 1}">${String(i + 1).padStart(2, '0')}</button><div><h3>${escape(e.headings[i] || 'Step ' + (i + 1))}</h3><p>${escape(st)}</p></div></li>`).join('')}</ol></section></div>
      <section class="recipe-log" aria-label="Meal log"><p class="eyebrow">YOUR DAY, NOTED</p><h2>Made it to your table?</h2><p>Log it to help us suggest something different next time.</p><div id="recipe-log-controls">${renderLog(id)}</div><p id="storage-message" class="storage-message" role="status" hidden></p></section>
      <footer class="recipe-footer"><a href="${m.sourceVerified?m.sourceUrl:'#'}" ${m.sourceVerified?'target="_blank" rel="noopener noreferrer"':'hidden'}>Recipe reference</a><span>FitLens · The everyday table</span></footer>`;
    discovery.connectFoodChat(detail.querySelector('#recipe-chat-invitation'),id);
    overview.hidden = true;
    detail.hidden = false;
    scroller.scrollTop = 0;
    document.title = 'FitLens — ' + m.title;
    document.getElementById('detail-back-btn').addEventListener('click', () => {
      if (history.state?.foodFromOverview) history.back();
      else {
        history.replaceState({foodView: 'overview'}, '', overviewUrl());
        showOverview();
      }
    });
    detail.querySelectorAll('[data-jump]').forEach(btn => btn.addEventListener('click', () => {
      detail.querySelectorAll('[data-jump]').forEach(item => item.classList.toggle('is-active', item === btn));
      detail.querySelector('#' + btn.dataset.jump).scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start'});
    }));
    const checkboxes = [...detail.querySelectorAll('.ingredient-row input')];
    function count() {
      document.getElementById('ingredient-count').textContent = `${checkboxes.filter(c => c.checked).length} / ${m.ingredients.length} ready`;
    }
    checkboxes.forEach(c => c.addEventListener('change', count));
    const restored=discovery.returnRecipeProgress;if(restored?.id===m.id){checkboxes.forEach((c,i)=>c.checked=restored.ingredients.includes(i));if(m.type!=='out')count();}
    document.getElementById('reset-ingredients').addEventListener('click', () => {
      checkboxes.forEach(c => c.checked = false);
      count();
    });
    detail.querySelectorAll('.step-toggle').forEach(btn => btn.addEventListener('click', () => {
      const done = btn.getAttribute('aria-pressed') !== 'true';
      btn.setAttribute('aria-pressed', String(done));
      btn.setAttribute('aria-label', `${done?'Unmark':'Mark'} step ${btn.dataset.step}`);
      btn.closest('li').classList.toggle('is-done', done);
      btn.textContent = done ? '✓' : String(btn.dataset.step).padStart(2, '0');
    }));
    if(restored?.id===m.id)detail.querySelectorAll('.step-toggle').forEach(btn=>{if(restored.steps.includes(btn.dataset.step))btn.click();});
    detail.querySelector('[data-food-log-quick]').onclick = () => discovery.portionSheet(id);
    detail.querySelector('[data-food-save]').onclick = e => {
      discovery.save(id);
      e.currentTarget.textContent = discovery.saved(id) ? '✓ Saved for later' : 'Save for later +';
      e.currentTarget.setAttribute('aria-pressed', String(discovery.saved(id)));
    };
    document.getElementById('recipe-log-controls').addEventListener('click', ev => {
      const btn = ev.target.closest('[data-log-action]');
      if (!btn) return;
      if (btn.dataset.logAction === 'view') discovery.logSheet();
      else discovery.portionSheet(id);
    });
  }

  function showOverview() {
    detail.hidden = true;
    overview.hidden = false;
    updateOverview();
    scroller.scrollTop = overviewScroll;
    document.title = 'FitLens — At the table';
  }

  function openMeal(id) {
    if (!Object.hasOwn(MEALS, id)) return;
    overviewScroll = scroller.scrollTop;
    history.pushState({foodFromOverview: true}, '', (() => {
      const u = new URL(location.href);
      u.searchParams.set('meal', id);
      return u.pathname + u.search;
    })());
    renderDetail(id);
  }

  function sync() {
    const id = new URLSearchParams(location.search).get('meal');
    if (id && Object.hasOwn(MEALS, id)) renderDetail(id);
    else {
      if (id) history.replaceState({foodView: 'overview'}, '', overviewUrl());
      showOverview();
    }
  }

  function overviewUrl() {
    const u = new URL(location.href);
    u.searchParams.delete('meal');
    return u.pathname + u.search;
  }

  discovery = mountFoodDiscovery(MEALS, openMeal, escape);
  document.addEventListener('food-log-updated', () => {
    const id = new URLSearchParams(location.search).get('meal');
    if (id && MEALS[id]) document.getElementById('recipe-log-controls').innerHTML = renderLog(id);
  });
  addEventListener('popstate', sync);
  addEventListener('pageshow', updateOverview);
  sync();
  if(discovery.returnScroll!==null){requestAnimationFrame(()=>{scroller.scrollTop=discovery.returnScroll;});const u=new URL(location.href);u.searchParams.delete('chatReturn');history.replaceState(history.state,'',u.pathname+u.search);}
})();
