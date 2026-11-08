import React,{useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import '../../src/index.css';
import {AppProvider,useApp} from '../../src/context/AppContext';
import {Module6_AIStudio} from '../../src/views/Module6_AIStudio';
import {supabase} from '../../src/config/supabase';
import {loginAccount,getAccountSnapshot} from '../../src/lib/accountSession';
const actor={madinhdanh:'QA',hoten:'QA Admin',tendangnhap:'qa',trangthai:'active',manhomquyen:'QA-ROLE'};
const session={actor,users:[actor],role_groups:[{madinhdanh:'QA-ROLE',tennhomquyen:'QA Admin',danhsachquyen:['ALL'],congtruycap:'ADMIN'}]};
(supabase as any).schema=()=>({rpc:(name:string)=>{
 const result=Promise.resolve({data:name==='vuihoc_login'?{token:'qa-token',...session}:name==='vuihoc_session'?session:name==='vuihoc_ai_chat_list'?[]:{}});
 return Object.assign(result,{abortSignal:()=>result});
}});
await loginAccount('qa','qa');
function Fixture(){
 const {setCurrentUser,setModuleSections}=useApp();
 useEffect(()=>{setCurrentUser(getAccountSnapshot().actor!);setModuleSections({6:'rag-config'});},[]);
 return <main className="mx-auto max-w-[1600px] bg-[#f8f9fc] p-4"><Module6_AIStudio/></main>;
}
createRoot(document.getElementById('root')!).render(<AppProvider><Fixture/></AppProvider>);
