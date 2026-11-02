'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),context={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'src/audio.manifest.js'),'utf8'),context);
const missingSourceFiles=[],manifestSourceMismatches=[];
const bytes=clip=>Buffer.from(clip.d.split(',')[1],'base64');
for(const[id,clip]of Object.entries(context.window.DRAFTI_SFX)){
 const filename=path.join(root,'src/audio',id+'.mp3');
 if(!fs.existsSync(filename))missingSourceFiles.push(id);
 else if(!bytes(clip).equals(fs.readFileSync(filename)))manifestSourceMismatches.push(id);
}
const selectedClips=['later_moments','later_hours','shrimp1','shrimp2','v_retire1','v_retire2'].map(id=>({id,credit:context.window.DRAFTI_SFX[id].b,sha256:crypto.createHash('sha256').update(bytes(context.window.DRAFTI_SFX[id])).digest('hex')}));
const report={clips:Object.keys(context.window.DRAFTI_SFX).length,missingSourceFiles,manifestSourceMismatches,selectedClips,limitation:'Byte equality proves which source file is embedded. It does not independently prove provenance or playback reachability.'};
fs.writeFileSync(path.join(root,'docs/audio-source-consistency.json'),JSON.stringify(report,null,2)+'\n');
console.log(report.clips+' clips checked; '+missingSourceFiles.length+' missing source files; '+manifestSourceMismatches.length+' embedding mismatches');
if(missingSourceFiles.length||manifestSourceMismatches.length)process.exitCode=1;
