import React from 'react';
import {createRoot} from 'react-dom/client';
import '../../src/index.css';
import {AppProvider} from '../../src/context/AppContext';
import {ReportComposer} from '../../src/components/ReportComposer';
import {defaultReportConfig,type ReportDataset} from '../../src/lib/customReports';
const dataset:ReportDataset={id:'students',label:'Học sinh',dateKind:'snapshot',records:[{id:'s1',name:'Học sinh A',subject:'Toán'},{id:'s2',name:'Học sinh B',subject:'Tiếng Anh'}],metrics:[{id:'count',label:'Số học sinh',mode:'count'}],defaultMetricIds:['count'],dimensions:[{id:'subject',label:'Môn học'}],filters:[],detailFields:[{id:'name',label:'Họ tên'}]};
const request={datasetId:dataset.id,config:{...defaultReportConfig(dataset),datePreset:'all' as const}};
createRoot(document.getElementById('root')!).render(<AppProvider><main className="p-3"><ReportComposer datasets={[dataset]} request={request} updatedAt={Date.now()}/></main></AppProvider>);
