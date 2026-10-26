(() => {
'use strict';
const $=selector=>document.querySelector(selector),params=new URLSearchParams(location.search),token=params.get('context');
let handoff=null,context=null,history=[],proposal=null;
const storageKey='fitlens:chat:'+(token||'general');
try{handoff=JSON.parse(sessionStorage.getItem('fitlens:chat-context:'+token));if(handoff&&['upper','lower','full'].includes(handoff.routine)&&Array.isArray(handoff.items)){context=handoff.context||null;}else handoff=null;}catch{}
const face=FitLensFace.mount($('#header-face'),{expression:'calm'});
FitLensFace.mount($('#welcome-face'),{expression:'happy'});
const routineNames={upper:'Upper Body',lower:'Lower Body',full:'Full Body'};
const guides={
 raise:['Keep a slight bend in your elbows and let your shoulders stay relaxed.','Lift out to the sides with control. Avoid swinging your torso to move the weight.','Lower slowly. Choose a load you can control throughout the movement.'],
 bench:['Set yourself securely on the bench with your feet supported.','Lower the weight with control, keeping your wrists aligned over your forearms.','Press smoothly. If you’re unsure about the setup, ask a trainer to check it in person.'],
 squat:['Stand in a position that feels stable, holding the weight close to you.','Bend at the hips and knees, keeping your feet in contact with the floor.','Stand back up with control. Use a comfortable range instead of forcing depth.'],
 pull:['Sit securely and take a comfortable grip.','Pull the handle down with control, without rocking your torso.','Let the handle return slowly rather than letting the weight pull you upward.'],
 row:['Sit tall with your feet supported.','Draw the handle toward your torso without leaning backward to move it.','Return slowly, keeping the movement controlled.'],
 press:['Start from a stable seated or standing position.','Press upward with control, avoiding a large arch in your lower back.','Lower smoothly and use a load you can manage without swinging.']
};
function save(){try{sessionStorage.setItem(storageKey,JSON.stringify({history,context,proposal}));}catch{}}
function backUrl(){if(!handoff)return 'workouts.html';const query=new URLSearchParams({routine:handoff.routine,chatReturn:token});if(handoff.singleId)query.set('session',handoff.singleId);if(handoff.from==='picker')query.set('from','picker');return 'workout-details.html?'+query;}
$('#chat-back').href=backUrl();$('#chat-back').setAttribute('aria-label',handoff?'Back to your workout':'Back to workouts');
function updateContext(){
 const exercise=context?.type==='exercise';
 $('#context-bar').hidden=!context;
 if(context){$('#context-title').textContent=context.title;$('#context-meta').textContent=exercise?`${context.workoutTitle||routineNames[handoff.routine]} · ${context.sets} sets × ${context.reps} reps`:`${handoff.items.length} exercises · Your current session`;$('#context-image').src=context.image;}
 $('#welcome-title').textContent=exercise?'Where are you getting stuck?':context?'Let’s talk about your session.':'What’s on your mind?';
 $('#welcome-description').textContent=exercise?'We can go through the movement, one step at a time.':context?'A move you’re unsure of, or a little less time today.':'A question about a move, a session, or where to begin.';
 $('#message-input').placeholder=exercise?'Ask about this move…':context?'Ask about your session…':'Ask what’s on your mind…';
 $('.privacy-note').textContent=context?'Tap the context above to see what’s included.':'No workout is attached to this conversation.';
 const starters=exercise?['Walk me through this move','What should I watch out for?','Can I change this exercise?']:context?['I only have 20 minutes','How do I choose a weight?','I’m not sure about a move']:['How do I get started?','How do I choose a weight?','Help me understand an exercise'];
 $('#starter-list').replaceChildren(...starters.map(label=>button(label,()=>send(label))));
}
function button(label,action){const node=document.createElement('button');node.type='button';node.textContent=label;node.addEventListener('click',action);return node;}
function follows(labels){$('#follow-ups').replaceChildren(...labels.map(label=>button(label,()=>send(label))));}
function renderMessage(message){
 const article=document.createElement('article');article.className='message '+message.role;
 if(message.role==='assistant'){const author=document.createElement('span');author.className='message-author';author.textContent='FitLens';article.append(author);}
 message.paragraphs.forEach(text=>{const p=document.createElement('p');p.textContent=text;article.append(p);});
 if(message.steps){const list=document.createElement('ol');message.steps.forEach(text=>{const item=document.createElement('li');item.textContent=text;list.append(item);});article.append(list);}
 if(message.safety){article.classList.add('safety-card');}
 if(message.proposal){const card=document.createElement('div');card.className='reply-card';const title=document.createElement('strong'),description=document.createElement('p');title.textContent='A shorter session';description.textContent=message.proposal.items.map(item=>`${item.name} · ${item.sets} sets`).join('\n');card.append(title,description,button('Review changes',()=>reviewProposal(message.proposal)));article.append(card);}
 $('#messages').append(article);
}
function append(role,paragraphs,extra={}){const message={role,paragraphs,...extra};history.push(message);renderMessage(message);$('#welcome').hidden=true;save();}
function scrollToLatest(){const area=$('#conversation-scroll');area.scrollTop=area.scrollHeight;}
function normalized(text){return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');}
function answer(text){
 const value=normalized(text),exercise=context?.type==='exercise'?context:null;
 const pain=/(\bpain\b|\bhurts?\b|\binjur|\bdau\b|chan thuong)/.test(value.replace(/bat dau/g,''))&&!/^(no pain|it doesn.t hurt|khong dau)[.!?\s]*$/.test(value);
 if(pain){face.set('concerned');append('assistant',['If you’re exercising, pause now. Don’t use a different exercise to push through pain.','This chat can’t assess an injury. If pain continues, get advice from a qualified health professional.'],{safety:true});follows(['Back to my workout']);return;}
 face.set('calm');
 if(value==='back to my workout'){append('assistant',[handoff?'Use the back arrow above to return to your workout. No changes have been made by this conversation.':'Use the back arrow above to return to Workouts.']);follows([]);return;}
 if(/20|shorter|less time|it thoi gian/.test(value)){
  if(handoff&&context&&handoff.items.length){proposal={items:handoff.items.slice(0,3).map(item=>({...item,sets:Math.min(2,item.sets)}))};append('assistant',['We can make the session smaller rather than rush through every exercise.','Here’s an option with up to three exercises and two sets each. Keep your breaks; the total time will depend on your pace. Nothing changes until you review and confirm.'],{proposal});follows(['Keep my session']);}
  else{append('assistant',['You can choose a shorter session without building a full week. Open a workout in Workouts, then ask from that session so we can look at the exercises together.']);follows(['How do I get started?']);}return;
 }
 if(/keep my session/.test(value)){append('assistant',['Your session stays as it is. What would you like to go over?']);follows([]);return;}
 if(/change|replace|swap|thay/.test(value)){append('assistant',['What makes you want to change it: the equipment, or the movement itself?']);follows(['I don’t have the equipment','The movement feels unfamiliar']);return;}
 if(/equipment|dung cu/.test(value)){append('assistant',['Which equipment do you have available? In this preview, I can help you review the movement, but I won’t invent a replacement or silently change your workout.']);follows(['Walk me through this move','How do I choose a weight?']);return;}
 if(/weight|load|ta nang/.test(value)){append('assistant',['Choose a load you can move with control through the planned reps. You should be able to keep the same technique from the first rep to the last.','If you need to swing or rush, try a lighter load. You don’t need to find your limit in the first set.']);follows(exercise?['Walk me through this move']:['I’m not sure about a move']);return;}
 if(/walk me|watch out|unfamiliar|technique|form|huong dan|dong tac|not sure about a move|understand an exercise/.test(value)){
  if(exercise){const steps=guides[exercise.id]||['Set up in a stable position before you begin.','Move slowly enough to stay in control, without forcing your range.','If the setup is unfamiliar, ask a trainer to show you the movement in person.'];append('assistant',[`Let’s go through ${exercise.title}.`],{steps});follows(['How do I choose a weight?','Can I change this exercise?']);}
  else{append('assistant',['Which exercise would you like to understand? Open it in your workout and tap “Ask about this exercise” to include its name, sets and reps.']);follows(['How do I choose a weight?']);}return;
 }
 if(/start|begin|bat dau/.test(value)){append('assistant',['Start in Workouts with a session you’d like to try. You can review its exercises before starting; a weekly plan is optional.','If a move is unfamiliar, open its settings and choose “Ask about this exercise”. We’ll keep the conversation tied to that move.']);follows(['How do I choose a weight?']);return;}
 append('assistant',['This preview has sample replies for exercise technique, choosing a weight and shortening a session. Try one of those questions to explore the conversation.']);follows(exercise?['Walk me through this move','How do I choose a weight?']:['How do I get started?','How do I choose a weight?']);
}
function send(text){text=text.trim();if(!text||text.length>1200)return;append('user',[text]);$('#message-input').value='';$('#message-input').style.height='42px';$('#send-message').disabled=true;follows([]);answer(text);scrollToLatest();}
$('#message-form').addEventListener('submit',event=>{event.preventDefault();send($('#message-input').value);});
$('#message-input').addEventListener('input',()=>{const input=$('#message-input');$('#send-message').disabled=!input.value.trim();input.style.height='42px';input.style.height=Math.min(132,input.scrollHeight)+'px';});
$('#message-input').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();send(event.currentTarget.value);}});
$('#clear-context').addEventListener('click',()=>{context=null;proposal=null;updateContext();follows([]);if(history.length)append('assistant',['Workout context removed. We can talk in general from here.']);save();});
$('#view-context').addEventListener('click',()=>{if(!context||!handoff)return;$('#context-explanation').textContent=context.type==='exercise'?`${context.title} · ${context.sets} sets × ${context.reps} reps. The current session is included so you can review a shorter version.`:context.title;$('#context-items').replaceChildren(...handoff.items.map(item=>{const li=document.createElement('li');li.textContent=`${item.name} · ${item.sets} sets × ${item.reps} reps`;return li;}));$('#context-dialog').showModal();});
$('#chat-menu').addEventListener('click',()=>$('#options-dialog').showModal());
document.querySelectorAll('[data-close]').forEach(node=>node.addEventListener('click',()=>node.closest('dialog').close()));
$('#new-conversation').addEventListener('click',()=>{history=[];proposal=null;face.set('calm');$('#messages').replaceChildren();$('#welcome').hidden=false;follows([]);$('#options-dialog').close();updateContext();save();$('#conversation-scroll').scrollTop=0;});
function reviewProposal(value){if(!context||!handoff){append('assistant',['That workout context has been removed. Open the session again to review changes.']);scrollToLatest();return;}proposal=value;$('#proposal-description').textContent=`${handoff.items.length} exercises → ${value.items.length} exercises. Only this session’s exercise list and set counts will change.`;$('#proposal-items').replaceChildren(...value.items.map(item=>{const li=document.createElement('li');li.textContent=`${item.name} · ${item.sets} sets × ${item.reps} reps`;return li;}));$('#proposal-dialog').showModal();}
$('#apply-proposal').addEventListener('click',()=>{if(!proposal||!context||!handoff)return;try{handoff.items=proposal.items.map(item=>({...item}));handoff.applied=true;handoff.consumed=false;handoff.editor=null;sessionStorage.setItem('fitlens:chat-context:'+token,JSON.stringify(handoff));location.href=backUrl();}catch{$('#proposal-description').textContent='Couldn’t keep these changes in this browser. Your workout has not changed.';}});
try{const saved=JSON.parse(sessionStorage.getItem(storageKey));if(saved&&Array.isArray(saved.history)){history=saved.history.filter(item=>['user','assistant'].includes(item.role)&&Array.isArray(item.paragraphs)&&item.paragraphs.every(text=>typeof text==='string'));context=handoff?saved.context:null;proposal=saved.proposal||null;}}catch{}
updateContext();history.forEach(renderMessage);$('#welcome').hidden=history.length>0;if(history.length)scrollToLatest();
})();
