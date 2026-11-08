'use strict';
// Build compact, human-reviewable sheets from the 336 isolated board captures.
const path=require('node:path');
const sharp=require('./tooling/node_modules/sharp');
const root=path.resolve(__dirname,'..');
const dir=path.resolve(process.argv[2]||path.join(root,'docs/contrast-raster-release-final-20261108'));
const themes=['arcade','baize','club','cyberjade','glass','greenbuff','hologlass','ice','maplewood','marble','mono','neon','royale','sakura','solar','space','synth','tourney','travel','vapor','walnut'];
const materials=['theme','tourney','woodturn','ivoryjet','bakelite','steel','glass','stone'];
const labels=['Follow','Tourney','Wood','Ivory/Jet','Bakelite','Steel','Glass','Stone'];

async function render(highVisibility){
  const width=900,header=48,row=88,height=header+themes.length*row,layers=[];
  const title=`Rendered board contrast · High visibility ${highVisibility?'ON':'OFF'}`;
  layers.push({input:Buffer.from(`<svg width="${width}" height="${header}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#101827"/><text x="8" y="17" fill="#fff" font-family="Arial" font-size="13" font-weight="700">${title}</text>${labels.map((name,i)=>`<text x="${150+i*99}" y="40" fill="#ccd5e1" font-family="Arial" font-size="9" text-anchor="middle">${name}</text>`).join('')}</svg>`),left:0,top:0});
  for(let r=0;r<themes.length;r++){
    const y=header+r*row,fill=r%2?'#182235':'#1e293b';
    layers.push({input:Buffer.from(`<svg width="102" height="${row}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="${fill}"/><text x="7" y="46" fill="#f0f4fa" font-family="Arial" font-size="12">${themes[r]}</text></svg>`),left:0,top:y});
    for(let c=0;c<materials.length;c++){
      const suffix=highVisibility?'hv':'normal';
      const file=path.join(dir,`${themes[r]}-${materials[c]}-${suffix}.png`);
      const png=await sharp(file).resize(82,82,{fit:'fill'}).png().toBuffer();
      layers.push({input:Buffer.from(`<svg width="96" height="${row}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="${fill}"/></svg>`),left:102+c*99,top:y});
      layers.push({input:png,left:109+c*99,top:y+3});
    }
  }
  const output=path.join(root,`docs/contrast-contact-sheet-hv-${highVisibility?'on':'off'}-20261108.png`);
  await sharp({create:{width,height,channels:3,background:'#101827'}}).composite(layers).png().toFile(output);
  console.log(output);
}

Promise.all([render(false),render(true)]).catch(error=>{console.error(error);process.exitCode=1;});
