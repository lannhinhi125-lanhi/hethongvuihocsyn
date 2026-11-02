import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import React from 'react';
const require=createRequire(import.meta.url);
// Execute the real pagination callbacks with a small persistent hook store.
const result=await build({entryPoints:['src/components/Pagination.tsx'],bundle:true,packages:'external',platform:'node',format:'cjs',write:false,plugins:[{
 name:'pagination-hooks',setup(builder){
  builder.onResolve({filter:/^react$/},args=>args.kind==='require-call'?{path:'react',external:true}:{path:'react',namespace:'hooks'});
  builder.onLoad({filter:/.*/,namespace:'hooks'},()=>({contents:`
   const React=require('react');export default React;
   export const Children=React.Children,isValidElement=React.isValidElement;
   export const useEffect=()=>{};
   export function useState(initial){const h=globalThis.listHooks,i=h.cursor++;if(!(i in h.slots))h.slots[i]=typeof initial==='function'?initial():initial;return [h.slots[i],value=>{h.slots[i]=typeof value==='function'?value(h.slots[i]):value;}];}
   export function useRef(initial){const h=globalThis.listHooks,i=h.cursor++;if(!(i in h.slots))h.slots[i]={current:initial};return h.slots[i];}
  `,loader:'js'}));
 }
}]});
const compiled={exports:{}};
new Function('require','module','exports',result.outputFiles[0].text)(require,compiled,compiled.exports);
globalThis.listHooks={cursor:0,slots:[]};
const rows=Array.from({length:25},(_,id)=>React.createElement('article',{key:id,'data-id':id,'data-sort-time':Date.parse(`2026-11-${String(id+1).padStart(2,'0')}`)},String(id)));
const render=(children=rows)=>{
 globalThis.listHooks.cursor=0;
 return compiled.exports.PaginatedList({children}).props.children[1].props.page;
};
const ids=page=>page.rows.map(row=>row.props['data-id']);
try{
 let page=render();
 assert.equal(page.order,'newest');
 assert.deepEqual(ids(page),[24,23,22,21,20,19,18,17,16,15]);
 page.onChange(2);page=render();
 assert.equal(page.page,2);
 assert.deepEqual(ids(page),[4,3,2,1,0]);
 page.setOrder('oldest');page=render();
 assert.equal(page.page,0,'Changing order resets to the first page');
 assert.deepEqual(ids(page),[0,1,2,3,4,5,6,7,8,9]);
 page.onChange(1);page=render();
 assert.deepEqual(ids(page),[10,11,12,13,14,15,16,17,18,19]);
 page.setOrder('newest');page=render();
 assert.equal(page.page,0);
 assert.deepEqual(ids(page),[24,23,22,21,20,19,18,17,16,15]);
 page=render(rows.filter(row=>row.props['data-id']<3));
 assert.deepEqual(ids(page),[2,1,0],'Sorting applies to the filtered records');
 console.log('PASS ordering interaction: newest default, full-dataset order, oldest/newest switching, pagination reset and filtering.');
}finally{delete globalThis.listHooks;}
