/* M0-A.3 presentation-only cases. Original fixtures remain frozen and unchanged. */
(()=>{'use strict';
 const F=window.FitLensHomeV2Fixtures,find=id=>F.definitions.find(f=>f.id===id),active=find('active-workout'),scheduled=find('scheduled-workout'),completed=find('recently-completed');
 const definitions=[
  {...active,id:'stage-safety-active',label:'Experiment · Safety + Active',safety:find('safety-attention').safety},
  {...scheduled,id:'stage-scheduled-no-time',label:'Experiment · Scheduled without time',plans:{...scheduled.plans,[F.today]:{...scheduled.plans[F.today],time:null}}},
  {...active,id:'stage-active-unknown-total',label:'Experiment · Active, total unavailable',live:{...active.live,totalSets:null}},
  {...completed,id:'stage-completed-missing-details',label:'Experiment · Saved, details unavailable',records:{...completed.records,[F.today]:completed.records[F.today].map(r=>({...r,minutes:null,sets:null}))}}
 ];
 const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value)}return value};
 window.FitLensHomeV2StageFixtures=freeze(definitions);
})();
