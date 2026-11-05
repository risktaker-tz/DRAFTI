'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..'),ui=fs.readFileSync(path.join(root,'src/ui.js'),'utf8');
const flags=vm.runInNewContext('('+ui.match(/const FLAG_COLORS = (\{[\s\S]*?\n  \});/)[1]+')');
const reference=JSON.parse(fs.readFileSync(path.join(root,'scripts/flag_reference.json'),'utf8'));
const rgb=h=>h.slice(1).match(/../g).map(x=>parseInt(x,16));
const distance=(a,b)=>Math.sqrt(rgb(a).reduce((s,v,i)=>s+(v-rgb(b)[i])**2,0));
const entries=reference.entries||[],codes=entries.map(r=>r.code),codeSet=new Set(codes),flagCodes=Object.keys(flags);
if(entries.length!==194||codeSet.size!==194||flagCodes.length!==194||codes.some(code=>!flags[code])||flagCodes.some(code=>!codeSet.has(code)))
  throw new Error('Expected exactly one source reference and selected palette for each of 194 nations');
for(const row of entries){
  if(!row.country||!row.source||!Array.isArray(row.colours)||!row.colours.length||row.colours.some(c=>!/^#[\da-f]{6}$/i.test(c.hex)))
    throw new Error('Incomplete source reference for '+row.code);
  if(!Array.isArray(flags[row.code])||flags[row.code].length!==2||flags[row.code].some(c=>!/^#[\da-f]{6}$/i.test(c)))
    throw new Error('Expected two valid selected game colours for '+row.code);
}
const rows=reference.entries.map(r=>({code:r.code,country:r.country,selected:flags[r.code],nearest:flags[r.code].map(c=>r.colours.map(x=>({hex:x.hex,distance:Math.round(distance(c,x.hex))})).sort((a,b)=>a.distance-b.distance)[0]),source:r.source}));
const maxDistance=Math.max(...rows.flatMap(r=>r.nearest.map(c=>c.distance))),outOfRange=rows.filter(r=>r.nearest.some(c=>c.distance>40));
if(outOfRange.length)throw new Error('Selected game colours exceed the 40-point reference tolerance: '+outOfRange.map(r=>r.code).join(', '));
const output={references:rows.length,totalNations:Object.keys(flags).length,note:'Nearest source colour is review evidence, not an automatic replacement rule. Small emblems may not appear among dominant colours.',rows};
fs.writeFileSync(path.join(root,'docs/flag-palette-comparison.json'),JSON.stringify(output,null,2)+'\n');
console.log(rows.length,'authoritative palettes compared; maximum nearest-colour distance',maxDistance,'; all nation/source/colour checks passed');
for(const r of rows)if(r.nearest.some(c=>c.distance>40))console.log(r.code,r.selected.join('/'),'nearest',r.nearest.map(c=>c.hex+' (distance '+c.distance+')').join('/'));
