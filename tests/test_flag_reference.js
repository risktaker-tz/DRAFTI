'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const ui=fs.readFileSync(path.join(root,'src/ui.js'),'utf8');
const nations=vm.runInNewContext(ui.match(/const NATION_DATA = (\[[\s\S]*?\n  \]);/)[1]);
const reference=JSON.parse(fs.readFileSync(path.join(root,'scripts/flag_reference.json'),'utf8'));
assert.equal(reference.failures.length,0,'Unresolved source downloads');
assert.equal(reference.entries.length,nations.length,'Incomplete source coverage');
const palettes=vm.runInNewContext('('+ui.match(/const FLAG_COLORS = (\{[\s\S]*?\n  \});/)[1]+')');
const codes=new Set();
for(const r of reference.entries){
 assert(!codes.has(r.code),'Duplicate '+r.code);codes.add(r.code);
 assert(nations.some(([id,name])=>id===r.code&&name===r.country),'Unknown country '+r.code);
 assert(r.source.startsWith('https://commons.wikimedia.org/wiki/File:'),'Missing source '+r.code);
 const local=path.join(root,'scripts/flag_sources',r.code+'.svg');
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(local)).digest('hex'),r.svgSha256,'Source checksum '+r.code);
 assert(r.colours.length,'No colours '+r.code);
 for(const colour of palettes[r.code]) assert(r.colours.some(c=>c.hex.toUpperCase()===colour.toUpperCase()),'Palette colour absent from reference '+r.code+' '+colour);
 for(const c of r.colours){assert(/^#[0-9A-F]{6}$/.test(c.hex),'Invalid colour '+r.code);assert(c.areaPercent>0&&c.areaPercent<=100,'Invalid area '+r.code);}
 const area=r.colours.reduce((sum,c)=>sum+c.areaPercent,0);
 assert(area>60&&area<=101,'Incomplete dominant coverage '+r.code+': '+area);
}
console.log(reference.entries.length+' flag references verified: roster, source URLs, checksums, palette membership and colour coverage');
