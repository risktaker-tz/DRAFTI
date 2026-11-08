'use strict';
// Measure the pixels actually rendered by Chromium, not only theme variables.
// Square contrast uses small centre patches on adjacent empty cells. Piece
// contrast samples the final rendered rim pixel-by-pixel and compares it with
// the same angle's nearby board pixels, avoiding wood/grain mismatch between
// separate squares and preserving the narrow dark/light separator.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('./tooling/node_modules/sharp');

const root = path.resolve(__dirname, '..');
const input = path.resolve(process.argv[2] || path.join(root, 'docs/contrast-raster-samples-v2-20261108'));
const outputArg = path.resolve(process.argv[3] || path.join(root, 'docs/rendered-contrast-current-20261108.json'));
const output = outputArg.toLowerCase().endsWith('.json') ? outputArg : path.join(outputArg, 'rendered-contrast-current-20261108.json');
const files = fs.readdirSync(input).filter(name => name.endsWith('.png'));
const themeCoverage = new Map();
for (const file of files) {
  const theme=file.split('-')[0];themeCoverage.set(theme,(themeCoverage.get(theme)||0)+1);
}
if (!files.length || [...themeCoverage.values()].some(count=>count!==16))
  throw new Error('Each included theme must have all 8 materials × 2 visibility states');
const board = 512, n = 8, cell = board / n;

function luminance(rgb) {
  const l = rgb.map(value => { const x = value / 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; });
  return .2126 * l[0] + .7152 * l[1] + .0722 * l[2];
}
function ratio(a,b) { const x = luminance(a), y = luminance(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); }
function quantile(sorted,q) { return sorted[Math.floor((sorted.length-1)*q)]; }
function boardPieces() {
  const out=[];
  for(let row=0;row<n;row++) for(let col=0;col<n;col++)
    if((row<3||row>=5)&&((row+col)%2===1)) out.push({row,col});
  if(out.length!==24) throw new Error('Expected 24 opening pieces');
  return out;
}
function emptyDarkCells() {
  const out=[];
  for(let row=3;row<=4;row++) for(let col=0;col<n;col++) if((row+col)%2===1) out.push({row,col});
  return out;
}

async function analyze(file) {
  const image=await sharp(path.join(input,file)).extract({left:1,top:1,width:board,height:board}).removeAlpha().raw().toBuffer({resolveWithObject:true});
  if(image.info.width!==board||image.info.height!==board||image.info.channels!==3) throw new Error('Unexpected screenshot: '+file);
  const data=image.data;
  function pixel(x,y) {
    x=Math.max(1,Math.min(board-2,Math.round(x))); y=Math.max(1,Math.min(board-2,Math.round(y)));
    const samples=[];
    for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++) { const i=((y+dy)*board+x+dx)*3; samples.push([data[i],data[i+1],data[i+2]]); }
    return [0,1,2].map(channel=>{const v=samples.map(p=>p[channel]).sort((a,b)=>a-b);return v[4];});
  }
  function exactPixel(x,y) {
    x=Math.max(0,Math.min(board-1,Math.round(x))); y=Math.max(0,Math.min(board-1,Math.round(y)));
    const i=(y*board+x)*3;return [data[i],data[i+1],data[i+2]];
  }
  const squarePairs=[];
  for(const {row,col} of emptyDarkCells()) {
    const dark=pixel((col+.5)*cell,(row+.5)*cell);
    for(const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const rr=row+dr,cc=col+dc;if(rr<0||rr>=n||cc<0||cc>=n)continue;
      const light=pixel((cc+.5)*cell,(rr+.5)*cell);
      squarePairs.push(ratio(dark,light));
    }
  }
  const empty=emptyDarkCells(), rimAngles=[];
  for(const piece of boardPieces()) {
    const cellX=(piece.col+.5)*cell,cellY=(piece.row+.5)*cell;
    for(let step=0;step<64;step++) {
      const angle=step*Math.PI/32;
      const background=pixel(cellX+Math.cos(angle)*.49*cell,cellY+Math.sin(angle)*.49*cell);
      let best=0;
      for(let radius=.35;radius<=.48;radius+=.0015) {
        const edge=exactPixel(cellX+Math.cos(angle)*radius*cell,cellY+Math.sin(angle)*radius*cell);
        best=Math.max(best,ratio(edge,background));
      }
      rimAngles.push(best);
    }
  }
  squarePairs.sort((a,b)=>a-b);rimAngles.sort((a,b)=>a-b);
  return {file,squareSamples:squarePairs.length,squareMin:+squarePairs[0].toFixed(3),squareP10:+quantile(squarePairs,.1).toFixed(3),
    rimSamples:rimAngles.length,rimMin:+rimAngles[0].toFixed(3),rimP10:+quantile(rimAngles,.1).toFixed(3),
    squareUnder3:squarePairs.filter(x=>x<3).length,rimUnder3:rimAngles.filter(x=>x<3).length};
}

async function main() {
  const rows=[];
  for(let i=0;i<files.length;i++) { rows.push(await analyze(files[i])); if((i+1)%32===0) console.log(`Analyzed ${i+1}/${files.length} rendered boards`); }
  const html=fs.readFileSync(path.join(root,'web/index.html'));
  const css=fs.readFileSync(path.join(root,'src/styles.css'));
  const id=/name="drafti-build" content="([a-f0-9]{64})"/.exec(html.toString('utf8'))?.[1]||null;
  const report={schema:1,createdAt:new Date().toISOString(),buildId:id,htmlSha256:crypto.createHash('sha256').update(html).digest('hex'),
    cssSha256:crypto.createHash('sha256').update(css).digest('hex'),viewport:'514px board capture, 8×8 opening position; 21 tables × 8 surfaces × high visibility off/on',
    method:'3×3 median raster patches compare adjacent empty playable-square centres. For each of 24 pieces and 64 directions, compare the exact rendered rim pixel with the same direction’s nearby local-square patch, accounting for per-square texture and gradient. Each direction uses the strongest sample over 87 radii; the 10th percentile needs a 3:1 separator on at least 90% of directions without blurring a fine rim.',
    threshold:3,captures:rows.length,themeCount:themeCoverage.size,fullThemeCoverage:themeCoverage.size===21,
    themes:[...themeCoverage.keys()].sort(),squareFailCases:rows.filter(x=>x.squareP10<3).length,rimFailCases:rows.filter(x=>x.rimP10<3).length,
    weakestSquares:rows.slice().sort((a,b)=>a.squareP10-b.squareP10).slice(0,20),weakestRims:rows.slice().sort((a,b)=>a.rimP10-b.rimP10).slice(0,20),rows};
  fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({captures:rows.length,squareFailCases:report.squareFailCases,rimFailCases:report.rimFailCases,
    weakestSquares:report.weakestSquares.slice(0,4),weakestRims:report.weakestRims.slice(0,4),report:output},null,2));
  if(report.squareFailCases||report.rimFailCases)process.exitCode=1;
}
main().catch(error=>{console.error(error);process.exitCode=1;});
