const GUIDES_DATA = window.FitLensGuides;

// UI Engine Initialization
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.guide-card[role="button"]').forEach(card => {
    card.setAttribute('aria-haspopup', 'dialog');
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        card.click();
      }
    });
  });
  const collectionSheet = document.getElementById('category-collection-sheet');
  const sheetBackdrop = document.getElementById('sheet-backdrop');
  
  const collectionCloseBtn = document.getElementById('collection-close-btn');

  // Collection elements
  const collectionTitle = document.getElementById('collection-title');
  const collectionDesc = document.getElementById('collection-desc');
  const collectionList = document.getElementById('collection-list');

  // Open Article Reader
  window.openArticle = function(catKey, articleId) {
    window.FitLensArticles.open(catKey, articleId);
    collectionSheet.classList.remove('active');
    sheetBackdrop.classList.remove('active');
  };

  // Open Category Collection (See all)
  window.openCategory = function(catKey) {
    const cat = GUIDES_DATA[catKey];
    if (!cat) return;

    collectionTitle.textContent = cat.name;
    collectionDesc.textContent = cat.desc;
    collectionList.innerHTML = '';

    cat.articles.forEach(article => {
      const item = document.createElement('div');
      item.className = 'collection-item ' + 'tint-' + catKey;
      item.innerHTML = `
        <div class="collection-item-icon">
          <img src="${article.icon}" alt="" aria-hidden="true">
        </div>
        <div class="collection-item-info">
          <h4>${article.title}</h4>
          <p>${article.summary}</p>
        </div>
        <div class="collection-item-arrow">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </div>
      `;
      item.addEventListener('click', () => {
        openArticle(catKey, article.id);
      });
      collectionList.appendChild(item);
    });

    collectionSheet.classList.add('active');
    sheetBackdrop.classList.add('active');
    collectionSheet.scrollTop = 0;
  };

  // Close handlers
  function closeAllSheets() {
    collectionSheet.classList.remove('active');
    sheetBackdrop.classList.remove('active');
  }

  if (collectionCloseBtn) collectionCloseBtn.addEventListener('click', closeAllSheets);
  if (sheetBackdrop) sheetBackdrop.addEventListener('click', closeAllSheets);

  // Keyboard close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllSheets();
  });
});
(()=>{const track=document.getElementById('monthly-track');if(!track)return;const cards=[...track.children],buttons=[...document.querySelectorAll('[data-month-shift]')];let current=0;function update(){current=cards.reduce((best,card,i)=>Math.abs(card.getBoundingClientRect().left-track.getBoundingClientRect().left-24)<Math.abs(cards[best].getBoundingClientRect().left-track.getBoundingClientRect().left-24)?i:best,0);document.getElementById('monthly-position').textContent=['September','August'][current]+' · '+(current+1)+' / '+cards.length;buttons.forEach(b=>b.disabled=Number(b.dataset.monthShift)<0?current===0:current===cards.length-1);}function move(delta){const next=Math.max(0,Math.min(cards.length-1,current+delta));track.scrollTo({left:cards[next].offsetLeft-cards[0].offsetLeft,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});}buttons.forEach(b=>b.onclick=()=>move(Number(b.dataset.monthShift)));track.addEventListener('scroll',update,{passive:true});track.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();move(e.key==='ArrowLeft'?-1:1);}});update();})();
