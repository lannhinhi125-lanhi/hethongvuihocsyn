import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import '../../src/index.css';
import {ReportChart} from '../../src/components/ReportChart';
import {buildCustomReport,defaultReportConfig,type ReportDataset} from '../../src/lib/customReports';
const dataset:ReportDataset={id:'test',label:'Students',dateKind:'snapshot',records:[{id:'1',subject:'Math'},{id:'2',subject:'Math'},{id:'3',subject:'English'}],metrics:[{id:'count',label:'Students',mode:'count'}],defaultMetricIds:['count'],dimensions:[{id:'subject',label:'Subject'}],filters:[],detailFields:[]};
function Fixture(){
 const [selected,setSelected]=useState<string>();
 const config=defaultReportConfig(dataset);
 const all=buildCustomReport(dataset,config);
 const filtered=buildCustomReport(dataset,{...config,selection:selected?{by:'subject',key:selected}:undefined});
 return <><ReportChart title="Students" additive temporal data={all.rows.map(row=>({key:row.key,label:row.label,value:row.values.count}))} selectedKey={selected} onSelect={key=>setSelected(old=>old===key?undefined:key)} onClearSelection={()=>setSelected(undefined)}/><div data-testid="selection">{selected || 'all'}</div><div data-testid="records">{filtered.records.map(row=>row.id).join(',')}</div><button type="button">Outside</button></>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
