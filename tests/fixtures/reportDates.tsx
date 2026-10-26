import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {PeriodToolbar} from '../../src/components/PeriodToolbar';
import {buildCustomReport,defaultReportConfig} from '../../src/lib/customReports';
import {makeReportDatasets} from '../../src/lib/reportDatasets';
import {allReportDatasets} from '../../src/lib/allReportDatasets';
import {reportToday} from '../../src/lib/customReports';
import type {ClassItem} from '../../src/types';
import '../../src/index.css';

const dataset=makeReportDatasets({classes:[],teachers:[],incidents:[],inspections:[],students:[
 {id:'A',name:'Học sinh tháng 8',date:'2026-08-10',grade:'Lớp 3',subject:'Toán',model:'1-3',status:'Đang học'},
 {id:'B',name:'Học sinh đầu tháng 9',date:'2026-09-03',grade:'Lớp 3',subject:'Toán',model:'1-3',status:'Đang học'},
 {id:'C',name:'Học sinh giữa tháng 9',date:'2026-09-15',grade:'Lớp 4',subject:'Anh',model:'1-3',status:'Đang học'}
]}).find(row=>row.id==='students')!;
function Harness(){
 const [range,setRange]=useState({start:'2026-08-01',end:'2026-08-31'});
 const result=buildCustomReport(dataset,{...defaultReportConfig(dataset),datePreset:'custom',from:range.start,to:range.end});
 return <main className="space-y-4 p-6"><h1>Báo cáo học sinh mới</h1><PeriodToolbar range={range} onChange={setRange} initialPeriod="month"/>
 <output data-testid="applied-range">{range.start+' / '+range.end}</output><output data-testid="records">{result.records.map(row=>row.id).join(',')}</output><EndingHarness/></main>;
}
function EndingHarness(){
 const today=reportToday(),end=(days:number)=>new Date(Date.parse(today+'T12:00:00Z')+days*86400000).toISOString().slice(0,10);
 const classes=[10,60].map((days,i)=>({id:'E'+i,code:'E'+i,name:'Lớp '+i,endDate:end(days),subject:'M',grade:'G',level:'B',model:'1-3',studentIds:[],maxStudents:3,status:'Đang học',teacherName:'GV',materials:[],schedule:'',roomLink:''})) as ClassItem[];
 const source=allReportDatasets({classes,students:[],teachers:[],lessons:[],incidents:[],evaluations:[],lookups:{}}).detail.find(row=>row.id==='classes_ending')!;
 const initial=defaultReportConfig(source);
 const [range,setRange]=useState({start:initial.from,end:initial.to});
 const result=buildCustomReport(source,{...initial,datePreset:range.start?'custom':'all',from:range.start,to:range.end});
 return <section className="space-y-3 pt-10"><h2>Lớp kết thúc</h2><PeriodToolbar label="Kết thúc lớp" allowUpcoming range={range} onChange={setRange}/><output data-testid="ending-records">{result.records.map(row=>row.id).sort().join(',')}</output></section>;
}
createRoot(document.getElementById('root')!).render(<Harness/>);
