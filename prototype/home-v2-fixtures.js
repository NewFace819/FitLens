/* M0-A only: deterministic, deeply frozen sample presentation data. No persistence APIs. */
(()=>{'use strict';
const today='2026-11-04',previous='2026-11-03',tomorrow='2026-11-05',friday='2026-11-06';
const sampleHistory={
 '2026-11-02':[{id:'sample-mon',name:'Upper Body',minutes:32,type:'Workout',outcome:'Completed'}],
 [previous]:[{id:'sample-walk',name:'Afternoon walk',minutes:24,type:'Logged activity',outcome:'Saved'},{id:'sample-strength',name:'Full Body',minutes:35,type:'Workout',outcome:'Completed'},{id:'sample-mobility',name:'Mobility',minutes:12,type:'Logged activity',outcome:'Saved'}]
};
const scheduled={id:'sample-upper',name:'Upper Body',minutes:45,time:'18:15',exercises:6};
const definitions=[
 {id:'new-user',label:'01 · New User',kind:'new',records:{},plans:{},initialDate:today},
 {id:'open-day',label:'02 · Open Day',kind:'open',records:sampleHistory,plans:{[friday]:{...scheduled,name:'Full Body',time:null,minutes:30}},initialDate:today},
 {id:'scheduled-workout',label:'03 · Scheduled Workout',kind:'scheduled',records:sampleHistory,plans:{[today]:scheduled,[friday]:{...scheduled,id:'sample-full',name:'Full Body',minutes:30,time:null}},initialDate:today},
 {id:'active-workout',label:'04 · Active Workout',kind:'active',records:sampleHistory,plans:{[today]:scheduled},live:{name:'Upper Body',completedSets:4,totalSets:12,minutes:14},initialDate:today},
 {id:'recently-completed',label:'05 · Recently Completed',kind:'completed',records:{...sampleHistory,[today]:[{id:'sample-lower',name:'Lower Body',minutes:38,sets:12,type:'Workout',outcome:'Completed'}]},plans:{},initialDate:today},
 {id:'returning-user',label:'06 · Returning User',kind:'returning',records:{'2026-10-16':[{id:'sample-older',name:'Full Body',minutes:30,type:'Workout',outcome:'Completed'}]},plans:{},initialDate:today},
 {id:'safety-attention',label:'07 · Safety Attention',kind:'safety',records:{...sampleHistory,[today]:[{id:'sample-stopped',name:'Upper Body',minutes:18,sets:5,type:'Workout',outcome:'Stopped early'}]},plans:{},safety:{date:today,label:'Body note recorded',description:'Example check-in · Nov 4'},initialDate:today},
 {id:'historical-day',label:'08 · Historical Day',kind:'open',records:sampleHistory,plans:{},initialDate:previous},
 {id:'upcoming-day',label:'09 · Upcoming Day',kind:'open',records:sampleHistory,plans:{[friday]:{...scheduled,id:'sample-future',name:'Full Body',minutes:30,time:'08:00'}},initialDate:friday},
 {id:'unavailable-data',label:'10 · Unavailable Data',kind:'unavailable',records:{},plans:{},initialDate:today},
 {id:'error-data',label:'11 · Error Data',kind:'error',records:{},plans:{},initialDate:today},
 {id:'long-content',label:'12 · Long content stress',kind:'scheduled',records:sampleHistory,plans:{[today]:{...scheduled,name:'Full Body — strength and mobility with a longer workout title',minutes:55,time:'18:15'}},initialDate:today}
];
const freeze=o=>{if(o&&typeof o==='object'&&!Object.isFrozen(o)){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};
window.FitLensHomeV2Fixtures=freeze({today,definitions});
})();
