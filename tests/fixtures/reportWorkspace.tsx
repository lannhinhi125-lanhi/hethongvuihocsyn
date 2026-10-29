import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import '../../src/index.css';
import {AppProvider} from '../../src/context/AppContext';
import {CustomReportBuilder} from '../../src/components/CustomReportBuilder';
import {ReportDataStatusContent} from '../../src/components/ReportDataStatus';
import type {ReportDataset} from '../../src/lib/customReports';
const dataset:ReportDataset={id:'test',label:'Học sinh theo môn học',dateKind:'event',records:Array.from({length:40},(_,i)=>({id:String(i),name:'Học sinh '+i,subject:['Toán','Tiếng Anh','Ngữ văn'][i%3],date:'2026-10-01'})),metrics:[{id:'count',label:'Số học sinh',mode:'count'}],defaultMetricIds:['count'],dimensions:[{id:'subject',label:'Môn học'}],filters:[{id:'subject',label:'Môn học'}],detailFields:[{id:'name',label:'Họ và tên'},{id:'subject',label:'Môn học'}]};
function Fixture(){
 const [error,setError]=useState(true);
 return <AppProvider><main className="p-4" style={{maxWidth:1600,margin:'auto'}}>
 <ReportDataStatusContent status={{loading:false,saving:false,error:'',refreshError:error?'Tải dữ liệu mất quá nhiều thời gian nên yêu cầu đã bị hủy.':'',loadedAt:1793242800000}} onRetry={()=>setError(false)}/>
 <CustomReportBuilder datasets={[dataset]} mode="detail"/>
 </main></AppProvider>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
