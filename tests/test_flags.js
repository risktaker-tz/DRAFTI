'use strict';
// Evaluate the production palette functions without a browser or duplicated resolver.
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const ui=fs.readFileSync(path.join(__dirname,'../src/ui.js'),'utf8');
const nations=vm.runInNewContext(ui.match(/const NATION_DATA = (\[[\s\S]*?\n  \]);/)[1]);
const flags=ui.match(/const FLAG_COLORS = (\{[\s\S]*?\n  \});/)[1];
const math=ui.slice(ui.indexOf('  const hexRgb ='),ui.indexOf('  // every nation\'s name'));
const functions=ui.slice(ui.indexOf('  const sideVarSet ='),ui.indexOf('  // write the palettes'));
const context={};vm.createContext(context);
vm.runInContext(`const FLAG_COLORS=${flags}; const ROSTER=${JSON.stringify(nations.map(([id])=>({id})))};
const IVORY=1,EBONY=2;const G={mode:'aivai',seatIvory:'TZ',seatEbony:'KE'};
const settings={arenaFlags:true,humanFlags:false,aivaiAuto:true};const presentation={nationIvory:'TZ',nationEbony:'KE'};
const renamed=new Set();const customNamed=id=>renamed.has(id);
${math}\n${functions}
this.api={G,settings,presentation,renamed,flagPalettes,lumaC,colorClose,sideVarSet};`,context);
const a=context.api;let assertions=0;
function check(value,message){assert(value,message);assertions++;}
for(const [left,right] of [['TZ','KE'],['IT','BF'],['ID','MC'],['CI','EC'],['MG','KE']]){
 a.G.seatIvory=left;a.G.seatEbony=right;const [x,y]=a.flagPalettes();
 check(x&&y,left+'/'+right+' palettes exist');
 check(!a.colorClose(x[2],y[2]),left+'/'+right+' remain distinguishable');
 console.log(left,right,x[2],y[2]);
}
for(const [id] of nations){a.G.seatIvory=id;a.G.seatEbony=id==='TZ'?'KE':'TZ';const [p]=a.flagPalettes();check(p&&/^#[a-f0-9]{6}$/i.test(p[2]),id+' valid palette');const ratio=(Math.max(a.lumaC(p[2]),a.lumaC(p.deep))+.05)/(Math.min(a.lumaC(p[2]),a.lumaC(p.deep))+.05);check(ratio>=3,id+' crown contrast');}
for (const [left] of nations) for (const [right] of nations) {
 if (left===right) continue;
 a.G.seatIvory=left;a.G.seatEbony=right;
 const [x,y]=a.flagPalettes();
 check(!a.colorClose(x[2],y[2]),left+'/'+right+' pairwise separation');
}
a.renamed.add('TZ');a.G.seatIvory='TZ';check(a.flagPalettes()[0]===null,'renamed nation uses classic');a.renamed.clear();check(a.flagPalettes()[0]!==null,'restored nation regains flag');
a.settings.arenaFlags=false;check(a.flagPalettes().every(p=>p===null),'arena classic option');
a.settings.arenaFlags=true;a.settings.aivaiAuto=false;check(a.flagPalettes().every(p=>p===null),'manual engines use classic colours, without unrelated nation flags');a.settings.aivaiAuto=true;
for(const mode of ['ai','hotseat']){a.G.mode=mode;check(a.flagPalettes().every(p=>p===null),mode+' default classic');a.settings.humanFlags=true;check(a.flagPalettes().every(Boolean),mode+' opt-in flags');a.settings.humanFlags=false;}
console.log(assertions+' flag assertions passed');
