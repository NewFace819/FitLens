/* Notification text and a future local-request plan. No delivery or persistence. */
(function(root){
 'use strict';
 const cleanName=value=>String(value||'').trim().slice(0,40);
 function content({preferredName='',timeLabel,workoutId=null,example=false}){
  const name=cleanName(preferredName);
  return {type:'workout-reminder',title:'A little time for yourself'+(name?', '+name:'')+'?',body:'Your scheduled workout begins at '+timeLabel+'.',destination:'scheduled-workout',workoutId,example};
 }
 function example(preferredName){return content({preferredName,timeLabel:'6:30 PM',example:true});}
 function buildWorkoutRequest(session,{preferredName='',timeZone,now=new Date()}={}){
  if(!session||!session.id||session.status!=='planned'||session.reminder?.enabled!==true||session.example===true)throw new Error('A real planned workout with reminder opt-in is required.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(session.date||'')||!/^([01]\d|2[0-3]):[0-5]\d$/.test(session.time||''))throw new Error('A workout date and time are required.');
  const date=new Date(session.date+'T'+session.time+':00Z');
  if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==session.date)throw new Error('Invalid workout date.');
  if(typeof timeZone!=='string'||!timeZone)throw new Error('An explicit IANA time zone is required.');
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
  const before=[0,15,30].includes(session.reminder.before)?session.reminder.before:0;
  const trigger=new Date(date.getTime()-before*60000),localTrigger=trigger.toISOString().slice(0,16);
  if(localTrigger<=parts.year+'-'+parts.month+'-'+parts.day+'T'+parts.hour+':'+parts.minute)throw new Error('The reminder must be in the future.');
  const timeLabel=new Intl.DateTimeFormat('en',{timeZone:'UTC',hour:'numeric',minute:'2-digit',hour12:true}).format(date);
  return {identifier:'fitlens.workout.'+encodeURIComponent(String(session.id)),content:{...content({preferredName,timeLabel,workoutId:session.id}),categoryIdentifier:'WORKOUT_REMINDER',threadIdentifier:'workout-reminders'},trigger:{kind:'calendar',timeZone,repeats:false,components:{year:trigger.getUTCFullYear(),month:trigger.getUTCMonth()+1,day:trigger.getUTCDate(),hour:trigger.getUTCHours(),minute:trigger.getUTCMinutes()}},delivery:{interruptionLevel:'active',badge:null,sound:'if-authorized'}};
 }
 function render(card,model){
  card.querySelector('.notification-card-title').textContent=model.title;
  card.querySelector('.notification-card-body').textContent=model.body;
 }
 const api={content,example,buildWorkoutRequest,render};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FitLensNotificationPreview=api;
})(typeof window!=='undefined'?window:globalThis);
