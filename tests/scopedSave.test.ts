import assert from 'node:assert/strict';
import { supabase } from '../src/config/supabase';
import { loginAccount } from '../src/lib/accountSession';
import { loadBusinessData, setBusinessValue, getBusinessSnapshot, waitForBusinessSave } from '../src/lib/businessPersistence';

const actor={madinhdanh:'ADMIN',hoten:'Admin',trangthai:'active'};
const session={actor,users:[actor],role_groups:[]};
const subject={madinhdanh:'S',mamonhoc:'M',tenmonhoc:'Original'};
let stored:any={subjects:[subject],levels:[{madinhdanh:'L',matrinhdo:'L',tentrinhdo:'Keep me'}]};
let release:()=>void=()=>{};
let fail=false;
let accountReads=0;
const changes:any[]=[];
const mockRpc=async(name:string,args:any)=>{
 if(name==='vuihoc_login')return {data:{...session,token:'token'}};
 if(name==='vuihoc_session'){accountReads++;return {data:session};}
 if(name==='vuihoc_business_data')return {data:structuredClone(stored)};
 if(name==='vuihoc_save_business'){
  changes.push(structuredClone(args.p_changes));
  await new Promise<void>(resolve=>{release=resolve;});
  if(fail)return {error:{message:'Rejected'}};
  for(const edit of args.p_changes){
   const id=(edit.after||edit.before).madinhdanh;
   const previous=stored[edit.dataset].find((row:any)=>row.madinhdanh===id);
   for(const [key,value] of Object.entries(edit.before||{}))assert.deepEqual(previous[key],value);
   stored[edit.dataset]=stored[edit.dataset].filter((row:any)=>row.madinhdanh!==id);
   if(edit.after)stored[edit.dataset].push({...previous,...edit.after});
  }
  // Include a canonical server change while a new user edit may be queued.
  if(stored.subjects.length)stored.subjects[0].mota='Server description';
  return {data:{saved:true,partial:true,data:{subjects:structuredClone(stored.subjects)}}};
 }
 return {data:{}};
};
(supabase as any).schema=()=>({rpc:(name:string,args:any)=>{
 const result=mockRpc(name,args);return Object.assign(result,{abortSignal:()=>result});
}});
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
const edit=(name:string)=>setBusinessValue('subjects',(rows:any[])=>rows.map(row=>({...row,name})));
await loginAccount('admin','password');await loadBusinessData();
const readsBefore=accountReads;
edit('First');await tick();edit('Second');release();await tick();
assert.equal(getBusinessSnapshot().data.subjects[0].name,'Second');
assert.equal(getBusinessSnapshot().data.subjects[0].desc,'Server description');
assert.equal(getBusinessSnapshot().data.levels[0].name,'Keep me');
assert.equal(changes.length,2);
assert.equal(changes[1][0].before.tenmonhoc,'First');
assert.equal(changes[1][0].after.mota,undefined,'queued edit does not overwrite a server-derived field');
release();await waitForBusinessSave();
assert.equal(getBusinessSnapshot().data.subjects[0].name,'Second');
assert.equal(accountReads,readsBefore,'ordinary business edits do not reload accounts');
fail=true;edit('Rejected');await tick();
const rejected=assert.rejects(waitForBusinessSave(),/Rejected/);release();await rejected;
assert.equal(getBusinessSnapshot().data.subjects[0].name,'Second');
assert.equal(getBusinessSnapshot().data.levels[0].name,'Keep me');
fail=false;setBusinessValue('subjects',[]);await tick();release();await waitForBusinessSave();
assert.deepEqual(getBusinessSnapshot().data.subjects,[],'empty returned datasets clear deleted records');
assert.equal(getBusinessSnapshot().data.levels[0].name,'Keep me');
console.log('PASS scoped receipts: preserve unrelated data, rebase queued edits, server fields, rollback, deletion, no account refresh');
