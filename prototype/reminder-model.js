/* One reminder per weekday, shared by free reminders and weekly plans. */
(function(root){
'use strict';
const key='fitlens:reminders:v2';
const validTime=value=>typeof value==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(value);
function normalize(raw){return Array.from({length:7},(_,i)=>{const item=Array.isArray(raw)?raw[i]:null;return item&&validTime(item.time)?{time:item.time,enabled:item.enabled===true,before:[0,15,30].includes(item.before)?item.before:0}:null;});}
function read(storage){try{const current=storage.getItem(key);if(current!==null)return normalize(JSON.parse(current));const old=JSON.parse(storage.getItem('fitlens-reminder-v1'));if(old&&validTime(old.time)&&Array.isArray(old.days))return normalize(Array.from({length:7},(_,i)=>old.days.includes(i)?{time:old.time,enabled:old.enabled===true,before:0}:null));}catch{}return normalize(null);}
function write(storage,items){storage.setItem(key,JSON.stringify(normalize(items)));}
function notificationTime(item,day){const minutes=Number(item.time.slice(0,2))*60+Number(item.time.slice(3))-item.before;return {day:(day+(minutes<0?-1:0)+7)%7,time:String(Math.floor((minutes+1440)%1440/60)).padStart(2,'0')+':'+String((minutes+1440)%60).padStart(2,'0')};}
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
function timing(value){return value&&validTime(value.time)?{time:value.time,enabled:value.enabled===true,before:[0,15,30].includes(value.before)?value.before:0}:null;}
function today(now=new Date()){const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));return `${p.year}-${p.month}-${p.day}`;}
function dayDate(week,day){const d=new Date(week+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+day);return d.toISOString().slice(0,10);}
function notificationDate(date,item){const value=timing(item);if(!validDate(date)||!value)return null;const d=new Date(date+'T00:00:00Z');d.setUTCMinutes(Number(value.time.slice(0,2))*60+Number(value.time.slice(3))-value.before);return {date:d.toISOString().slice(0,10),time:d.toISOString().slice(11,16)};}
const singlesKey='fitlens:single-sessions:v1';
function singles(storage){try{const data=JSON.parse(storage.getItem(singlesKey));if(!Array.isArray(data))return [];return data.filter(s=>s&&typeof s.id==='string'&&typeof s.name==='string').map(s=>({...s,name:s.name.slice(0,80),items:Array.isArray(s.items)?s.items:[],schedule:s.schedule&&validDate(s.schedule.date)&&timing(s.schedule)?{date:s.schedule.date,...timing(s.schedule)}:null}));}catch{return [];}}
function saveSingle(storage,session){if(!session||typeof session.id!=='string'||typeof session.name!=='string')throw new Error('Invalid session');if(session.schedule&&(!validDate(session.schedule.date)||!timing(session.schedule)))throw new Error('Invalid session date or time');const all=singles(storage),i=all.findIndex(s=>s.id===session.id);if(i<0)all.push(session);else all[i]=session;storage.setItem(singlesKey,JSON.stringify(all));return session;}
function createSingle(name,items=[],routine=null){return {id:'single-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),name:String(name).trim().slice(0,80)||'My workout',items,routine:['upper','lower','full'].includes(routine)?routine:null,schedule:null};}
const api={normalize,read,write,validTime,notificationTime,timing,validDate,today,dayDate,notificationDate,singles,saveSingle,createSingle};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FitLensReminders=api;
})(typeof window!=='undefined'?window:globalThis);
