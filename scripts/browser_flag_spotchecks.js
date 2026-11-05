'use strict';
if (!window.__drafti || __drafti.state.mode !== 'hotseat' || __drafti.state.history.length) {
  throw Error('Use a fresh Two players opening in the isolated review browser');
}
window.qaFlags={running:true,extended:true,rows:[],steps:[],errors:[],startedAt:new Date().toISOString(),
  scope:'Production controls and rendered CSS for six flag pairs, four themes, three materials and high visibility; human-mode opt-in and both rename restoration paths. Not all-nation colour or crown visual certification.'};
(async()=>{
  const app=__drafti,report=qaFlags;
  app.menu.open();
  const change=(id,value)=>{const node=document.getElementById(id);node.value=value;node.dispatchEvent(new Event('change',{bubbles:true}));};
  const flags=enabled=>{const node=document.getElementById('humanFlags');node.checked=enabled;node.dispatchEvent(new Event('change',{bubbles:true}));};
  const snapshot=()=>({on:document.body.classList.contains('flags-on'),
    a:document.body.style.getPropertyValue('--side-a-1'),b:document.body.style.getPropertyValue('--side-b-1'),
    ivory:getComputedStyle(document.querySelector('.piece.ivory .body')).backgroundImage,
    ebony:getComputedStyle(document.querySelector('.piece.ebony .body')).backgroundImage});
  flags(true);
  for(const pair of [['TZ','KE'],['IT','BF'],['ID','MC'],['CI','EC'],['MG','KE'],['NZ','QA']]){
    change('nationIvory',pair[0]);change('nationEbony',pair[1]);
    for(const theme of ['marble','royale','glass','maplewood']){
      document.querySelector('.theme-sw[data-v="'+theme+'"]').click();
      for(const material of ['theme','woodturn','steel']){
        document.querySelector('#segPieces [data-v="'+material+'"]').click();
        for(const hv of [false,true]){
          if(app.settings.hv!==hv)document.getElementById('btnHV').click();
          await new Promise(resolve=>requestAnimationFrame(resolve));
          report.rows.push({pair,theme,material,hv,...snapshot()});
        }
      }
    }
  }
  change('nationIvory','TZ');change('nationEbony','KE');
  if(document.querySelector('.name-more').textContent.startsWith('+'))document.querySelector('.name-more').click();
  const rename=value=>{
    const chip=[...document.querySelectorAll('#nameGrid .name-chip')].find(node=>/Tanzania|Studio side/.test(node.textContent));
    if(!chip)throw Error('Tanzania rename control missing');
    chip.click();const input=document.querySelector('#nameGrid .name-edit');input.value=value;input.blur();
  };
  report.steps.push({event:'original',...snapshot()});
  rename('Studio side');report.steps.push({event:'renamed',...snapshot()});
  rename('Tanzania');report.steps.push({event:'name-restored',...snapshot()});
  rename('Studio side');document.getElementById('btnNameReset').click();
  report.steps.push({event:'reset-restored',...snapshot()});
  flags(false);report.steps.push({event:'hotseat-flags-off',...snapshot()});
  document.querySelector('#segMode [data-v="ai"]').click();
  flags(true);report.steps.push({event:'computer-flags-on',mode:app.state.mode,...snapshot()});
  flags(false);report.steps.push({event:'computer-flags-off',mode:app.state.mode,...snapshot()});
  app.menu.close();report.running=false;report.complete=report.rows.length===144;
  report.finishedAt=new Date().toISOString();
})().catch(error=>{qaFlags.running=false;qaFlags.errors.push(String(error));});
'Started rendered flag spot checks';
