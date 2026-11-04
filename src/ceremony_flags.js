/* Flag artwork does not depend on a platform's support for flag emoji. No network. */
(() => {
  const urls=new Map();let pending;
  const load=()=>pending??=(async()=>{
    if(typeof DecompressionStream!=='function')return null;
    const bytes=Uint8Array.from(atob(globalThis.DRAFTI_FLAG_ARCHIVE),c=>c.charCodeAt(0));
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).json();
  })().catch(()=>null);
  globalThis.DRAFTI_FLAGS={
    async render(element,code){
      if(!element)return false;
      element.dataset.flagCode=code;
      const map=await load();if(!map?.[code]||element.dataset.flagCode!==code||!element.isConnected)return false;
      if(!urls.has(code))urls.set(code,URL.createObjectURL(new Blob([map[code]],{type:'image/svg+xml'})));
      const image=new Image();image.alt='';image.className='cer-flag';image.src=urls.get(code);
      await image.decode().catch(()=>{});
      if(element.dataset.flagCode!==code||!element.isConnected)return false;
      element.replaceChildren(image);return true;
    },
  };
  load();
})();
