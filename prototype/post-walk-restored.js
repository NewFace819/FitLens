(() => {
'use strict';
const $ = s => document.querySelector(s);
const phone = $('.postwalk-phone');
const totalDistance = 4.85, totalSeconds = 3080, totalSteps = 6420;
const splits = [
 { start:0, end:1, seconds:665, name:'Kilometer 1' },
 { start:1, end:2, seconds:632, name:'Kilometer 2' },
 { start:2, end:3, seconds:615, name:'Kilometer 3' },
 { start:3, end:4, seconds:648, name:'Kilometer 4' },
 { start:4, end:4.85, seconds:520, name:'Final 0.85 km' }
];
const samples = [
 {d:0,x:64,y:180,e:14,h:83}, {d:.5,x:54,y:143,e:13,h:87},
 {d:1,x:70,y:100,e:12.5,h:90}, {d:1.2,x:82,y:83,e:12,h:92},
 {d:2,x:165,y:48,e:16,h:94}, {d:2.6,x:232,y:62,e:25,h:98},
 {d:3,x:276,y:105,e:38,h:105}, {d:3.4,x:276,y:146,e:46,h:114},
 {d:3.8,x:240,y:177,e:36,h:103}, {d:4,x:190,y:190,e:29,h:97},
 {d:4.4,x:120,y:190,e:20,h:92}, {d:4.85,x:68,y:178,e:15,h:87}
];
const formatTime = seconds => { const s = Math.round(seconds); return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`; };
const paceFor = split => split.seconds / (split.end-split.start);
const splitAt = d => splits.find(s=>d<=s.end) || splits.at(-1);
function elapsedAt(d) { let seconds=0; for(const s of splits) { if(d>=s.end) seconds+=s.seconds; else {seconds+=Math.max(0,d-s.start)/(s.end-s.start)*s.seconds;break;} } return seconds; }
function pointAt(d) {
 const end = samples.findIndex(p=>p.d>=d), b=samples[end<0?samples.length-1:end], a=samples[Math.max(0,end-1)];
 const t=a===b?0:(d-a.d)/(b.d-a.d), result={d};
 for(const key of ['x','y','e','h']) result[key]=a[key]+(b[key]-a[key])*t;
 return result;
}
const averageHeart = Math.round(samples.slice(1).reduce((sum,p,i)=>sum+(p.h+samples[i].h)/2*(elapsedAt(p.d)-elapsedAt(samples[i].d)),0)/totalSeconds);
const elevationGain = Math.round(samples.slice(1).reduce((sum,p,i)=>sum+Math.max(0,p.e-samples[i].e),0));
const routePath=samples.map((p,i)=>`${i?'L':'M'}${p.x},${p.y}`).join(' ');
$('#walk-route-line').setAttribute('d',routePath);
$('#average-pace').textContent=formatTime(totalSeconds/totalDistance);
let activeChart='pace', selectedDistance=0, hasExplored=false;
const chartConfig={
 pace:{title:'Pace',min:600,max:680,color:'#5a8768',value:()=>formatTime(totalSeconds/totalDistance),unit:'min/km average',note:'Average pace for each kilometer',source:'GPS · sample',get:p=>paceFor(splitAt(p.d)),format:v=>formatTime(v)},
 elevation:{title:'Elevation',min:10,max:50,color:'#b68851',value:()=>elevationGain,unit:'m climbed',note:'12 m lowest · 46 m highest',source:'Altitude · sample',get:p=>p.e,format:v=>`${Math.round(v)} m`},
 heart:{title:'Heart rate',min:80,max:120,color:'#bd8078',value:()=>averageHeart,unit:'bpm average',note:'114 bpm peak',source:'Apple Watch · sample',get:p=>p.h,format:v=>`${Math.round(v)}`}
};
const sx=d=>40+d/totalDistance*278;
const sy=v=> {const c=chartConfig[activeChart],ratio=(v-c.min)/(c.max-c.min);return activeChart==='pace'?21+ratio*119:140-ratio*119;};
const ns='http://www.w3.org/2000/svg';
function svgEl(tag,attrs,text) {const n=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;return n;}
function renderChart(){
 const c=chartConfig[activeChart];
 $('#chart-number').textContent=c.value();$('#chart-unit').textContent=c.unit;$('#chart-comparison').textContent=c.note;$('#chart-source').textContent=c.source;
 $('#walk-chart-panel').setAttribute('aria-labelledby',`tab-${activeChart}`);$('#walk-chart').setAttribute('aria-label',`${c.title} over 4.85 kilometers. ${c.value()} ${c.unit}. Use the route slider to explore.`);
 $('#chart-grid').replaceChildren();
 for(const v of [c.min,(c.min+c.max)/2,c.max]){const y=sy(v);$('#chart-grid').append(svgEl('line',{x1:40,x2:318,y1:y,y2:y,stroke:'#dde2d5','stroke-dasharray':'3 4'}),svgEl('text',{x:34,y:y+4,'text-anchor':'end'},c.format(v)));}
 for(const d of [0,2.5,4.85]) $('#chart-grid').append(svgEl('text',{x:sx(d),y:167,'text-anchor':d===0?'start':d===4.85?'end':'middle'},`${d} km`));
 const chartPoints=activeChart==='pace'?splits.flatMap(s=>[{d:s.start,v:paceFor(s)},{d:s.end,v:paceFor(s)}]):samples.map(p=>({d:p.d,v:c.get(p)}));
 const line=chartPoints.map((p,i)=>`${i?'L':'M'}${sx(p.d)},${sy(p.v)}`).join(' ');
 $('#chart-line').setAttribute('d',line);$('#chart-line').setAttribute('stroke',c.color);$('#chart-fill-start').setAttribute('stop-color',c.color);
 $('#chart-area').setAttribute('d',`${line} L318,145 L40,145 Z`);
 updateSelection(false);
}
function updateSelection(announce=true){
 const d=selectedDistance,p=pointAt(d),split=splitAt(d),index=splits.indexOf(split),c=chartConfig[activeChart];
 $('#route-distance').value=d;$('#distance-output').value=`${d.toFixed(2)} km`;
 $('#route-distance').setAttribute('aria-valuetext',`${d.toFixed(2)} kilometers, ${Math.round(p.e)} meters elevation, ${Math.round(p.h)} beats per minute`);
 $('#route-cursor').setAttribute('visibility',hasExplored?'visible':'hidden');$('#route-cursor').setAttribute('transform',`translate(${p.x},${p.y})`);
 $('#chart-cursor').setAttribute('visibility',hasExplored?'visible':'hidden');$('#chart-cursor-line').setAttribute('x1',sx(d));$('#chart-cursor-line').setAttribute('x2',sx(d));$('#chart-cursor-dot').setAttribute('cx',sx(d));$('#chart-cursor-dot').setAttribute('cy',sy(c.get(p)));
 document.querySelectorAll('[data-split]').forEach(el=>{const selected=hasExplored&&Number(el.dataset.split)===index;el.classList.toggle('selected',selected);el.setAttribute('aria-pressed',String(selected));});
 if(hasExplored){$('#route-title').textContent=`${split.name} · ${formatTime(paceFor(split))} /km`;$('#route-detail').textContent=`${d.toFixed(2)} km into your loop · ${Math.round(p.e)} m elevation`;$('#point-description').textContent=`${d.toFixed(2)} km · ${Math.round(p.e)} m elevation · ${Math.round(p.h)} bpm`;} 
 if(announce&&hasExplored) $('#walk-announcement').textContent=`${split.name}, ${d.toFixed(2)} kilometers selected.`;
}
function selectDistance(d,announce=true){selectedDistance=Math.max(0,Math.min(totalDistance,d));hasExplored=true;updateSelection(announce);}
for(let i=0;i<splits.length;i++){
 const split=splits[i];
 const button=document.createElement('button');button.type='button';button.className='walk-split'+(i===2?' fastest':'');button.dataset.split=i;button.setAttribute('aria-pressed','false');button.setAttribute('aria-label',`${split.name}, ${formatTime(paceFor(split))} per kilometer, ${formatTime(split.seconds)} duration`);
 for(const text of [i===4?'Last 0.85':`Km ${i+1}`,formatTime(paceFor(split)),formatTime(split.seconds)]){const span=document.createElement('span');span.textContent=text;button.append(span);}
 button.addEventListener('click',()=>selectDistance(split.end));$('#walk-splits').append(button);
 if(i<4){const p=pointAt(split.end), marker=document.createElement('button');marker.type='button';marker.className='route-marker';marker.dataset.split=i;marker.style.left=`${p.x/340*100}%`;marker.style.top=`${p.y/240*100}%`;marker.setAttribute('aria-label',`Explore kilometer ${i+1}, ${formatTime(paceFor(split))} per kilometer`);marker.setAttribute('aria-pressed','false');const n=document.createElement('span');n.textContent=i+1;marker.append(n);marker.addEventListener('click',()=>selectDistance(split.end));$('#route-markers').append(marker);}
}
const splitNote=document.createElement('p');splitNote.className='split-note';splitNote.textContent='Quickest full kilometer: Km 3 · 10:15 /km';$('#walk-splits').append(splitNote);
const tabs=[...document.querySelectorAll('[data-chart]')];
function activateTab(tab,focus=false){activeChart=tab.dataset.chart;tabs.forEach(b=>{b.setAttribute('aria-selected',String(b===tab));b.tabIndex=b===tab?0:-1;});renderChart();if(focus)tab.focus({preventScroll:true});}
tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>activateTab(tab));tab.addEventListener('keydown',event=>{let next;if(event.key==='ArrowRight')next=(index+1)%tabs.length;if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;if(event.key==='Home')next=0;if(event.key==='End')next=tabs.length-1;if(next!==undefined){event.preventDefault();activateTab(tabs[next],true);}});});
$('#route-distance').addEventListener('input',event=>selectDistance(Number(event.target.value),false));
$('#route-distance').addEventListener('change',()=>updateSelection(true));
$('#walk-chart').addEventListener('click',event=>{const rect=$('#walk-chart').getBoundingClientRect(),x=(event.clientX-rect.left)/rect.width*340;selectDistance((x-40)/278*totalDistance);});
// Keep the face expressive in this explicitly animated design preview.
const faces={
 tired:{caption:'Some days take a little more out of you.',color:'#e8bf9b',edge:'#f1dfc1',left:'M37 43Q47 48 57 43',right:'M162 47Q172 52 182 47',mouth:'M76 99 C87 88 99 83 111 83 C123 83 136 89 145 100 C133 100 121 94 111 94 C100 94 88 99 76 99Z'},
 okay:{caption:'A little movement counts, too.',color:'#c5d5bb',edge:'#e0e8cf',left:'M46 43Q47 45 48 43',right:'M171 47Q172 49 173 47',mouth:'M73 86 C85 87 99 88 110 88 C122 88 136 87 147 86 C138 91 123 94 110 94 C97 94 82 91 73 86Z'},
 good:{caption:'A good moment to carry into your day.',color:'#a8c5ce',edge:'#d9e6db',left:'M37 43Q47 54 57 43',right:'M162 47Q172 58 182 47',mouth:'M65 76 C78 78 93 87 110 88 C128 88 143 79 155 75 C151 97 133 109 111 109 C89 109 70 96 65 76Z'},
 energized:{caption:'A little spring in your next step.',color:'#e3cc7d',edge:'#e1e8bc',left:'M46 43Q47 45 48 43',right:'M171 47Q172 49 173 47',mouth:'M65 76 C76 64 89 76 108 77 C129 79 145 65 155 75 C165 91 144 114 113 113 C85 113 61 94 65 76Z'}
};
let feeling=null,faceFrame=0;
const feelings=[...document.querySelectorAll('[data-feeling]')];
function morphFace(face){
 cancelAnimationFrame(faceFrame);
 const targets=[['#walk-eye-left',face.left],['#walk-eye-right',face.right],['#walk-mouth',face.mouth],['#walk-mouth-mask',face.mouth]].map(([selector,to])=>({el:$(selector),to,from:$(selector).getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number)}));
 const started=performance.now();
 function tick(now){const t=Math.min(1,(now-started)/520),eased=1-Math.pow(1-t,3);for(const target of targets){let i=0;target.el.setAttribute('d',target.to.replace(/-?\d+(?:\.\d+)?/g,value=>{const index=i++;return(target.from[index]+(Number(value)-target.from[index])*eased).toFixed(2);}));}if(t<1)faceFrame=requestAnimationFrame(tick);}
 faceFrame=requestAnimationFrame(tick);
}
function selectFeeling(button,focus=false){feeling=button.dataset.feeling;const face=faces[feeling];feelings.forEach(b=>{b.setAttribute('aria-checked',String(b===button));b.tabIndex=b===button?0:-1;});$('#feeling-caption').textContent=face.caption;$('#walk-face-title').textContent=`FitLens is feeling ${feeling}`;$('#feeling-art').style.setProperty('--feeling-core',face.color);$('#feeling-art').style.setProperty('--feeling-edge',face.edge);morphFace(face);if(focus)button.focus({preventScroll:true});}
feelings.forEach((button,index)=>{button.addEventListener('click',()=>selectFeeling(button));button.addEventListener('keydown',event=>{let next;if(['ArrowRight','ArrowDown'].includes(event.key))next=(index+1)%feelings.length;if(['ArrowLeft','ArrowUp'].includes(event.key))next=(index+feelings.length-1)%feelings.length;if(next!==undefined){event.preventDefault();selectFeeling(feelings[next],true);}});});
const bodyAreas=new Set();
for(const area of ['Feet','Ankles','Knees','Hips','Back','Other']){const b=document.createElement('button');b.type='button';b.textContent=area;b.setAttribute('aria-pressed','false');b.addEventListener('click',()=>{bodyAreas.has(area)?bodyAreas.delete(area):bodyAreas.add(area);b.setAttribute('aria-pressed',String(bodyAreas.has(area)));});$('#area-choices').append(b);}
$('#add-discomfort').addEventListener('click',()=>{const open=$('#walk-discomfort').hidden;$('#walk-discomfort').hidden=!open;$('#add-discomfort').setAttribute('aria-expanded',String(open));});
$('#clear-body-note').addEventListener('click',()=>{bodyAreas.clear();$('#body-note').value='';$('#area-choices').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed','false'));$('#walk-discomfort').hidden=true;$('#add-discomfort').setAttribute('aria-expanded','false');$('#add-discomfort').focus({preventScroll:true});});
$('#walk-note').addEventListener('input',()=>{const note=$('#walk-note').value.trim();$('#journal-summary').textContent=note?note.slice(0,70)+(note.length>70?'…':''):'A thought for next time';});
// Phone-contained sheets with background inertness and keyboard focus containment.
let activeSheet=null,sheetOpener=null;const inertBefore=new Map();
function openSheet(sheet){if(activeSheet)return;sheetOpener=document.activeElement;activeSheet=sheet;for(const child of phone.children){if(child===sheet||child.id==='walk-sheet-backdrop')continue;inertBefore.set(child,child.inert);child.inert=true;}$('#walk-sheet-backdrop').hidden=false;sheet.hidden=false;const scroll=sheet.querySelector('.sheet-scroll');if(scroll)scroll.scrollTop=0;sheet.focus({preventScroll:true});}
function closeSheet(){if(!activeSheet)return;activeSheet.hidden=true;$('#walk-sheet-backdrop').hidden=true;for(const[child,value]of inertBefore)child.inert=value;inertBefore.clear();activeSheet=null;sheetOpener?.focus({preventScroll:true});}
$('#walk-sheet-backdrop').addEventListener('click',closeSheet);document.querySelectorAll('[data-close-sheet]').forEach(b=>b.addEventListener('click',closeSheet));
for(const sheet of document.querySelectorAll('.walk-sheet'))sheet.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();closeSheet();}if(event.key!=='Tab')return;const els=[...sheet.querySelectorAll('button:not([disabled]),a[href],input,textarea:not([hidden])')],first=els[0],last=els.at(-1);if(event.shiftKey&&(document.activeElement===first||document.activeElement===sheet)){event.preventDefault();last.focus();}else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===sheet)){event.preventDefault();first.focus();}});
const shareRoute=$('#route-svg').cloneNode(true);shareRoute.removeAttribute('id');shareRoute.querySelector('#route-cursor')?.remove();shareRoute.querySelectorAll('[id]').forEach(n=>{const old=n.id;n.id=`share-${old}`;if(old==='lake-fill')shareRoute.querySelector('[fill="url(#lake-fill)"]').setAttribute('fill','url(#share-lake-fill)');});$('#share-route-art').append(shareRoute);
$('#open-share-btn').addEventListener('click',()=>{$('#share-action-status').textContent='';openSheet($('#share-sheet'));});
$('#copy-walk-summary').addEventListener('click',async()=>{const text='FitLens · Morning Lake Loop · 4.85 km · 51:20 · 6,420 steps · 10:35 /km (sample walk)';try{if(!navigator.clipboard)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText(text);$('#share-action-status').textContent='Walk summary copied.';}catch{let fallback=$('#share-copy-fallback');if(!fallback){fallback=document.createElement('textarea');fallback.id='share-copy-fallback';fallback.readOnly=true;fallback.setAttribute('aria-label','Walk summary to copy');$('.sheet-scroll').append(fallback);}fallback.value=text;fallback.focus();fallback.select();$('#share-action-status').textContent='Copy isn’t available here. Select and copy the summary below.';}});
$('#download-walk-art').addEventListener('click',()=>{
 const art=`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800"><rect width="600" height="800" rx="36" fill="#203e33"/><path d="M430-80L680 20V620L380 570Z" fill="#526c52" opacity=".3"/><g font-family="Arial,sans-serif" fill="#faf4df"><text x="44" y="65" font-size="20" letter-spacing="4">FITLENS</text><text x="44" y="128" font-size="34" font-weight="bold">Morning Lake Loop</text><svg x="42" y="164" width="516" height="340" viewBox="0 0 340 240"><path d="M88 83C110 63 143 67 178 74C219 80 243 108 227 139C208 172 171 178 129 167C92 162 74 137 77 111Q76 93 88 83Z" fill="#294f43"/><path d="${routePath}" fill="none" stroke="#c8dc99" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/><circle cx="64" cy="180" r="6" fill="#faf7e8"/><text x="170" y="122" text-anchor="middle" fill="#8ab1a1" font-size="13" letter-spacing="2">THE LAKE</text></svg><text x="44" y="585" font-size="88" font-weight="bold">4.85<tspan font-size="32" fill="#bdcfa8"> km</tspan></text><text x="44" y="635" font-size="24" fill="#d1ddc3">51:20 outside · 6,420 steps</text><path d="M44 680H556" stroke="#66835c"/><text x="44" y="720" font-size="22" fill="#bbd0a9">A little fresh air goes a long way.</text><text x="44" y="765" font-size="15" fill="#99b28e">Sample walk · illustrated route</text></g></svg>`;
 const url=URL.createObjectURL(new Blob([art],{type:'image/svg+xml'})),a=document.createElement('a');a.href=url;a.download='fitlens-morning-walk.svg';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);$('#share-action-status').textContent='Share card download started (SVG).';
});
$('#save-walk-btn').addEventListener('click',()=>{const notes=bodyAreas.size||$('#body-note').value.trim(),journal=$('#walk-note').value.trim();if(feeling||notes){try{sessionStorage.setItem('fitlens:last-check-in',JSON.stringify({kind:'walk',expression:notes?'concerned':feeling,at:Date.now()}));}catch{}}$('#finish-description').textContent=`4.85 km · 51:20 outside.${feeling?` You felt ${feeling}.`:''}${notes?' Body note included.':''}${journal?' Your reflection is included.':''}`;openSheet($('#finish-sheet'));});
renderChart();
})();
