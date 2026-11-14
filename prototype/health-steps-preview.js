/* Presentation-only fixture. It never reads/writes profile or health records. */
(() => {
 'use strict';
 const actual=[0,0,0,0,0,0,120,410,880,1620,2050,2200,2440,2980,3380,3520,4070,5100,5840,6240];
 const usual=[0,0,0,0,0,0,160,500,1100,1850,2280,2500,2960,3500,3920,4300,4900,5700,6400,7000,7370,7650,7850,8000,8100];
 function mount({sun,chart,comparison=usual}){
  FitLensSun.mount(sun,{steps:6240,baseline:7000,name:'example day',referenceTime:'19:00'},{compact:true});
  sun.setAttribute('aria-hidden','true');
  const x=h=>8+h/24*302,y=n=>112-n/10000*91,line=FitLensStepsChart.line;
  chart.querySelector('.health-chart-grid').innerHTML=[5000,10000].map(n=>'<line class="grid-line" x1="8" x2="310" y1="'+y(n)+'" y2="'+y(n)+'"/><text x="321" y="'+(y(n)+4)+'">'+n/1000+'k</text>').join('')+'<path class="chart-base" d="M8 112H310"/>';
  // The optional usual series is supplied only by this clearly marked fixture.
  // Omit comparison for any presentation without a meaningful computed baseline.
  const validComparison=Array.isArray(comparison)&&comparison.length===25&&comparison.every((n,i)=>Number.isFinite(n)&&n>=0&&(!i||n>=comparison[i-1]));
  const comparisonKey=chart.parentElement.querySelector('.usual-key');
  if(comparisonKey)comparisonKey.parentElement.hidden=!validComparison;
  if(!validComparison)chart.querySelector('desc').textContent='Illustrative cumulative steps reach 6,240 at 19:00. No usual-activity comparison is available.';
  chart.querySelector('.health-chart-lines').innerHTML=(validComparison?'<path class="chart-usual" d="'+line(comparison,0,19,y)+'"/><path class="chart-future" d="'+line(comparison,19,24,y)+'"/>':'')+'<path class="chart-actual" d="'+line(actual,0,19,y)+'"/>';
  chart.querySelector('.health-chart-axis').innerHTML=[0,12,24].map(h=>'<text '+(h===24?'data-time-end ':'')+'x="'+x(h)+'" y="141" text-anchor="'+(h===0?'start':h===24?'end':'middle')+'">'+String(h).padStart(2,'0')+':00</text>').join('')+'<text class="chart-now" x="'+x(19)+'" y="141" text-anchor="middle">Now</text>';
  function sizeAxisText(){
   const width=chart.getBoundingClientRect().width;
   if(width>0){
    chart.style.setProperty('--health-axis-font',(12*360/width)+'px');
    const end=chart.querySelector('[data-time-end]'),now=chart.querySelector('.chart-now');
    end.style.display='';
    if(end.getBoundingClientRect().left<now.getBoundingClientRect().right+8)end.style.display='none';
   }
  }
  new ResizeObserver(sizeAxisText).observe(chart);
  sizeAxisText();
  const active=chart.querySelector('.chart-actual'),gray=chart.querySelector('.chart-usual'),future=chart.querySelector('.chart-future');
  const scrollRoot=chart.closest('.health-content'),motion=matchMedia('(prefers-reduced-motion: reduce)');
  let phase='idle',enabled=false,animations=[],observer=null,resizeObserver=null,frame=0,generation=0;
  function setPhase(next){phase=next;chart.dataset.revealState=next;}
  function disconnect(){
   observer?.disconnect();observer=null;resizeObserver?.disconnect();resizeObserver=null;
   scrollRoot.removeEventListener('scroll',scheduleCheck);
   window.removeEventListener('resize',scheduleCheck);
   cancelAnimationFrame(frame);frame=0;
  }
  function clearEffects(){
   animations.forEach(animation=>animation.cancel());animations=[];
   for(const path of [active,gray,future].filter(Boolean)){
    for(const property of ['stroke-dasharray','stroke-dashoffset','opacity'])path.style.removeProperty(property);
   }
  }
  function complete(){
   generation++;disconnect();clearEffects();setPhase('complete');
  }
  function visibility(){
   const bounds=chart.getBoundingClientRect(),root=scrollRoot.getBoundingClientRect();
   const top=Math.max(root.top,0),bottom=Math.min(root.bottom,innerHeight);
   const height=Math.max(0,bottom-top);
   const visible=Math.max(0,Math.min(bounds.bottom,bottom)-Math.max(bounds.top,top));
   const visibleWidth=Math.max(0,Math.min(bounds.right,root.right,innerWidth)-Math.max(bounds.left,root.left,0));
   // Normal: 55% of the chart. Very short content windows: 65% of the
   // space actually available, so an oversized chart can still start.
   const required=Math.min(bounds.height*.55,height*.65);
   return {enough:height>0&&bounds.height>0&&visibleWidth>=bounds.width*.5&&visible>=required,
     opacity:Number(getComputedStyle(chart.closest('.health-preview')).opacity)*Number(getComputedStyle(chart.closest('section')).opacity)};
  }
  function startDrawing(){
   if(!enabled||phase!=='waiting')return;
   if(motion.matches){complete();return;}
   disconnect();clearEffects();setPhase('drawing');
   const token=++generation,length=active.getTotalLength();
   // Visibility is now the only start trigger. No entrance-delay can consume
   // the drawing before it is on screen; the drawing itself remains 900ms.
   animations.push(active.animate([{strokeDasharray:length+' '+length,strokeDashoffset:length},{strokeDasharray:length+' '+length,strokeDashoffset:0}],{duration:900,easing:'linear',fill:'both'}));
   for(const path of [gray,future].filter(Boolean))animations.push(path.animate([{opacity:0},{opacity:1}],{duration:400,easing:'linear',fill:'both'}));
   animations[0].finished.then(()=>{if(token===generation&&enabled)complete();}).catch(()=>{});
  }
  function check(){
   frame=0;
   if(!enabled||phase!=='waiting')return;
   if(motion.matches){complete();return;}
   const visible=visibility();
   if(visible.enough){
    if(visible.opacity>=.7)startDrawing();
    else scheduleCheck(); // Wait for the existing card/scene fade, not a timeout.
   }
  }
  function scheduleCheck(){if(enabled&&phase==='waiting'&&!frame)frame=requestAnimationFrame(check);}
  function activate({animate=true}={}){
   if(enabled)return;
   enabled=true;
   if(phase==='complete'||!animate||motion.matches){complete();return;}
   setPhase('waiting');
   active.style.strokeDasharray=active.getTotalLength()+' '+active.getTotalLength();
   active.style.strokeDashoffset=String(active.getTotalLength());
   for(const path of [gray,future].filter(Boolean))path.style.opacity='0';
   scrollRoot.addEventListener('scroll',scheduleCheck,{passive:true});
   window.addEventListener('resize',scheduleCheck);
   if(typeof IntersectionObserver==='function'){
    observer=new IntersectionObserver(scheduleCheck,{root:scrollRoot,threshold:[0,.1,.25,.5,.55,.75,1]});
    observer.observe(chart);
   }
   if(typeof ResizeObserver==='function'){
    resizeObserver=new ResizeObserver(scheduleCheck);resizeObserver.observe(scrollRoot);resizeObserver.observe(chart);
   }
   // This same geometry check is also the no-IntersectionObserver fallback.
   scheduleCheck();
  }
  function deactivate(){
   enabled=false;
   if(phase==='waiting'||phase==='drawing')complete();
   else{generation++;disconnect();clearEffects();}
  }
  motion.addEventListener?.('change',()=>{if(enabled&&motion.matches)complete();});
  setPhase('idle');
  return {activate,deactivate,get hasRevealed(){return phase==='drawing'||phase==='complete';}};

 }
 window.FitLensHealthStepsPreview={mount};
})();
