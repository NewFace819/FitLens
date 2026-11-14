/* Local weekly consistency model. Rest protects a week; it never impersonates a workout. */
(function(root){'use strict';
const KEY='fitlens:rhythm:v1',DAY=86400000;
function date(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function shift(s,n){const d=new Date(s+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
function monday(s=date()){const d=new Date(s+'T12:00:00Z');return shift(s,-((d.getUTCDay()+6)%7));}
function empty(){return {version:1,goals:[],sessions:[],breaks:[]};}
function valid(s){return s&&s.version===1&&Array.isArray(s.goals)&&Array.isArray(s.sessions)&&Array.isArray(s.breaks);}
let memory=null,storageFailed=false;
function read(){if(storageFailed)return memory||empty();try{const s=JSON.parse(localStorage.getItem(KEY));if(valid(s)){memory=s;return s;}}catch{storageFailed=true;}return memory||empty();}
function write(s){memory=s;try{localStorage.setItem(KEY,JSON.stringify(s));storageFailed=false;return true;}catch{storageFailed=true;return false;}}
function goalAt(s,w){return [...s.goals].filter(g=>g.week<=w&&[2,3,4,5].includes(g.target)).sort((a,b)=>a.week.localeCompare(b.week)).at(-1)?.target||0;}
function setGoal(target,next=false,today=date()){if(![2,3,4,5].includes(target))return false;const s=read(),w=shift(monday(today),next?7:0);s.goals=s.goals.filter(g=>g.week!==w);s.goals.push({week:w,target});return write(s);}
function pause(today=date()){const s=read();if(!s.breaks.some(b=>!b.end))s.breaks.push({start:today,end:null});return write(s);}
function resume(today=date()){const s=read();s.breaks.forEach(b=>{if(!b.end)b.end=today;});return write(s);}
function record(event){if(!event||typeof event.id!=='string'||!event.id||!['workout','walk'].includes(event.kind))return false;const s=read();if(s.sessions.some(e=>e.id===event.id))return true;s.sessions.push({id:event.id,kind:event.kind,name:String(event.name||'Workout').slice(0,80),date:event.date||date()});return write(s);}
function weeks(s,today=date()){const current=monday(today),first=[...s.goals].sort((a,b)=>a.week.localeCompare(b.week))[0]?.week;if(!first||first>current)return[];const out=[];for(let w=first,n=0;w<=current&&n<520;w=shift(w,7),n++){const target=goalAt(s,w);if(!target)continue;const end=shift(w,6),sessions=s.sessions.filter(e=>e.date>=w&&e.date<=end),rest=s.breaks.some(b=>b.start<=end&&(!b.end||b.end>=w));out.push({week:w,end,target,sessions,status:sessions.length>=target?'complete':rest?'paused':w===current?'current':'missed'});}return out;}
function summary(s=read(),today=date()){const list=weeks(s,today);let streak=0,best=0;for(const w of list){if(w.status==='complete'){streak++;best=Math.max(best,streak);}else if(w.status==='missed')streak=0;}const current=list.at(-1)?.week===monday(today)?list.at(-1):null;return {state:s,weeks:list,current,streak,best,totalWeeks:list.filter(w=>w.status==='complete').length,totalSessions:s.sessions.length,onBreak:s.breaks.some(b=>!b.end),scheduled:s.goals.find(g=>g.week>monday(today))||null};}
function fixture(mode,today=date()){const s=empty(),w=monday(today);if(mode==='new')return s;s.goals.push({week:shift(w,-42),target:3});for(let i=6;i>=1;i--){if(mode==='comeback'&&i===1)continue;for(let j=0;j<3;j++)s.sessions.push({id:`demo-${i}-${j}`,date:shift(w,-i*7+[0,2,4][j]),name:['Upper body','A gentle full body','Lower body'][j],kind:'workout'});}const count=mode==='complete'?3:mode==='recovery'||mode==='comeback'?1:2;for(let j=0;j<count;j++)s.sessions.push({id:`demo-now-${j}`,date:shift(w,[0,1,2][j]),name:['Upper body','A gentle full body','Lower body'][j],kind:'workout'});if(mode==='recovery')s.breaks.push({start:shift(w,1),end:null});return s;}
const api={KEY,date,shift,monday,empty,read,write,goalAt,setGoal,pause,resume,record,weeks,summary,fixture};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FitLensRhythm=api;
})(typeof window!=='undefined'?window:globalThis);
