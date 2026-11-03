'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),{spawnSync}=require('child_process');
const root=path.resolve(__dirname,'..'),m=JSON.parse(fs.readFileSync(path.join(root,'web/audience-vibes/manifest.json')));
const ffmpeg=path.join(__dirname,'tooling/node_modules/ffmpeg-static/ffmpeg.exe'),rows=[];
for(const c of m.clips){
  const file=path.join(root,'web/audience-vibes',c.file),bytes=fs.readFileSync(file),sha256=crypto.createHash('sha256').update(bytes).digest('hex');
  const r=spawnSync(ffmpeg,['-hide_banner','-i',file,'-af','volumedetect','-f','null','-'],{encoding:'utf8',maxBuffer:1024*1024});
  const match=/max_volume:\s*(-?[\d.]+) dB/.exec(r.stderr),peak=match?+match[1]:null;
  const pass=r.status===0&&sha256===c.sha256&&bytes.length===c.bytes&&peak!==null&&peak<=-1.5;
  rows.push({id:c.id,sha256,bytes:bytes.length,decodedPeakDbfs:peak,pass});
}
const report={scope:'Actual MP3 bytes, hashes and independently decoded peaks; not human listening certification',clips:rows.length,bytes:rows.reduce((n,r)=>n+r.bytes,0),failures:rows.filter(r=>!r.pass),rows};
fs.writeFileSync(path.join(root,'docs/audience-vibes/asset-verification.json'),JSON.stringify(report,null,2)+'\n');
console.log({clips:report.clips,bytes:report.bytes,failures:report.failures});process.exitCode=report.failures.length?1:0;
