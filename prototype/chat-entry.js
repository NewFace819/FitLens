/* Context handoff stays in this tab and includes only the visible workout. */
(() => {
'use strict';
function entry(title,description){const link=document.createElement('a');link.href='chat.html';link.className='fitlens-chat-entry';const face=document.createElement('span');face.className='chat-entry-face';face.setAttribute('aria-hidden','true');face.innerHTML='<svg viewBox="0 0 40 32"><circle cx="11" cy="10" r="1.5"/><circle cx="29" cy="12" r="1.5"/><path d="M12 20q8 9 16 0"/></svg>';const copy=document.createElement('span'),strong=document.createElement('strong'),note=document.createElement('span');strong.textContent=title;note.textContent=description;copy.append(strong,note);link.append(face,copy);return link;}
if(document.querySelector('.workouts-phone')){const link=entry('Ask FitLens','Exercises, technique, or your next session');document.querySelector('.schedule-section').after(link);return;}
if(!document.querySelector('.details-phone'))return;
let returning=null;
try{const token=new URLSearchParams(location.search).get('chatReturn');const data=JSON.parse(sessionStorage.getItem('fitlens:chat-context:'+token));if(data&&!data.consumed&&data.routine===key&&data.singleId===(storedSession?.id||null)&&Array.isArray(data.items))returning=data;}catch{}
if(returning){items=returning.items.filter(item=>catalog[item.id]).map(item=>({...catalog[item.id],...item}));render();if(returning.applied)document.querySelector('#duration').textContent='Adjusted session · Your pace';try{sessionStorage.setItem('fitlens:chat-context:'+new URLSearchParams(location.search).get('chatReturn'),JSON.stringify({...returning,consumed:true}));}catch{}}
const workoutLink=entry('Ask about this workout','Bring this session into the conversation');document.querySelector('.equipment-note').after(workoutLink);
const exerciseLink=entry('Ask about this exercise','Technique, equipment, or where to start');document.querySelector('#exercise-form').after(exerciseLink);
function connect(link,exercise){link.addEventListener('click',event=>{
 const item=exercise?items[selected]:null;if(exercise&&!item){event.preventDefault();return;}
 const title=storedSession?.name||{upper:'Upper Body',lower:'Lower Body',full:'Full Body'}[key];
 const editor=exercise?{index:selected,fields:Object.fromEntries(['sets','reps','rest'].map(field=>[field,document.querySelector('#exercise-form').elements[field].value]))}:null;
 const context=item?{type:'exercise',workoutTitle:title,id:item.id,title:item.name,sets:item.sets,reps:item.reps,image:exerciseImage(item)}:{type:'workout',title,image:'assets/illustrations/'+key+'.svg'};
 const snapshot={routine:key,singleId:storedSession?.id||null,items:items.map(item=>({...item})),context,editor,scrollTop:document.querySelector('.details-scroll').scrollTop,from:new URLSearchParams(location.search).get('from'),returnUrl:location.pathname+location.search};
 try{const token='chat-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);sessionStorage.setItem('fitlens:chat-context:'+token,JSON.stringify(snapshot));link.href='chat.html?context='+encodeURIComponent(token);}catch{event.preventDefault();announce('Couldn’t open the conversation with your workout. Please try again.');}
});}
connect(workoutLink,false);connect(exerciseLink,true);
if(returning)requestAnimationFrame(()=>{document.querySelector('.details-scroll').scrollTop=Number(returning.scrollTop)||0;if(returning.editor&&!returning.applied&&items[returning.editor.index]){editExercise(returning.editor.index);for(const field of ['sets','reps','rest'])document.querySelector('#exercise-form').elements[field].value=returning.editor.fields[field];}if(returning.applied)announce('Shorter session applied. Your training date and reminder are unchanged.');});
})();
