import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {PeriodToolbar} from '../../src/components/PeriodToolbar';
import {buildCustomReport,defaultReportConfig} from '../../src/lib/customReports';
import {makeReportDatasets} from '../../src/lib/reportDatasets';
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
 <output data-testid="applied-range">{range.start+' / '+range.end}</output><output data-testid="records">{result.records.map(row=>row.id).join(',')}</output></main>;
}
createRoot(document.getElementById('root')!).render(<Harness/>);
