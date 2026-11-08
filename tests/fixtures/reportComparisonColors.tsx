import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import '../../src/index.css';
import {ComparisonControls,ComparisonResults} from '../../src/components/ReportComparison';
import type {ComparisonSettings} from '../../src/lib/reportComparison';
function Fixture(){
 const [settings,setSettings]=useState<ComparisonSettings>({enabled:true,mode:'previous',start:'',end:''});
 const current={start:'2026-11-01',end:'2026-11-08'},previous={start:'2026-10-24',end:'2026-10-31'};
 return <main className="report-interface mx-auto max-w-[1400px] space-y-4 bg-[#f8f9fc] p-4"><ComparisonControls current={current} settings={settings} onChange={setSettings}/>
 <ComparisonResults datasetId="students" metrics={[{id:'count',label:'Số học sinh',mode:'count'}]} totals={{count:12}} previousTotals={{count:10}}
 currentRange={current} previousRange={previous} rows={[{key:'M',label:'Toán',current:{count:8},previous:{count:6},currentKey:'M',previousKey:'M'},
 {key:'E',label:'Tiếng Anh',current:{count:4},previous:{count:4},currentKey:'E',previousKey:'E'}]}/></main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
