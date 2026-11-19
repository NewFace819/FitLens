'use strict';
class MemoryStorage{
 constructor(){this.map=new Map();}
 getItem(k){return this.map.has(k)?this.map.get(k):null;}
 setItem(k,v){this.map.set(k,String(v));}
 removeItem(k){this.map.delete(k);}
}
class BrokenStorage{getItem(){throw new Error('blocked');}setItem(){throw new Error('full');}removeItem(){throw new Error('blocked');}}
module.exports={MemoryStorage,BrokenStorage};
