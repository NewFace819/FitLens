/* Shared monotone cumulative curve; extracted unchanged from Steps. */
(function(root){'use strict';
function line(values,start,end,y,x=h=>8+h/24*302){const p=Array.from({length:end-start+1},(_,i)=>[x(start+i),y(values[start+i])]),d=p.slice(1).map((v,i)=>(v[1]-p[i][1])/(v[0]-p[i][0])),m=p.map((v,i)=>i===0?d[0]:i===p.length-1?d.at(-1):d[i-1]*d[i]<=0?0:2*d[i-1]*d[i]/(d[i-1]+d[i]));return 'M'+p[0].join(',')+p.slice(1).map((v,i)=>{const a=p[i],dx=(v[0]-a[0])/3;return ' C'+[a[0]+dx,a[1]+m[i]*dx,v[0]-dx,v[1]-m[i+1]*dx,v[0],v[1]].join(',');}).join('');}
const api={line};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FitLensStepsChart=api;
})(typeof window!=='undefined'?window:globalThis);
