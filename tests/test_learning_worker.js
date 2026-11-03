'use strict';
// Run the actual browser-worker source in a real Node worker thread, with
// only the browser message boundary adapted. Search/classification is real.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const {Worker}=require('worker_threads');
const root=path.join(__dirname,'..'),ui=fs.readFileSync(path.join(root,'src/ui.js'),'utf8');
const makeEngine=require('../src/engine'),E=makeEngine(),rs=E.RULESETS.american;
const c={makeEngine};vm.createContext(c);
vm.runInContext(ui.slice(ui.indexOf('  function workerSource('),ui.indexOf('  function getWorker('))+'this.source=workerSource();',c);
const w=new Worker("const {parentPort}=require('worker_threads');const self={};const postMessage=m=>parentPort.postMessage(m);\n"+c.source+"\nparentPort.on('message',data=>self.onmessage({data}));",{eval:true});
const timer=setTimeout(()=>{console.error('Worker protocol timed out');w.terminate();process.exitCode=1;},15000);
w.once('error',e=>{clearTimeout(timer);console.error(e);process.exitCode=1;});
w.once('message',async r=>{
  try {
    assert.equal(r.cmd,'verdict');assert.equal(r.id,73);
    assert(Number.isInteger(r.depth)&&r.depth>=1,'Real search depth reaches the learning gate');
    assert(Number.isFinite(r.delta));assert.equal(typeof r.onlyMove,'boolean');
    assert(r.opp&&Number.isFinite(r.opp.bestScore));
    console.log('Learning worker passed: real threaded classify returns depth, evaluated loss, forced-move status and opponent analysis');
  } catch(e){console.error(e);process.exitCode=1;}
  finally {clearTimeout(timer);await w.terminate();}
});
const board=E.setupBoard(rs),side=rs.firstSide,m=E.legalMoves(rs,board,side)[0];
w.postMessage({cmd:'classify',id:73,rsId:rs.id,side,noProgress:0,board:Array.from(board),playedPath:m.path.join(),withOpp:true,opts:{budgetMs:340,maxDepth:9,jitter:0,fullRootWindow:true}});
