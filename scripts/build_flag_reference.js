'use strict';
// Development-only research. Runtime game remains offline and self-contained.
const fs = require('fs'), path = require('path'), vm = require('vm');
const sharp = require('./tooling/node_modules/sharp');
const root = path.resolve(__dirname, '..');
const ui = fs.readFileSync(path.join(root, 'src/ui.js'), 'utf8');
const nations = vm.runInNewContext(ui.match(/const NATION_DATA = (\[[\s\S]*?\n  \]);/)[1]);
const names = {CD:'Democratic Republic of the Congo',CG:'Republic of the Congo',CI:'Ivory Coast',CF:'Central African Republic',GQ:'Equatorial Guinea',ST:'São Tomé and Príncipe',CV:'Cape Verde',BA:'Bosnia and Herzegovina',CZ:'the Czech Republic',GB:'the United Kingdom',US:'the United States',AE:'the United Arab Emirates',DO:'the Dominican Republic',KN:'Saint Kitts and Nevis',LC:'Saint Lucia',VC:'Saint Vincent and the Grenadines',MH:'the Marshall Islands',FM:'the Federated States of Micronesia',PH:'the Philippines',GM:'The Gambia',NL:'the Netherlands',SB:'the Solomon Islands'};
const cache = path.join(root, 'scripts/flag_sources');
fs.mkdirSync(cache, {recursive:true});
async function run() {
 const entries=[], failures=[];
 for (const [code,country] of nations) {
  const title = 'Flag of ' + (names[code] || country) + '.svg';
  const source = 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(title.replaceAll(' ','_'));
  const local = path.join(cache, code + '.svg');
  try {
   if (!fs.existsSync(local)) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    let response;
    for (let attempt = 0; attempt < 3; attempt++) {
    response = await fetch('https://commons.wikimedia.org/wiki/Special:Redirect/file/' + encodeURIComponent(title.replaceAll(' ','_')), {signal:AbortSignal.timeout(30000)});
    if (response.status !== 429) break;
    console.log(code, 'Rate limited; waiting 35 seconds');
    await new Promise(resolve => setTimeout(resolve, 35000));
    }
    if (!response.ok) throw Error('HTTP ' + response.status);
    const svg=await response.text();
    if (!svg.includes('<svg')) throw Error('Response is not SVG');
    fs.writeFileSync(local, svg);
   }
   const {data,info} = await sharp(local).resize(180,120,{fit:'fill'}).removeAlpha().raw().toBuffer({resolveWithObject:true});
   const counts=new Map();
   // Quantize to 16-step RGB buckets to group antialiasing shades; retain
   // the most common original pixel within each bucket for source fidelity.
   for(let i=0;i<data.length;i+=info.channels) {
    const rgb=[data[i],data[i+1],data[i+2]];
    const bucket=rgb.map(v=>Math.round(v/16)).join(',');
    const hex='#'+rgb.map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase();
    if(!counts.has(bucket)) counts.set(bucket,{n:0,hexes:new Map()});
    const c=counts.get(bucket);c.n++;c.hexes.set(hex,(c.hexes.get(hex)||0)+1);
   }
   const colours=[...counts.values()].sort((a,b)=>b.n-a.n).filter(c=>c.n/(180*120)>.015).map(c=>({hex:[...c.hexes].sort((a,b)=>b[1]-a[1])[0][0],areaPercent:Math.round(c.n/(180*120)*1000)/10}));
   entries.push({code,country,source,colours});
   console.log(code,country,colours.map(c=>c.hex).join(' '));
  } catch(error) { failures.push({code,country,source,error:error.message});console.error(code,error.message); }
  fs.writeFileSync(path.join(root,'scripts/flag_reference.json'),JSON.stringify({_comment:'Dominant colours measured from Wikimedia Commons SVG flag files. Ordered by raster area; not automatically selected as piece colours. Each entry includes its source URL.',entries,failures},null,2)+'\n');
 }
 if(failures.length) process.exitCode=1;
 console.log('Flags measured:',entries.length,'Failures:',failures.length);
}
run();
