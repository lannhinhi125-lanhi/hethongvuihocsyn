import React from 'react';
import {createRoot} from 'react-dom/client';
import '../../src/index.css';
import {AppProvider,useApp} from '../../src/context/AppContext';
import {Workbench} from '../../src/views/Workbench';
import {supabase} from '../../src/config/supabase';
import {loginAccount} from '../../src/lib/accountSession';
import {APP_DATABASE_FIELDS} from '../../src/lib/databaseNames';
import {localDay} from '../../src/lib/workbench';
const today=localDay(new Date());
const day=(offset:number)=>{const date=new Date(today+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+offset);return date.toISOString().slice(0,10);};
const actor={madinhdanh:'ADMIN',hoten:'Admin',tendangnhap:'admin',trangthai:'active',vaitro:'Quản trị Toàn quyền',manhomquyen:'ROLE'};
const session={actor,users:[actor],role_groups:[{madinhdanh:'ROLE',tennhomquyen:'Admin',phanloai:'HỆ THỐNG',danhsachquyen:['ALL'],congtruycap:'ADMIN'}]};
const rows=(key:keyof typeof APP_DATABASE_FIELDS,values:Record<string,unknown>[])=>values.map(value=>Object.fromEntries(Object.entries(value).map(([k,v])=>[(APP_DATABASE_FIELDS[key] as Record<string,string>)[k]||k,v])));
const data={
 subjects:rows('subjects',[{id:'m',code:'M',name:'Toán'},{id:'e',code:'E',name:'Tiếng Anh'}]),
 class_models:rows('class_models',[{id:'model',code:'1-3',name:'Nhóm 3',maxStudents:3}]),
 students:rows('students',Array.from({length:16},(_,i)=>({id:'s'+i,name:'Học sinh '+i,grade:'Khối 6',created_at:today,registrations:[{subject:i%2?'E':'M',model:'1-3',status:'Chờ xếp lớp',level:'L',scheduleSlots:[]}],classHistory:[]}))),
 classes:rows('classes',Array.from({length:20},(_,i)=>({id:'c'+i,code:'C'+i,name:'Lớp '+i,grade:'Khối 6',subject:i%2?'E':'M',model:'1-3',studentIds:[],status:'Đang học',schedule:'',materials:[],created_at:today,endDate:day(i)}))),
 dated_lessons:rows('dated_lessons',[{id:'old',classId:'c0',date:day(-40),timeSlotId:'s',status:'DA_HOC',checkoutAt:day(-40)+'T12:00:00Z',feedbackProgress:{state:'CHUA_DU',total:2,completed:1}}]),
 lesson_incidents:rows('lesson_incidents',[{id:'i1',lessonId:'old',status:'DANG_XU_LY',reportedAt:day(-40)+'T12:00:00Z'}]),
};
(supabase as any).schema=()=>({rpc:async(name:string)=>name==='vuihoc_login'?{data:{...session,token:'fixture'}}:name==='vuihoc_session'?{data:session}:name==='vuihoc_business_data'?{data}: {data:{}}});
function Fixture(){const {dashboardSelection}=useApp();return <main className="p-3" style={{maxWidth:1500,margin:'auto'}}><Workbench/><output data-testid="selection">{JSON.stringify(dashboardSelection)}</output></main>;}
await loginAccount('fixture','fixture');
createRoot(document.getElementById('root')!).render(<AppProvider><Fixture/></AppProvider>);
