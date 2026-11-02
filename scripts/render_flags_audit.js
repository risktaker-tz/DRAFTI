'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const sharp=require('./tooling/node_modules/sharp');
const root=path.resolve(__dirname,'..');
const ui=fs.readFileSync(path.join(root,'src/ui.js'),'utf8');
const flags=vm.runInNewContext('('+ui.match(/const FLAG_COLORS = (\{[\s\S]*?\n  \});/)[1]+')');
const nations=vm.runInNewContext(ui.match(/const NATION_DATA = (\[[\s\S]*?\n  \]);/)[1]);
const reference=JSON.parse(fs.readFileSync(path.join(root,'scripts/flag_reference.json'),'utf8'));
const ref=new Map(reference.entries.map(r=>[r.code,r]));
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
(async()=>{
 const width=1600,cellWidth=200,cellHeight=144,height=Math.ceil(nations.length/8)*cellHeight;
 let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><radialGradient id="light"><stop stop-color="white" stop-opacity=".5"/><stop offset=".55" stop-color="white" stop-opacity="0"/><stop offset="1" stop-opacity=".45"/></radialGradient></defs><rect width="100%" height="100%" fill="#152130"/>`;
 const table=['| Code | Nation | Main | Secondary | Reference colours by area | Source |','|---|---|---|---|---|---|'];
 for(let i=0;i<nations.length;i++){
  const [code,name]=nations[i],pair=flags[code],r=ref.get(code),x=(i%8)*cellWidth,y=Math.floor(i/8)*cellHeight;
  if(!pair) throw Error('Missing palette '+code);
  svg+=`<g transform="translate(${x} ${y})"><rect x="3" y="3" width="194" height="138" rx="8" fill="#263b4a" stroke="#526575"/><text x="12" y="24" fill="white" font-family="sans-serif" font-size="13">${code} ${escape(name)}</text>`;
  pair.forEach((colour,j)=>{
   const cx=52+j*92;
   svg+=`<circle cx="${cx}" cy="67" r="28" fill="${colour}" stroke="#aaa"/><circle cx="${cx}" cy="67" r="28" fill="url(#light)"/>`;
   for(const radius of [17,20,23])svg+=`<circle cx="${cx}" cy="67" r="${radius}" fill="none" stroke="#fff" stroke-opacity=".2"/>`;
   svg+=`<text x="${cx}" y="110" text-anchor="middle" fill="white" font-size="11" font-family="monospace">${colour}</text>`;
  });
  svg+=`<text x="12" y="130" fill="${r?'#9bcda4':'#ffad92'}" font-size="10" font-family="sans-serif">${r?'Reference recorded':'Reference pending'}</text></g>`;
  table.push(`| ${code} | ${name} | ${pair[0]} | ${pair[1]} | ${r?r.colours.map(c=>c.hex).join(', '):'Not yet collected'} | ${r?r.source:''} |`);
 }
 svg+='</svg>';
 fs.writeFileSync(path.join(root,'docs/flags-audit.svg'),svg);
 await sharp(Buffer.from(svg)).png().toFile(path.join(root,'docs/flags-audit.png'));
 fs.writeFileSync(path.join(root,'docs/flags-audit.md'),'# Flag palette audit\n\n'+ref.size+' / '+nations.length+' source references recorded. Contact sheet displays selected palette swatches; final palette review remains required.\n\n'+table.join('\n')+'\n');
 console.log(nations.length,'palettes rendered;',ref.size,'source references');
})();
