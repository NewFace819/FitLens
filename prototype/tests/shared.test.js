'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const D=require('../shared/dates.js'),S=require('../shared/storage.js'),I=require('../shared/ids.js'),C=require('../shared/constants.js');
const {MemoryStorage,BrokenStorage}=require('./helpers.js');
const P=require('../setup-plan-model.js');

test('weekStartOf: Monday stays, Sunday goes back 6 days, crosses month and year',()=>{
 assert.equal(D.weekStartOf('2026-11-09'),'2026-11-09');
 assert.equal(D.weekStartOf('2026-11-15'),'2026-11-09');
 assert.equal(D.weekStartOf('2026-11-16'),'2026-11-16');
 assert.equal(D.weekStartOf('2026-03-01'),'2026-02-23');
 assert.equal(D.weekStartOf('2027-01-01'),'2026-12-28');
 assert.equal(D.weekStartOf('nope'),null);
});
test('isValidDate / isValidTime reject impossible values',()=>{
 assert.equal(D.isValidDate('2026-02-30'),false);
 assert.equal(D.isValidDate('2026-2-3'),false);
 assert.equal(D.isValidDate('2028-02-29'),true);
 assert.equal(D.isValidDate(null),false);
 assert.equal(D.isValidTime('24:00'),false);
 assert.equal(D.isValidTime('18:30'),true);
 assert.equal(D.isValidTime('7:00'),false);
});
test('addDays and weekDates',()=>{
 assert.equal(D.addDays('2026-11-30',1),'2026-12-01');
 assert.equal(D.addDays('2026-11-01',-1),'2026-10-31');
 assert.deepEqual(D.weekDates('2026-11-12'),['2026-11-09','2026-11-10','2026-11-11','2026-11-12','2026-11-13','2026-11-14','2026-11-15']);
 assert.deepEqual(D.weekDates('bad'),[]);
});
test('todayStr uses Ho Chi Minh time zone',()=>{
 assert.equal(D.todayStr(new Date('2026-11-14T18:00:00Z')),'2026-11-15');
 assert.equal(D.todayStr(new Date('2026-11-14T16:00:00Z')),'2026-11-14');
});
test('storage: round trip, bad JSON, wrong shape fall back',()=>{
 const s=new MemoryStorage();
 assert.deepEqual(S.read(s,'k',[]),[]);
 assert.equal(S.write(s,'k',[1,2]),true);
 assert.deepEqual(S.read(s,'k',[]),[1,2]);
 s.setItem('bad','{oops');assert.deepEqual(S.read(s,'bad','fb'),'fb');
 s.setItem('shape',JSON.stringify([1,2]));assert.equal(S.read(s,'shape','fb'),'fb');
});
test('storage: refuses to overwrite newer version; never throws when blocked',()=>{
 const s=new MemoryStorage();S.write(s,'k',{a:1},2);
 assert.equal(S.write(s,'k',{a:2},1),false);
 assert.deepEqual(S.read(s,'k',null),{a:1});
 const b=new BrokenStorage();
 assert.equal(S.read(b,'k','fb'),'fb');assert.equal(S.write(b,'k',1),false);
});
test('newId: prefix and no duplicates in 5000 calls',()=>{
 const seen=new Set();for(let i=0;i<5000;i++)seen.add(I.newId('wk'));
 assert.equal(seen.size,5000);
 assert.ok([...seen][0].startsWith('wk-'));
});
test('legacy FitLensPlan.library only uses values from shared enums',()=>{
 for(const w of P.library){
  for(const e of w.equipment)assert.ok(C.Equipment.includes(e),w.id+' equipment '+e);
  for(const r of w.regions)assert.ok(C.Region.includes(r),w.id+' region '+r);
  for(const g of w.goals)assert.ok(C.Goal.includes(g),w.id+' goal '+g);
 }
});
