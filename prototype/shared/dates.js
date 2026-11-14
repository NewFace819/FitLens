/* Date helpers. Dates are 'YYYY-MM-DD' in the app time zone, times are 'HH:mm'. Weeks start on Monday. */
(function(root){
'use strict';
const TZ='Asia/Ho_Chi_Minh';
const DATE_RE=/^\d{4}-\d{2}-\d{2}$/,TIME_RE=/^([01]\d|2[0-3]):[0-5]\d$/;
function isValidDate(v){return typeof v==='string'&&DATE_RE.test(v)&&!Number.isNaN(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;}
function isValidTime(v){return typeof v==='string'&&TIME_RE.test(v);}
function todayStr(now=new Date()){const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));return p.year+'-'+p.month+'-'+p.day;}
function addDays(date,n){if(!isValidDate(date))return null;const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
function weekStartOf(date){if(!isValidDate(date))return null;const d=new Date(date+'T12:00:00Z');return addDays(date,-((d.getUTCDay()+6)%7));}
function weekDates(weekStart){const s=isValidDate(weekStart)?weekStartOf(weekStart):null;return s?Array.from({length:7},(_,i)=>addDays(s,i)):[];}
function compare(a,b){return a<b?-1:a>b?1:0;}
const api={TIME_ZONE:TZ,isValidDate,isValidTime,todayStr,addDays,weekStartOf,weekDates,compare};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FitLensDates=api;
})(typeof window!=='undefined'?window:globalThis);
