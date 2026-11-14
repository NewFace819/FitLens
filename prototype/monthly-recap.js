/* Illustrative September sessions. This chart describes logged working sets,
   not fitness readiness, recovery, or an optimal training range. */
const sessions=[{day:2,sets:12},{day:4,sets:18},{day:6,sets:16},{day:9,sets:14},{day:11,sets:20},{day:13,sets:16},{day:16,sets:18},{day:18,sets:14},{day:20,sets:22},{day:23,sets:16},{day:25,sets:20},{day:28,sets:18}];
const phone=document.querySelector('.phone'),stage=document.querySelector('.story-stage'),slides=[...document.querySelectorAll('.slide')],bars=[...document.querySelectorAll('.story-progress>span')];
const svgNS='http://www.w3.org/2000/svg';
const pts=sessions.map(s=>({...s,x:32+(s.day-1)/29*294,y:232-s.sets*7.875}));
const path=pts.map((p,i)=>`${i?'L':'M'}${p.x},${p.y}`).join(' ');
const line=document.querySelector('#trail-line'),cursor=document.querySelector('#trail-cursor'),camera=document.querySelector('#chart-camera');
line.setAttribute('d',path);document.querySelector('#trail-ghost').setAttribute('d',path);
const totalLength=line.getTotalLength();line.style.strokeDasharray=totalLength;
const lengths=pts.map((p,i)=>i===0?0:pts.slice(1,i+1).reduce((acc,q,j)=>acc+Math.hypot(q.x-pts[j].x,q.y-pts[j].y),0));
const dots=pts.map(p=>{const c=document.createElementNS(svgNS,'circle');c.setAttribute('cx',p.x);c.setAttribute('cy',p.y);c.setAttribute('r',3.5);c.setAttribute('class','session-dot');document.querySelector('#session-dots').append(c);return c});
let page=0,frame=0,started=0,explicitMotion=false;
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
const smooth=t=>t*t*(3-2*t);
function draw(progress){
 bars[1].firstElementChild.style.width=`${progress*100}%`; document.querySelector('.axis').style.opacity=Math.max(0,(progress-.85)/.15); const day=1+29*Math.min(progress/.88,1),count=sessions.filter(s=>s.day<=day).length;
 document.querySelector('#workout-count').textContent=count;
 const date=document.querySelector('#current-date');date.textContent=`SEP ${String(Math.floor(day)).padStart(2,'0')}`;date.dateTime=`2026-09-${String(Math.floor(day)).padStart(2,'0')}`;
 dots.forEach((c,i)=>{c.style.opacity=sessions[i].day<=day?'1':'0';c.classList.toggle('is-visible',sessions[i].day<=day)});
 let idx=pts.findIndex(p=>p.day>day);if(idx<0)idx=pts.length;
 let length=0,x=pts[0].x,y=pts[0].y;
 if(idx===pts.length){length=totalLength;x=pts.at(-1).x;y=pts.at(-1).y}else if(idx>0){const a=pts[idx-1],b=pts[idx],t=(day-a.day)/(b.day-a.day);length=lengths[idx-1]+(lengths[idx]-lengths[idx-1])*t;x=a.x+(b.x-a.x)*t;y=a.y+(b.y-a.y)*t;}
 line.style.strokeDashoffset=totalLength-length;line.style.opacity=day>=2?'1':'0';cursor.style.opacity=day>=2?'1':'0';cursor.setAttribute('cx',x);cursor.setAttribute('cy',y);
 const settling=smooth(Math.max(0,Math.min(1,(progress-.78)/.22))),zoom=1.55-.55*settling;
 const pan=Math.min(0,Math.max(342-342*zoom,148-x*zoom))*(1-settling);
 camera.setAttribute('transform',`translate(${pan},0) scale(${zoom},1)`);
}
// Advance the monthly timeline at a constant speed.
function tick(now){if(page!==1)return;const elapsed=Math.max(0,Math.min((now-started)/3000,1));draw(elapsed);if(elapsed<1)frame=requestAnimationFrame(tick);}
function show(next,preview=false){cancelAnimationFrame(frame);if(preview)explicitMotion=true;phone.classList.toggle('motion-preview',explicitMotion);page=Math.max(0,Math.min(1,next));phone.dataset.page=page;
 slides.forEach((slide,i)=>{slide.hidden=i!==page;slide.classList.remove('active')});
 void slides[page].offsetWidth;slides[page].classList.add('active');
 bars.forEach((b,i)=>{b.classList.toggle('current',i===page);b.classList.toggle('done',i<page)});
 document.querySelector('.story-progress').setAttribute('aria-label',`Page ${page+1} of 2`);
 document.querySelector('#page-index').textContent=`0${page+1} / 02`;
 document.querySelector('#tap-hint').textContent=page?'Tap to replay your month':'Tap to see your month';
 stage.setAttribute('aria-label',page?'Replay your monthly training history. Left arrow returns to the opening page.':'Next recap page. Use left and right arrow keys to move between pages.');
 document.querySelector('#page-announcement').textContent=page?'Page 2 of 2. You showed up. 12 workouts in September.':'Page 1 of 2. Your September recap.';
 if(page===1){draw(reduced.matches&&!explicitMotion?1:0);if(!reduced.matches||explicitMotion){started=performance.now();frame=requestAnimationFrame(tick)}}
}
let swipeStart=null,suppressTapUntil=0;stage.style.touchAction='pan-y';stage.addEventListener('pointerdown',e=>{if(e.target.closest('button,a'))return;swipeStart={x:e.clientX,y:e.clientY};});stage.addEventListener('pointerup',e=>{if(!swipeStart)return;const dx=e.clientX-swipeStart.x,dy=e.clientY-swipeStart.y;swipeStart=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.3){suppressTapUntil=performance.now()+400;show(page+(dx<0?1:-1));}});stage.addEventListener('pointercancel',()=>swipeStart=null);stage.addEventListener('click',()=>{if(performance.now()>suppressTapUntil)show(1);});
document.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){e.preventDefault();show(page-1)}if(e.key==='ArrowRight'||((e.key==='Enter'||e.key===' ')&&document.activeElement===stage)){e.preventDefault();show(1)}if(e.key==='Escape')location.href='insights.html'});
document.querySelector('#replay-animation').addEventListener('click',()=>show(page,true));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')show(page);else cancelAnimationFrame(frame)});
window.addEventListener('pageshow',event=>{if(event.persisted)show(page)});
document.fonts.ready.then(()=>{if(document.visibilityState==='visible')show(0)});

