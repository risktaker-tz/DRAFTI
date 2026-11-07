'use strict';
// Analyze real board screenshots produced by render_contrast_matrix.ps1.
// This is a visual-screening measure, not a WCAG text-contrast claim: it
// compares raster pixels at the disc's visible rim with the board square just
// outside it, then preserves the complete matrix in contact sheets for review.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const sharp = require('./tooling/node_modules/sharp');

const root = path.resolve(__dirname, '..');
const directory = path.resolve(process.argv[2] || path.join(root, 'docs/contrast-raster-samples-20261107'));
const output = path.resolve(process.argv[3] || path.join(root, 'docs'));
const themes = ['arcade','baize','club','cyberjade','glass','greenbuff','hologlass','ice','maplewood','marble','mono','neon','royale','sakura','solar','space','synth','tourney','travel','vapor','walnut'];
const materials = ['theme','tourney','woodturn','ivoryjet','bakelite','steel','glass','stone'];
const labels = ['Follow','Tourney','Turned','Ivory/Jet','Bakelite','Steel','Glass','Stone'];
const size = 514, crop = 1, board = 512, n = 8, cell = board / n;
const expected = themes.length * materials.length * 2;
const files = fs.readdirSync(directory).filter(name => name.endsWith('.png'));
if (files.length !== expected) throw new Error(`Expected ${expected} captures, found ${files.length}`);

function lum(rgb) {
  const linear = rgb.map(value => { const x = value / 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; });
  return .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2];
}
function ratio(a,b) { const [lo,hi] = [lum(a),lum(b)].sort((x,y)=>x-y); return (hi+.05)/(lo+.05); }
function median(values) { values.sort((a,b)=>a-b); return values[Math.floor(values.length/2)]; }
function quantile(values,q) { values.sort((a,b)=>a-b); return values[Math.floor((values.length-1)*q)]; }
function pixel(data,x,y) {
  const ix = Math.max(1, Math.min(board-2, Math.round(x)));
  const iy = Math.max(1, Math.min(board-2, Math.round(y)));
  const points=[];
  for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++) {
    const at=((iy+dy)*board+(ix+dx))*3;
    points.push([data[at],data[at+1],data[at+2]]);
  }
  return [0,1,2].map(k=>Math.round(median(points.map(p=>p[k]))));
}
async function imageFor(name) {
  const file=path.join(directory,name);
  const image=await sharp(file).extract({left:crop,top:crop,width:board,height:board}).removeAlpha().raw().toBuffer({resolveWithObject:true});
  if(image.info.width!==board||image.info.height!==board||image.info.channels!==3) throw new Error('Unexpected raster geometry: '+name);
  return image.data;
}
function pieceCells() {
  const out=[];
  for(let row=0;row<n;row++) for(let col=0;col<n;col++) {
    if((row<3||row>=5)&&((row+col)%2===1)) out.push({row,col});
  }
  if(out.length!==24) throw new Error('Opening piece sample count changed');
  return out;
}
const cases=[];
async function main() {
  const sheets={false:[],true:[]};
  for(const theme of themes) {
    for(const hv of [false,true]) {
      const tiles=[];
      for(const material of materials) {
        const name=`${theme}-${material}-${hv?'hv':'normal'}.png`;
        const raw=await imageFor(name);
        const pairs=[],facePairs=[];
        for(const {row,col} of pieceCells()) {
          const cx=col*cell+cell/2, cy=row*cell+cell/2;
          const emptyDarkRow=(3+col)%2===1?3:4;
          facePairs.push(ratio(pixel(raw,cx,cy),pixel(raw,cx,emptyDarkRow*cell+cell/2)));
          for(let angle=0;angle<Math.PI*2;angle+=Math.PI/16) {
            const edge=pixel(raw,cx+Math.cos(angle)*cell*.34,cy+Math.sin(angle)*cell*.34);
            const square=pixel(raw,cx+Math.cos(angle)*cell*.46,cy+Math.sin(angle)*cell*.46);
            pairs.push(ratio(edge,square));
          }
        }
        const screen={theme,material,hv,file:name,bytes:fs.statSync(path.join(directory,name)).size,
          pieceFaceSamples:facePairs.length,faceMinRatio:+Math.min(...facePairs).toFixed(3),
          faceP10Ratio:+quantile([...facePairs],.10).toFixed(3),faceMedianRatio:+median([...facePairs]).toFixed(3),
          faceUnder3:facePairs.filter(value=>value<3).length,
          visibleEdgeSamples:pairs.length,edgeMinRatio:+Math.min(...pairs).toFixed(3),
          edgeP10Ratio:+quantile([...pairs],.10).toFixed(3),edgeMedianRatio:+median([...pairs]).toFixed(3),
          edgeUnder3:pairs.filter(value=>value<3).length};
        cases.push(screen);
        tiles.push({name,raw});
      }
      sheets[String(hv)].push({theme,tiles});
    }
  }
  const sourceCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
  const html=fs.readFileSync(path.join(root,'web/index.html'));
  const sourceHtmlSha256=crypto.createHash('sha256').update(html).digest('hex');
  const sourceStylesSha256=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'src/styles.css'))).digest('hex');
  const buildId=/name="drafti-build" content="([a-f0-9]{64})"/.exec(html.toString('utf8'))?.[1]||null;
  const report={schema:1,sourceCommit,sourceStylesSha256,buildId,sourceHtmlSha256,createdAt:new Date().toISOString(),scope:'336 actual 8x8 opening-board element screenshots: 21 themes × 8 piece surfaces × High visibility on/off. Center-face versus empty playable-square contrast is a conservative legibility screen; rim measurements are diagnostic only because gloss, engraved grooves, shadows and the fine dual-tone keyline intentionally vary. Contact sheets retain visual context. Does not certify flags, crowns, move/capture animations or reduced motion.',viewport:'isolated Chromium, board element rasterized at 514×514 including 1px frame; inner 512×512 board sampled.',sampling:'For each of 24 opening discs, compare the 3×3 median face-center patch with an empty playable-square center on the same column. Also compare 32 rim/background angular pairs at 0.34- and 0.46-cell radii.',threshold:3,captures:files.length,caseCount:cases.length,under3Cases:cases.filter(x=>x.faceP10Ratio<3).length,weakest:cases.slice().sort((a,b)=>a.faceP10Ratio-b.faceP10Ratio).slice(0,30),cases};
  fs.writeFileSync(path.join(output,'contrast-raster-analysis-20261107.json'),JSON.stringify(report,null,2)+'\n');
  const sheetWidth=8*122+120, rowHeight=126, header=52, sheetHeight=header+themes.length*rowHeight;
  const font='Arial, sans-serif';
  for(const hv of [false,true]) {
    const layers=[];
    const bg=`<svg width="${sheetWidth}" height="${sheetHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#111827"/><text x="8" y="20" fill="#f8fafc" font-family="${font}" font-size="13" font-weight="700">High visibility</text><text x="8" y="39" fill="#f8fafc" font-family="${font}" font-size="13">${hv?'ON':'OFF'}</text>${labels.map((label,i)=>`<text x="${120+i*122+61}" y="32" fill="#cbd5e1" font-family="${font}" font-size="12" text-anchor="middle">${label}</text>`).join('')}</svg>`;
    layers.push({input:Buffer.from(bg),left:0,top:0});
    for(let r=0;r<themes.length;r++) {
      const row=sheets[String(hv)][r];
      const y=header+r*rowHeight;
      const labelSvg=`<svg width="120" height="${rowHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="${r%2?'#172033':'#1e293b'}"/><text x="8" y="${rowHeight/2+4}" fill="#e2e8f0" font-family="${font}" font-size="13">${row.theme}</text></svg>`;
      layers.push({input:Buffer.from(labelSvg),left:0,top:y});
      for(let c=0;c<row.tiles.length;c++) {
        const tile=row.tiles[c];
        const boardPng=await sharp(path.join(directory,tile.name)).resize(112,112,{fit:'contain',background:'#0f172a'}).png().toBuffer();
        const tileBg=Buffer.from(`<svg width="122" height="${rowHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="${r%2?'#172033':'#1e293b'}"/></svg>`);
        layers.push({input:tileBg,left:120+c*122,top:y});
        layers.push({input:boardPng,left:120+c*122+5,top:y+7});
      }
    }
    const out=path.join(output,`contrast-raster-contact-${hv?'hv':'normal'}-20261107.png`);
    await sharp({create:{width:sheetWidth,height:sheetHeight,channels:3,background:'#111827'}}).composite(layers).png().toFile(out);
  }
  console.log(JSON.stringify({captures:files.length,cases:cases.length,under3Cases:report.under3Cases,weakest:report.weakest.slice(0,10),contactSheets:['contrast-raster-contact-normal-20261107.png','contrast-raster-contact-hv-20261107.png']}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
