(() => {
 'use strict';
 const svg=document.querySelector('#walk-reflection-face');if(!svg)return;
 const mascot=FitLensFace.mount(svg,{expression:'content',themeTarget:document.querySelector('#walk-reflection-mascot')});
 const moods={restored:'content',energized:'energized',grounded:'calm'};
 let selected='restored';
 document.querySelectorAll('.feeling-pill').forEach(button=>button.addEventListener('click',()=>{selected=button.dataset.feeling;mascot.set(moods[selected]||'calm');}));
 document.querySelector('#save-walk-btn')?.addEventListener('click',()=>{try{sessionStorage.setItem('fitlens:last-check-in',JSON.stringify({kind:'walk',expression:moods[selected]||'calm',at:Date.now()}));}catch{}});
})();
