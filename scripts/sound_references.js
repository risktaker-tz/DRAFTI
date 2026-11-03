'use strict';
const acorn=require('./tooling/node_modules/acorn');
function collectSoundReferences(source,method='play') {
 const ast=acorn.parse(source,{ecmaVersion:'latest',locations:true});
 const vars=new Map(),properties=new Map(),calls=[],optional=new Set();
 const property=n=>n?.computed?n.property?.value:n?.property?.name;
 function walk(n){if(!n||typeof n!=='object')return;if(n.type==='VariableDeclarator'&&n.id.type==='Identifier'&&n.init){if(!vars.has(n.id.name))vars.set(n.id.name,[]);vars.get(n.id.name).push(n.init);}
 if(n.type==='Property'){const key=n.key.name||n.key.value;if(!properties.has(key))properties.set(key,[]);properties.get(key).push(n.value);}
 if(n.type==='CallExpression'&&n.callee.type==='MemberExpression'&&n.callee.object.name==='SFX_BANK'&&property(n.callee)===method)calls.push(n);
 if(n.type==='ConditionalExpression'&&n.test.type==='MemberExpression'&&n.test.object.type==='MemberExpression'&&n.test.object.object.name==='SFX_BANK'&&property(n.test.object)==='defs'&&n.consequent.type==='Literal'&&n.consequent.value===property(n.test))optional.add(n.consequent.value);
 for(const [key,value]of Object.entries(n))if(key!=='loc'){if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object')walk(value);}}
 walk(ast);
 const union=values=>new Set(values.flatMap(v=>[...v]));
 const styles=(vars.get('STYLES')||[])[0]?.elements?.map(n=>n.properties.find(p=>p.key.name==='id').value.value)||[];
 function values(n,seen=new Set()){
  if(!n)return new Set();
  if(n.type==='Literal')return new Set(typeof n.value==='string'?[n.value]:[]);
  if(n.type==='Identifier'){if(seen.has(n.name))return new Set();const next=new Set(seen).add(n.name);return union((vars.get(n.name)||[]).map(x=>values(x,next)));}
  if(n.type==='ArrayExpression')return union(n.elements.map(x=>values(x,seen)));
  if(n.type==='ConditionalExpression')return union([values(n.consequent,seen),values(n.alternate,seen)]);
  if(n.type==='LogicalExpression')return union([values(n.left,seen),values(n.right,seen)]);
  if(n.type==='MemberExpression'){
   const key=property(n);
   if(key==='intro')return new Set(styles.map(id=>'s_in_'+id));
   if(key==='catch')return new Set(styles.flatMap(id=>['s_'+id+'_1','s_'+id+'_2']));
   if(['snd','sfx','lines'].includes(key))return union((properties.get(key)||[]).map(x=>values(x,seen)));
   return values(n.object,seen);
  }
  if(n.type==='CallExpression'){
   if(n.callee.name==='thinkSound'||n.callee.name==='THINK_DECK')return values({type:'Identifier',name:'THINK_POOL'},seen);
   if(['pick','makeDeck'].includes(n.callee.name))return values(n.arguments[0],seen);
   if(vars.has(n.callee.name))return values({type:'Identifier',name:n.callee.name},seen);
   if(n.callee.type==='MemberExpression'){
    if(property(n.callee)==='concat')return union([values(n.callee.object,seen),...n.arguments.map(x=>values(x,seen))]);
    if(property(n.callee)==='slice')return values(n.callee.object,seen);
   }
  }
  return new Set();
 }
 const unresolved=[],references=new Set(),sites=[];
 for(const call of calls){const ids=[...values(call.arguments[0])];sites.push({line:call.loc.start.line,expression:source.slice(call.arguments[0].start,call.arguments[0].end),ids});if(!ids.length)unresolved.push(sites.at(-1));ids.forEach(id=>references.add(id));}
 return {references:[...references].sort(),optional:[...optional],unresolved,sites};
}
module.exports={collectSoundReferences};
if(require.main===module){const fs=require('fs'),path=require('path');console.log(JSON.stringify(collectSoundReferences(fs.readFileSync(path.join(__dirname,'../src/ui.js'),'utf8')),null,2));}
