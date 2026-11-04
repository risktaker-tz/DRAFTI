'use strict';
// Independent, resumable content corroboration of actual processed crowd cuts.
// Never imported by the game. ASR uncertainty is retained, not called listening.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),{execFileSync}=require('child_process'),{pathToFileURL}=require('url');
const ort=require('./tooling/node_modules/onnxruntime-web');ort.env.wasm.numThreads=1;
globalThis[Symbol.for('onnxruntime')]=ort;
const {pipeline,env}=require('./tooling/node_modules/@huggingface/transformers/dist/transformers.node.cjs');
let ownedLock=null;
async function main(){
  const root=path.resolve(__dirname,'..'),queue=JSON.parse(fs.readFileSync(process.argv[2]||path.join(__dirname,'tooling/audience-asr-queue.json')));
  const output=process.argv[3]||path.join(root,'docs/audience-vibes/independent-asr.json');
  const lock=output+'.lock';
  if(fs.existsSync(lock)){
    const prior=JSON.parse(fs.readFileSync(lock,'utf8'));let alive=true;
    try{process.kill(prior.pid,0);}catch(error){if(error.code==='ESRCH')alive=false;else throw error;}
    if(alive)throw Error('ASR review already running as process '+prior.pid);
    fs.unlinkSync(lock);
  }
  fs.writeFileSync(lock,JSON.stringify({pid:process.pid,startedAt:new Date().toISOString()}),{flag:'wx'});ownedLock=lock;
  env.useWasmCache=false;env.backends.onnx.wasm.wasmPaths=pathToFileURL(path.join(__dirname,'tooling/node_modules/onnxruntime-web/dist/')).href;
  env.cacheDir=path.join(__dirname,'tooling/onnx-models');env.allowRemoteModels=false;env.localModelPath=env.cacheDir+'/';
  const modelHash=crypto.createHash('sha256').update(fs.readFileSync(path.join(env.cacheDir,'onnx-community/whisper-tiny.en/onnx/decoder_model_merged_quantized.onnx'))).digest('hex');
  if(modelHash!=='c0592d0749413c960569e1c7fb806b060d5d18f3ebad4a95cbf9a77dc6e9be52')throw Error('Unverified model');
  const report=fs.existsSync(output)?JSON.parse(fs.readFileSync(output)):{model:'onnx-community/whisper-tiny.en q8, one-thread WebAssembly',modelHash,sourceCommit:'f1978efa8c9d94dcff1d6a82e58f105367e012e7',scope:'Independent ASR corroboration, not human listening certification; errors and recognition differences remain explicit.',results:[]};
  if(report.modelHash!==modelHash)throw Error('Existing review uses a different model; preserve it separately');
  report.scope='Independent English ASR corroboration on hash-verified processed audio; not human listening or all-language safety certification. Errors and recognition differences remain explicit.';
  const asr=await pipeline('automatic-speech-recognition','onnx-community/whisper-tiny.en',{device:'auto',dtype:'q8',session_options:{executionProviders:['wasm'],intraOpNumThreads:1,interOpNumThreads:1}});
  for(const item of queue){
    if(report.results.some(r=>r.id===item.id&&r.sha256===item.sha256&&!r.error))continue;
    const file=path.join(root,'audience-pack',item.file);
    if(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==item.sha256)throw Error('Audio changed: '+item.id);
    let row={id:item.id,sha256:item.sha256,zai:item.zai};
    try{
      const pcm=execFileSync(path.join(__dirname,'tooling/node_modules/ffmpeg-static/ffmpeg.exe'),['-v','error','-i',file,'-ac','1','-ar','16000','-f','f32le','pipe:1'],{windowsHide:true});
      const bytes=Uint8Array.from(pcm);row.local=(await asr(new Float32Array(bytes.buffer),{max_new_tokens:96})).text;
    }catch(error){row.error=String(error.message).slice(0,300);}
    report.results=report.results.filter(r=>r.id!==item.id);report.results.push(row);report.at=new Date().toISOString();
    const temporary=output+'.'+process.pid+'.tmp';
    fs.writeFileSync(temporary,JSON.stringify(report,null,2)+'\n');fs.renameSync(temporary,output);
    console.log(item.id,report.results.length,row.error?'ERROR':JSON.stringify(row.local).slice(0,110));
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{if(ownedLock)fs.unlinkSync(ownedLock);});
