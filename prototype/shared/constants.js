/* Shared enums. Single source of truth; see docs/design/DATA_CONTRACT.md section 1. */
(function(root){
'use strict';
const freeze=a=>Object.freeze([...a]);
const api=Object.freeze({
 Region:freeze(['knees','back','wrists','shoulders','ankles','hips']),
 Equipment:freeze(['dumbbells','bands','mat','bench']),
 Goal:freeze(['habit','strength','muscle','endurance']),
 Experience:freeze(['new','returning','regular']),
 Place:freeze(['home','gym']),
 Muscle:freeze(['chest','back','shoulders','arms','legs','glutes','core']),
 SessionStatus:freeze(['planned','done','skipped']),
 TIME_ZONE:'Asia/Ho_Chi_Minh'
});
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FitLensConstants=api;
})(typeof window!=='undefined'?window:globalThis);
