'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const ui=fs.readFileSync(path.join(__dirname,'../src/ui.js'),'utf8');let now=100000,played=[];
const c={window:{DRAFTI_SFX:{}},settings:{sound:true,sfx:{animals:true}},G:{mode:'aivai',aiSpeed:16},
  performance:{now:()=>now},Math:Object.assign(Object.create(Math),{random:()=>0})};vm.createContext(c);
vm.runInContext(ui.slice(ui.indexOf('  const SFX_BANK ='),ui.indexOf('  // ---------------- game state'))+'this.bank=SFX_BANK;',c);
const b=c.bank;b.on=()=>true;b.play=id=>{played.push(id);return {id};};
for(const id of ['chicken','duck','bear','elephant','eagle','wildroar']){b.defs[id]={};b.buffers.set(id,{});}
assert.equal(b.fastArenaAnimal(0,2,false),null,'No random idle animals');
assert.equal(b.fastArenaAnimal(1,10,false),null,'Routine captures stay quiet');
assert.equal(b.fastArenaAnimal(1,2,false).id,'chicken','Panic follows losing last pieces');
assert.equal(b.fastArenaAnimal(3,8,false),null,'Global rest holds');
now+=23000;assert.equal(b.fastArenaAnimal(3,8,false).id,'elephant','Feasts get larger animals');
now+=23000;c.settings.sfx.animals=false;assert.equal(b.fastArenaAnimal(3,8,false),null);
c.settings.sfx.animals=true;c.G.mode='ai';assert.equal(b.fastArenaAnimal(3,8,false),null,'Human games keep their sound design');
c.G.mode='aivai';c.G.aiSpeed=4;assert.equal(b.fastArenaAnimal(3,8,false),null);
c.G.aiSpeed=16;b.activeSources.set({}, {spoken:true});assert.equal(b.fastArenaAnimal(3,8,false),null,'No commentary overlap');
b.activeSources.clear();b.fastAnimalCount=4;assert.equal(b.fastArenaAnimal(3,8,false),null,'Per-game quota holds');
console.log('Fast arena animals passed: meaningful captures only, losing-side panic, rarity, speed/mode/category gates, speech protection and quotas');
