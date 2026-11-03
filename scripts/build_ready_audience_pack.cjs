'use strict';
// Assemble the reviewed incremental subset. The larger ZAI working archive is
// preserved separately; an encoded file or metadata-only approval is not enough.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),vm=require('vm'),{pathToFileURL}=require('url');
const root=path.resolve(__dirname,'..'),input=path.join(root,'audience-pack'),out=path.join(root,'web/audience-vibes');
const allowed={106237:'gasp',124022:'cheer',138111:'applause',150956:'disappointment',178610:'applause',207779:'gasp',
  217464:'venue_bed',223745:'cheer',237676:'cheer',243944:'applause',249735:'chatter_bed',249938:'applause',267249:'cheer',
  30040:'funny_laugh',324897:'disappointment',324898:'gasp',348978:'cheer',360703:'venue_bed',371222:'venue_bed',397317:'gasp',
  397434:'cheer',428231:'applause',432868:'cheer',432874:'cheer',438421:'cheer_kids',445711:'chatter_bed',453948:'chatter_bed',
  467042:'funny_laugh',482990:'chatter_bed',490645:'venue_bed',503620:'funny_laugh',520370:'funny_laugh',533430:'cheer',540299:'chatter_bed',
  615586:'chatter_bed',637466:'chatter_bed',637468:'applause',648409:'disappointment',649182:'chatter_bed',651704:'tension_bed',
  678537:'disappointment',678540:'disappointment',678669:'funny_laugh',678671:'chatter_bed',690190:'chatter_bed',706805:'chatter_bed',
  707212:'applause',724600:'cheer_kids',730908:'cheer',733614:'encouragement_chant',735499:'venue_bed',735578:'applause',
  745599:'cheer_kids',763924:'disappointment',789944:'applause',810742:'cheer',819050:'cheer_kids',851718:'funny_laugh',857740:'tension_bed',870643:'funny_laugh',875485:'chatter_bed'};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
async function main(){
  const {parseFile}=await import(pathToFileURL(path.join(__dirname,'tooling/node_modules/music-metadata/lib/index.js')).href);
  const transcripts=JSON.parse(fs.readFileSync(path.join(input,'review_state/transcripts.json')));
  const independent=JSON.parse(fs.readFileSync(path.join(root,'docs/audience-vibes/independent-asr.json')));
  const existing=JSON.parse(fs.readFileSync(path.join(input,'manifest.json'))),previous=new Map(existing.clips.map(c=>[c.id,c.crowd]));
  const clips=[],decisions=[];fs.mkdirSync(path.join(out,'audio'),{recursive:true});
  for(const [number,event] of Object.entries(allowed)){
    const c=JSON.parse(fs.readFileSync(path.join(input,'review_state/clips',number+'.json'))),id=c.id;
    const tr=transcripts[id],local=independent.results.find(r=>r.id===id&&!r.error&&r.sha256===c.sha256);
    const reject=reason=>decisions.push({id,status:'pending',reason});
    if(!tr?.ok||!local){reject('Independent decoded-audio review incomplete');continue;}
    if(/\b(good night|tonight|good morning|good evening|national anthem|president|subscribe)\b/i.test(tr.text+' '+local.local)){
      reject('Possible time-specific or unrelated wording requires further review');continue;
    }
    if(/music|song|concert|singing|singalong|performance|film|movie/i.test(c.title+' '+c.sourceDescription)){reject('Possible performance/music context requires further review');continue;}
    if(!/^CC0|^CC BY /.test(c.license)||!c.licenseUrl||!c.author||!c.sourceUrl){reject('Incomplete source rights');continue;}
    if(c.peakDbfs> -1.49||c.durationSec<(event.endsWith('_bed')?8:.8)||c.durationSec>(event.endsWith('_bed')?15.5:6.5)){reject('Measured peak/duration outside pack limits');continue;}
    const file=path.join(input,c.file);if(!fs.existsSync(file)){reject('Processed recording missing');continue;}
    const bytes=fs.readFileSync(file);if(bytes.length!==c.bytes||sha(bytes)!==c.sha256)throw Error('Changed source '+id);
    const meta=await parseFile(file);if(meta.format.numberOfChannels!==1||meta.format.sampleRate!==22050||meta.format.bitrate>56500)throw Error('Invalid actual format '+id);
    const crowd=previous.get(id)||(c.catalogIdentity==='either'?(+number%2?'B':'A'):c.catalogIdentity);
    const entry={...c,crowd,event,speech:!!c.windowSpeechFlag,language:'nonverbal-or-unintelligible',
      transcript:tr.text===local.local.trim()?tr.text:'Recognizers differ; no verbatim words asserted. See recorded review evidence.',
      intensity:event.endsWith('_bed')?'low':['cheer','gasp'].includes(event)?'high':'medium',
      valence:['disappointment','tension_bed'].includes(event)?'negative':['cheer','applause','cheer_kids','encouragement_chant'].includes(event)?'positive':'neutral',
      loopable:event.endsWith('_bed'),review:{verdict:'approved',method:'Decoded MP3 integrity/format, two independent ASR outputs, source licence/context and conservative event review',
        caveats:['No human listening certification. ASR uncertainty is retained; no invented displayed captions.',...(c.catalogEvent!==event?['Original broad event corrected to '+event]:[])]}};
    clips.push(entry);decisions.push({id,status:'accepted',event,originalEvent:c.catalogEvent,sha256:c.sha256,zai:tr.text,independent:local.local,
      reason:'Neutral crowd reaction or unintelligible ambience; checked actual decoded outputs and source context, not metadata alone'});
    fs.copyFileSync(file,path.join(out,c.file));
  }
  const pack={schema:'drafti-audience-pack/1',version:'partial-2026-11-03',scope:'Incremental reviewed batch; 501-source full pack remains unfinished',sourceCommit:independent.sourceCommit,clips};
  const sandbox={URL};vm.runInNewContext(fs.readFileSync(path.join(root,'src/audience.js'),'utf8')+'this.check=validateAudiencePack;',sandbox);sandbox.check(pack);
  fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(pack,null,2)+'\n');
  const credits=['# Audience Vibes — incremental pack','','Original source recordings; no revoicing, pitch variants or artificial crowd copies.',''];
  for(const c of clips)credits.push('## '+c.id+' · crowd '+c.crowd,'','Author: '+c.author+'. [Source]('+c.sourceUrl+'). [Licence: '+c.license+']('+c.licenseUrl+').','',c.modifications+'. SHA256 '+c.sha256+'.','');
  fs.writeFileSync(path.join(out,'CREDITS.md'),credits.join('\n'));
  const total=clips.reduce((n,c)=>n+c.bytes,0),report={sourceCommit:independent.sourceCommit,installed:clips.length,bytes:total,sha256:sha(fs.readFileSync(path.join(out,'manifest.json'))),
    scope:'Incremental tool-assisted review, not a complete 501-clip pack or human listening certificate',decisions};
  fs.writeFileSync(path.join(root,'docs/audience-vibes/ready-batch-review.json'),JSON.stringify(report,null,2)+'\n');
  const template=path.join(root,'src/index.template.html');fs.writeFileSync(template,fs.readFileSync(template,'utf8').replace(/(id="btnAudienceDownload">)[^<]*/,(_,a)=>a+'Download audience pack · '+(total/1048576).toFixed(1)+' MB'));
  console.log({clips:clips.length,bytes:total,crowds:clips.reduce((a,c)=>(a[c.crowd]++,a),{A:0,B:0}),pending:decisions.filter(x=>x.status!=='accepted').length});
}
main().catch(error=>{console.error(error);process.exitCode=1;});
