'use strict';
// Embed the exact verified SVG sources, compressed together to retain the offline size budget.
const fs=require('fs'),path=require('path'),zlib=require('zlib'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),reference=JSON.parse(fs.readFileSync(path.join(root,'scripts/flag_reference.json'),'utf8'));
const map={};
for(const entry of reference.entries.slice().sort((a,b)=>a.code.localeCompare(b.code))){
  const bytes=fs.readFileSync(path.join(root,'scripts/flag_sources',entry.code+'.svg'));
  if(crypto.createHash('sha256').update(bytes).digest('hex')!==entry.svgSha256)throw Error('Unverified flag '+entry.code);
  map[entry.code]=bytes.toString('utf8');
}
const compressed=zlib.gzipSync(JSON.stringify(map),{level:9}).toString('base64');
fs.writeFileSync(path.join(root,'src/ceremony_flags.data.js'),'globalThis.DRAFTI_FLAG_ARCHIVE='+JSON.stringify(compressed)+';\n');
console.log('Embedded '+Object.keys(map).length+' verified flags: '+compressed.length+' base64 bytes');
