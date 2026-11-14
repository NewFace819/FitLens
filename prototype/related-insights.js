/* Contextual reading shelves use the same article records and card styles as Insights. */
(() => {
  'use strict';
  const library = window.FitLensGuides;
  const page = location.pathname.split('/').pop();
  const walking = [['workout','steps-truth'],['workout','pacing'],['recovery','active-recovery'],['body','mental-health']];
  const shelves = {
    'steps.html': ['#steps-main', 'More about walking', walking, true],
    'food.html': ['#food-overview-view', 'More about eating well', [['eating','fuel'],['eating','carbs'],['eating','protein'],['eating','fats']], true],
    'workouts.html': ['#training-content', 'More about training', [['workout','consistency'],['workout','variety'],['workout','progressing-safely'],['body','rpe']], false],
    'workout-details.html': ['.details-scroll', 'More about your training', [['workout','progressing-safely'],['body','rpe'],['workout','consistency']], true],
    'plan.html': ['#training-content', 'More about a balanced week', [['workout','consistency'],['recovery','rest-day'],['recovery','supercompensation'],['recovery','returning-break']], false],
    'streak.html': ['#rhythm-scroll', 'More about your rhythm', [['workout','consistency'],['recovery','rest-day'],['recovery','returning-break'],['recovery','burnout-signs']], true],
    'home.html': ['#home-scroll', 'Daily reading', [['body','mental-health'],['sleep','sleep-hygiene'],['eating','fuel']], false]
  };
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const phone = document.querySelector('.fl-phone,.food-phone,.rhythm-phone');
  if (!phone || !library) return;

  // Native modal provides focus containment, Escape dismissal and an inert background.
  const reader = document.createElement('dialog');
  reader.className = 'related-reader';
  reader.setAttribute('aria-labelledby', 'related-reader-title');
  reader.innerHTML = `<header class="related-reader-toolbar"><span class="related-reader-pill" aria-hidden="true"></span><button type="button" class="related-reader-close" aria-label="Close article">×</button></header><div class="related-reader-body" tabindex="0" aria-label="Article content"><div class="reader-hero-wrapper"><div class="reader-icon-box"><img alt=""></div><span class="reader-badge"></span><h2 class="reader-title" id="related-reader-title"></h2></div><p class="reader-summary-callout"></p><section class="reader-section"><h3>The Science Simply Put</h3><p data-field="science"></p></section><section class="reader-section"><h3>Why It Matters for You</h3><p data-field="whyMatters"></p></section><section class="reader-section"><h3>Everyday Practice</h3><p data-field="practical"></p></section><div class="takeaway-card"><span class="takeaway-icon" aria-hidden="true">💡</span><p class="takeaway-text"><strong>Key Takeaway</strong><span data-field="takeaway"></span></p></div></div>`;
  document.body.append(reader);
  let opener = null;
  function positionReader() {
    const rect = phone.getBoundingClientRect();
    reader.style.left = Math.max(0, rect.left) + 'px';
    reader.style.width = Math.min(rect.width, innerWidth) + 'px';
    reader.style.bottom = Math.max(0, innerHeight - rect.bottom) + 'px';
    reader.style.maxHeight = Math.min(rect.height * .88, innerHeight * .92) + 'px';
  }
  function open(category, id) {
    const cat = library[category], article = cat?.articles.find(a => a.id === id);
    if (!article) return;
    opener = document.activeElement;
    reader.querySelector('img').src = article.icon;
    const badge = reader.querySelector('.reader-badge');
    badge.textContent = cat.name;
    badge.className = 'reader-badge ' + cat.badgeClass;
    reader.querySelector('.reader-title').textContent = article.title;
    reader.querySelector('.reader-summary-callout').textContent = article.summary;
    reader.querySelectorAll('[data-field]').forEach(node => node.textContent = article[node.dataset.field]);
    positionReader();
    if (!reader.open) reader.showModal();
    reader.querySelector('.related-reader-body').scrollTop = 0;
    reader.querySelector('.related-reader-close').focus({preventScroll:true});
  }
  window.FitLensArticles = {open};
  reader.querySelector('.related-reader-close').onclick = () => reader.close();
  reader.addEventListener('keydown', event => {
    if(event.key !== 'Tab') return;
    const first=reader.querySelector('.related-reader-close'),last=reader.querySelector('.related-reader-body');
    if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus({preventScroll:true});}
    else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus({preventScroll:true});}
  });
  reader.addEventListener('close', () => { if (opener?.isConnected && (reader.contains(document.activeElement) || document.activeElement === document.body)) opener.focus({preventScroll:true}); });
  reader.addEventListener('click', event => {
    const r = reader.getBoundingClientRect();
    if (event.target === reader && (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom)) reader.close();
  });
  addEventListener('resize', () => { if(reader.open) positionReader(); });

  function mount([selector, title, choices, edge]) {
    const host = document.querySelector(selector);
    if (!host) return;
    function render() {
      if (host.querySelector(':scope > .related-insights')) return;
      const section = document.createElement('section');
      section.className = 'related-insights' + (edge ? ' related-insights-edge' : '');
      section.setAttribute('aria-label', title);
      section.innerHTML = `<h2 class="related-insights-title">${escape(title)}</h2><div class="guide-track" role="group" aria-label="${escape(title)} articles"></div>`;
      const track = section.querySelector('.guide-track');
      choices.forEach(([category,id]) => {
        const article = library[category]?.articles.find(a => a.id === id);
        if (!article) return;
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'guide-card cat-' + category;
        card.setAttribute('aria-haspopup', 'dialog');
        card.innerHTML = `<span class="guide-card-icon"><img src="${escape(article.icon)}" alt="" loading="lazy"></span><span class="guide-card-bottom"><span class="guide-card-title">${escape(article.title)}</span></span>`;
        card.onclick = () => open(category,id);
        track.append(card);
      });
      track.addEventListener('keydown', event => {
        if (!['ArrowLeft','ArrowRight'].includes(event.key)) return;
        const cards = [...track.children], index = cards.indexOf(document.activeElement);
        if(index < 0) return;
        event.preventDefault();
        const next = cards[Math.max(0,Math.min(cards.length-1,index+(event.key==='ArrowRight'?1:-1)))];
        next.focus({preventScroll:true});
        track.scrollTo({left:next.offsetLeft-cards[0].offsetLeft,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});
      });
      const footer = host.querySelector(':scope > .table-end, :scope > .recipe-footer, :scope > .sample-note');
      host.insertBefore(section, footer);
    }
    render();
    // Library, Plan and Food rebuild their contents after edits or navigation.
    new MutationObserver(render).observe(host, {childList:true});
  }
  if (shelves[page]) mount(shelves[page]);
  if (page === 'food.html') mount(['#food-detail-view','More about everyday nourishment',[['eating','nutrients'],['eating','protein'],['eating','fats']],true]);
})();
