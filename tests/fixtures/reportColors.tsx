import React from 'react';
import {createRoot} from 'react-dom/client';
import '../../src/index.css';
import {AppProvider} from '../../src/context/AppContext';
import {CustomReportBuilder} from '../../src/components/CustomReportBuilder';
import type {ReportDataset} from '../../src/lib/customReports';
const dataset:ReportDataset={id:'classes',label:'Lớp học',dateKind:'snapshot',records:Array.from({length:12},(_,i)=>({id:String(i),name:'Lớp '+i,subject:['Toán','Tiếng Anh','Ngữ văn'][i%3],grade:['Khối 3','Khối 4'][i%2],date:'2026-11-08'})),metrics:[{id:'count',label:'Số lượng',mode:'count'}],defaultMetricIds:['count'],dimensions:[{id:'subject',label:'Môn học'},{id:'grade',label:'Khối lớp'}],filters:[{id:'subject',label:'Môn học'}],detailFields:[{id:'name',label:'Tên'},{id:'subject',label:'Môn học'}]};
const sources=[dataset,{...dataset,id:'students',label:'Học sinh'},{...dataset,id:'teachers',label:'Giáo viên'}];
createRoot(document.getElementById('root')!).render(<AppProvider><main className="mx-auto max-w-[1600px] bg-[#f8f9fc] p-4"><CustomReportBuilder datasets={sources}/></main></AppProvider>);
