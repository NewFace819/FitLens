/* Deterministic demo history. Never written to FitLensTraining or browser storage. */
(function(root){'use strict';
const anchor='2026-10-28',upper=['bench','pull','row','raise','cable'],lower=['squat','rdl','curl','calf','deadbug'],full=['squat','bench','pull','press','bridge','bandcurl'];
function record(date,index,total=null){const ids=[upper,lower,full][index%3],counts=ids.map((_,i)=>total==null?2+(index+i)%2:Math.floor(total/ids.length)+(i<total%ids.length?1:0));return {id:'demo-focus-'+date,date,name:['Upper body','Lower body','Full body'][index%3],source:'illustrative',items:ids.map((id,i)=>({id,sets:counts[i]})),logs:ids.map((id,i)=>Array.from({length:counts[i]},()=>({done:true,reps:10,weight:['deadbug','bridge'].includes(id)?0:10}))),seconds:1800};}
const records=[];let index=0;for(let date='2025-01-01';date<=anchor;){const day=new Date(date+'T12:00:00Z');if([1,3,5].includes(day.getUTCDay())&&!date.startsWith('2026-09'))records.push(record(date,index++));day.setUTCDate(day.getUTCDate()+1);date=day.toISOString().slice(0,10);}
// Match the existing September recap's twelve illustrative session/set totals.
for(const [day,sets]of [[2,12],[4,18],[6,16],[9,14],[11,20],[13,16],[16,18],[18,14],[20,22],[23,16],[25,20],[28,18]])records.push(record('2026-09-'+String(day).padStart(2,'0'),index++,sets));
records.sort((a,b)=>a.date.localeCompare(b.date));const api={anchor,records};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FitLensFocusDemo=api;
})(typeof window!=='undefined'?window:globalThis);
