/* Envelope storage: { v, data }. Never throws. Pass the Storage object in so it can be tested. */
(function(root){
'use strict';
function readEnvelope(storage,key){try{const raw=storage.getItem(key);if(raw===null||raw===undefined)return null;const env=JSON.parse(raw);return env&&typeof env==='object'&&Number.isInteger(env.v)&&'data' in env?env:null;}catch{return null;}}
function read(storage,key,fallback){const env=readEnvelope(storage,key);return env?env.data:fallback;}
function write(storage,key,data,version=1){try{const env=readEnvelope(storage,key);if(env&&env.v>version)return false;storage.setItem(key,JSON.stringify({v:version,data}));return true;}catch{return false;}}
function remove(storage,key){try{storage.removeItem(key);return true;}catch{return false;}}
const api={readEnvelope,read,write,remove};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FitLensStorage=api;
})(typeof window!=='undefined'?window:globalThis);
