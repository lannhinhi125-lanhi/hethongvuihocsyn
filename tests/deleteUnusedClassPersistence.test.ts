import assert from 'node:assert/strict';
import {supabase} from '../src/config/supabase';
import {loginAccount,logoutAccount} from '../src/lib/accountSession';
import {loadBusinessData,deleteUnusedClass,getBusinessSnapshot,resetBusinessData} from '../src/lib/businessPersistence';
const actor={madinhdanh:'ADMIN',hoten:'Admin',tendangnhap:'admin',trangthai:'active',manhomquyen:'ROLE'};
const session={actor,users:[actor],role_groups:[{madinhdanh:'ROLE',tennhomquyen:'Admin',danhsachquyen:['ALL'],congtruycap:'ADMIN'}]};
let fail=true,release:()=>void=()=>{};
let data:any={classes:[{madinhdanh:'C1',malophoc:'CLASS',danhsachmahocsinh:['S1']}],students:[{madinhdanh:'S1',hoten:'Student',dangkymonhoc:[{subject:'MATH',status:'DANG_HOC',currentClassCode:'CLASS'}]}]};
const mockRpc=async(name:string,args:any)=>{
 if(name==='vuihoc_login')return {data:{token:'token',...session}};
 if(name==='vuihoc_session')return {data:session};
 if(name==='vuihoc_business_data')return {data:structuredClone(data)};
 if(name==='vuihoc_delete_unused_class'){
  assert.equal(args.p_class_id,'C1');assert.equal(args.p_token,'token');
  await new Promise<void>(resolve=>{release=resolve;});
  if(fail)return {error:{message:'Lớp đã phát sinh buổi học'}};
  data={...data,classes:[],students:[{...data.students[0],dangkymonhoc:[{subject:'MATH',status:'CHO_XEP_LOP',currentClassCode:null}]}]};
  return {data:{saved:true,data}};
 }return {data:{}};
};
(supabase as any).schema=()=>({rpc:(name:string,args:any)=>{
 const result=mockRpc(name,args);return Object.assign(result,{abortSignal:()=>result});
}});
await loginAccount('admin','test');await loadBusinessData();
const rejected=deleteUnusedClass('C1');
assert.equal(getBusinessSnapshot().data.classes.length,1,'class stays visible during request');
await assert.rejects(deleteUnusedClass('C1'),/Đang xử lý/);
release();await assert.rejects(rejected,/phát sinh buổi/);
assert.equal(getBusinessSnapshot().data.classes.length,1,'rejection retains class');
assert.equal(getBusinessSnapshot().data.students[0].registrations[0].status,'Đang học');
fail=false;const saved=deleteUnusedClass('C1');release();await saved;
assert.equal(getBusinessSnapshot().data.classes.length,0);
assert.equal(getBusinessSnapshot().data.students[0].registrations[0].status,'Chờ xếp lớp');
assert.equal(getBusinessSnapshot().saving,false);
resetBusinessData();await logoutAccount();
console.log('PASS: confirmed deletion, related enrollment refresh, busy guard and rejection preserve data.');
