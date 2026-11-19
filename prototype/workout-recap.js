/* Completed logs drive the recap. Unlinked previews are explicitly illustrative. */
'use strict';
const musclePreviewItems=session.exercises.map(name=>({id:FitLensMuscles.names[name]||name,name,sets:3}));
const muscleRecord=completed||{items:musclePreviewItems,logs:musclePreviewItems.map(()=>Array.from({length:3},()=>({done:true,weight:0,reps:0})))};
const muscleDistribution=FitLensMuscles.aggregate([muscleRecord]);
const previewLoad={bench:[40,10],pull:[30,10],row:[20,10],press:[8,10],raise:[4,10],cable:[5,12],squat:[16,10],rdl:[40,10],legpress:[80,12],curl:[25,12],calf:[30,15],biceps:[5,10]};
const recapVolume=completed?(completed.logs||[]).flat().filter(s=>s.done).reduce((sum,s)=>sum+Number(s.weight||0)*Number(s.reps||0),0):musclePreviewItems.reduce((sum,item)=>{const [weight,reps]=previewLoad[item.id]||[0,10];return sum+weight*reps*3},0);
$('#volume-total').textContent=recapVolume.toLocaleString('de-DE');
if(completed&&recapVolume===0)$('#bear-comparison').textContent='Bodyweight work counts, too.';else $('#bear-comparison').replaceChildren(document.createTextNode(`About ${Math.round(recapVolume/180)} bears’ worth.`),document.createElement('br'),document.createTextNode('One rep at a time.'));
$('#time-comparison').replaceChildren(document.createTextNode(`≈ ${Math.round(session.minutes/15)} quick matches.`),document.createElement('br'),document.createTextNode('Real-life level up.'));
for(let i=0;i<muscleDistribution.totalSets;i++)$('#set-mosaic').append(document.createElement('i'));
FitLensMuscleMap.mount($('#session-muscle-map'),muscleDistribution,{mode:completed?'Completed session':'Sample session',intro:completed?`${muscleDistribution.totalSets} completed ${muscleDistribution.totalSets===1?'set':'sets'}`:`${muscleDistribution.totalSets} sample sets`});
if(completed){const note=document.querySelector('.counting-note p:last-child');if(note)note.textContent='This recap uses the sets you marked complete. Bodyweight movements contribute no added-load volume.';}

if(completed){const done=(completed.logs||[]).flat().filter(s=>s.done).length;document.querySelector('.sets-card strong>span:last-child').textContent=done===1?' set':' sets';if(completed.seconds<60)document.getElementById('stat-duration').firstChild.textContent='<1';}
