import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const require=createRequire(import.meta.url);
const result=await build({entryPoints:['src/components/TeachingSessionDetails.tsx'],bundle:true,packages:'external',platform:'node',format:'cjs',write:false,plugins:[{
 name:'entry-test-context',setup(builder){
  builder.onResolve({filter:/^(react|\.\.\/context\/AppContext|\.\.\/lib\/businessPersistence)$/},args=>{
   if(args.kind==='require-call')return {path:args.path,external:true};
   return {path:args.path,namespace:'entry-test'};
  });
  builder.onLoad({filter:/.*/,namespace:'entry-test'},({path})=>({contents:path==='react'
   ? `const React=require('react');export default React;export const useEffect=()=>{};export const useState=init=>[typeof init==='function'?init():init,()=>{}];`
   : path.includes('AppContext') ? `export const useApp=()=>globalThis.entryApp;`
   : `export const useBusinessValue=()=>[[],()=>{}];`,loader:'js'}));
 }
}]});
const compiled={exports:{}};
new Function('require','module','exports',result.outputFiles[0].text)(require,compiled,compiled.exports);
const {TeachingSessionDetails}=compiled.exports;
const RealDate=Date;
let clock='2026-11-03T17:59:59+07:00',entered=0;
const notices=[],opened=[];
globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[clock]));}static now(){return new RealDate(clock).getTime();}};
globalThis.window={open:(...args)=>opened.push(args)};
globalThis.entryApp={students:[],teachers:[],timeSlots:[],subjects:[],levels:[],showToast:message=>notices.push(message)};
const props={cls:{id:'C1',code:'C1',name:'Demo',subject:'MATH',model:'1-1',grade:'G3',level:'L1',schedule:'T3 (18:00 - 19:30)',roomLink:'https://example.com/room',materials:[],studentIds:[]},session:1,date:'2026-11-03',time:'18:00 - 19:30',onSelect:()=>{}};
function findButton(node){
 if(!node||typeof node!=='object')return;
 if(node.type==='button'&&node.props.children==='Vào học')return node;
 for(const child of [node.props?.children].flat(Infinity)){const found=findButton(child);if(found)return found;}
}
try{
 for(const onEnter of [undefined,()=>entered++]){
  const button=findButton(TeachingSessionDetails({...props,onEnter}));
  assert.ok(button,'Keep the clickable Vào học button before the start');
  assert.ok(!button.props.disabled);
  button.props.onClick();
 }
 assert.equal(notices.length,2);
 assert.match(notices[0],/Buổi học chưa đến giờ/);
 assert.equal(opened.length,0,'Early clicks must not open the room');
 assert.equal(entered,0,'Early clicks must not invoke the check-in callback');
 const button=findButton(TeachingSessionDetails({...props,onEnter:()=>entered++}));
 clock='2026-11-03T18:00:00+07:00';
 button.props.onClick();
 assert.equal(entered,1,'Check the current time even before a component rerender');
 console.log('PASS class entry clicks: early toast, no popup/check-in, enabled button, exact start allowed.');
}finally{globalThis.Date=RealDate;delete globalThis.window;delete globalThis.entryApp;}
