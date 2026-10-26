import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ClassDetailsModal} from '../../src/components/ClassDetailsModal';
import {ConfirmAction} from '../../src/components/ConfirmAction';
import type {ClassItem,StudentRecord} from '../../src/types';
import '../../src/index.css';
function Fixture(){
 const [ids,setIds]=useState(['S1','S2']);
 const solo=new URLSearchParams(location.search).has('solo');
 (window as any).removeTestMember=(id:string)=>setIds(old=>old.filter(x=>x!==id));
 const item:ClassItem={id:'GROUP',code:'MATH-GROUP',name:'Toán nhóm',subject:'MATH',grade:'G3',model:solo?'1-1':'1-3',maxStudents:solo?1:3,studentIds:solo?['S1']:ids,level:'L1',schedule:'T2 (18:00 - 19:30)',roomLink:'',materials:[],teacherName:'Giáo viên A'};
 const students:StudentRecord[]=ids.map(id=>({id,name:id==='S1'?'Học sinh A':'Học sinh B',grade:'G3',model:'1-1',level:'L1',scheduleSlots:[],status:'Chờ xếp lớp',subject:'ENGLISH',registrations:[{subject:'MATH',status:'Đang học',model:'1-3',level:'L1',scheduleSlots:[]}]}));
 return <><ClassDetailsModal item={item} students={students} categoryName="Tiểu học" gradeName="Lớp 3" subjectName="Toán" levelName="Tiêu chuẩn" onClose={()=>{}}/><ConfirmAction/></>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
