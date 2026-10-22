import assert from 'node:assert/strict';
import {supabase} from '../src/config/supabase';
import {loginAccount,deleteAccount,getAccountSnapshot,logoutAccount} from '../src/lib/accountSession';

const actor={madinhdanh:'ADMIN',hoten:'Admin',tendangnhap:'admin',thudientu:'admin@example.test',sodienthoai:'',vaitro:'Quản trị',trangthai:'active',chucaiavatar:'A',manhomquyen:'ROLE'};
let users=[actor,{...actor,madinhdanh:'OTHER',tendangnhap:'other'}];
let refreshed=false;
const snapshot=()=>({actor,users:structuredClone(users),role_groups:[{madinhdanh:'ROLE',tennhomquyen:'Quản trị',phanloai:'HỆ THỐNG',mota:'',soluongnguoidung:users.length,danhsachquyen:['ALL'],congtruycap:'ADMIN'}]});
const original=supabase.schema;
(supabase as any).schema=()=>({rpc:async(name:string,args:any)=>{
 if(name==='vuihoc_login')return {data:{...snapshot(),token:'test-token'}};
 if(name==='vuihoc_save_accounts'){
  assert.equal(args.p_changes[0].after,null);
  users=users.filter(user=>user.madinhdanh!==args.p_changes[0].before.madinhdanh);
  return {data:{saved:true}};
 }
 if(name==='vuihoc_session'){refreshed=true;return {data:snapshot()};}
 return {data:{}};
}});
try{
 await loginAccount('admin','test');
 assert.equal(getAccountSnapshot().groups[0].userCount,2);
 await deleteAccount('OTHER');
 assert.ok(refreshed,'a successful delete refreshes the authoritative group-count query immediately');
 assert.equal(getAccountSnapshot().groups[0].userCount,1);
 assert.equal(getAccountSnapshot().users.length,1);
 console.log('PASS deleting an account refreshes queried group counts without waiting for the periodic refresh');
}finally{await logoutAccount();supabase.schema=original;}
