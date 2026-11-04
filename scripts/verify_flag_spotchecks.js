'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const report=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
assert.equal(report.running,false);assert.equal(report.complete,true);assert.deepEqual(report.errors,[]);
assert.equal(report.rows.length,120);
const groups=new Map(),keys=new Set();
for(const row of report.rows){
  assert(row.on&&row.a&&row.b);assert.notEqual(row.a,row.b,'Clashing seats must separate');
  const pair=row.pair.join('/'),key=[pair,row.theme,row.material,row.hv].join('/');
  assert(!keys.has(key));keys.add(key);
  if(!groups.has(pair))groups.set(pair,[]);groups.get(pair).push(row);
}
assert.deepEqual([...groups.keys()],['TZ/KE','IT/BF','ID/MC','CI/EC','MG/KE']);
for(const [pair,rows] of groups){
  assert.equal(rows.length,24,pair);
  assert.equal(new Set(rows.map(row=>row.theme)).size,4);
  assert.equal(new Set(rows.map(row=>row.material)).size,3);
  assert.equal(new Set(rows.map(row=>row.hv)).size,2);
  assert.equal(new Set(rows.map(row=>JSON.stringify([row.a,row.b,row.ivory,row.ebony]))).size,1,
    pair+' flag faces must override theme, material and high-visibility colours');
}
const steps=Object.fromEntries(report.steps.map(row=>[row.event,row]));
assert.equal(steps.renamed.a,'');assert.equal(steps.renamed.b,steps.original.b);
for(const name of ['name-restored','reset-restored'])for(const field of ['a','b','ivory','ebony'])
  assert.equal(steps[name][field],steps.original[field],name+' '+field);
for(const name of ['hotseat-flags-off','computer-flags-off']){
  assert.equal(steps[name].on,false);assert.equal(steps[name].a,'');assert.equal(steps[name].b,'');
}
assert.equal(steps['computer-flags-on'].mode,'ai');assert(steps['computer-flags-on'].on);
assert.equal(steps['computer-flags-on'].a,steps.original.a);
console.log('PASS: 120 rendered flag cases, five known clash pairs, four themes, three materials, high visibility, both rename restoration paths and flags on/off in Computer and Two players.');
