/* Prefixed ids, e.g. wk-lx3k9a-1f2b. Prefixes are listed in docs/design/DATA_CONTRACT.md section 3. */
(function(root){
'use strict';
let counter=0;
function newId(prefix){counter=(counter+1)%1679616;return String(prefix)+'-'+Date.now().toString(36)+'-'+counter.toString(36)+Math.random().toString(36).slice(2,6);}
const api={newId};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FitLensIds=api;
})(typeof window!=='undefined'?window:globalThis);
