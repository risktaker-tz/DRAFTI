'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const file=path.resolve(__dirname,'../scripts/arena_harness.js'),source=fs.readFileSync(file,'utf8');
function fingerprint(change){
  const module={exports:{}},localFs=Object.create(fs),ui=path.resolve(__dirname,'../src/ui.js');
  localFs.readFileSync=(name,...args)=>{const value=fs.readFileSync(name,...args);return path.resolve(name)===ui?change(value):value;};
  const context={module,exports:module.exports,__dirname:path.dirname(file),console,
    require:name=>name==='fs'?localFs:require(name)};
  vm.runInNewContext(source,context,{filename:file});
  return module.exports.createHarness().fingerprint;
}
const original=fingerprint(text=>text);
assert.notEqual(fingerprint(text=>{
  assert(text.includes('const deadline=Date.now()+180'));
  return text.replace('const deadline=Date.now()+180','const deadline=Date.now()+181');
}),original,'Changing the legal winning-continuation proof must invalidate saved fairness evidence');
assert.equal(fingerprint(text=>text+'\n// unrelated presentation comment\n'),original,
  'Unrelated source comments do not invalidate the production arena kernel');
console.log('PASS draw-proof implementation is included in resumable arena fingerprints');
