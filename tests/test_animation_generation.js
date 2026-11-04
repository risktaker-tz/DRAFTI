'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const ui=fs.readFileSync(path.join(__dirname,'../src/ui.js'),'utf8');
async function scenario(cancel){
  let release,commits=0;
  const c={G:{phase:'idle',board:new Int8Array([1,-1]),side:1,noProg:0,legal:[]},gameEpoch:1,humanTurn:()=>false,
    updateAll(){},prepareArenaReply(){},animateMove:()=>new Promise(resolve=>release=resolve),commitMove(){commits++;throw Error('reached valid commit');}};
  vm.runInNewContext(ui.slice(ui.indexOf('  async function executeMove('),ui.indexOf('  function commitMove(')),c);
  const running=c.executeMove({from:0,path:[0,2],caps:[]});
  if(cancel)c.gameEpoch++;release();
  try{await running;}catch(error){assert.equal(error.message,'reached valid commit');}
  return commits;
}
(async()=>{
  assert.equal(await scenario(false),1,'An unchanged match commits its completed animation');
  for(const action of ['switch player','create player','reset league'])assert.equal(await scenario(true),0,action+' cannot commit an old move into a new player');
  console.log('Animation generation passed: normal completion commits; player switching/creation/reset cancel old asynchronous commits');
})().catch(error=>{console.error(error);process.exitCode=1;});
