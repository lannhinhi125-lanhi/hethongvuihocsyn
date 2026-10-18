import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ReportSelect} from '../../src/components/ReportSelect';
import {ColumnFilter} from '../../src/components/ColumnFilter';
import {MonitoringPeriodToolbar} from '../../src/components/MonitoringPeriodToolbar';
import '../../src/index.css';
function Harness(){
 const [period,setPeriod]=useState<'day'|'week'|'month'>('day'),[range,setRange]=useState({start:'2026-10-18',end:'2026-10-18'});
 const [value,setValue]=useState(''),[submitted,setSubmitted]=useState(''),[filter,setFilter]=useState('A');
 return <main className="p-6 space-y-6"><MonitoringPeriodToolbar range={range} period={period} onChange={(next,kind)=>{setRange(next);setPeriod(kind);}}/><output data-testid="range">{range.start+' / '+range.end}</output>
 <form onSubmit={event=>{event.preventDefault();setSubmitted(String(new FormData(event.currentTarget).get('subject')));}} className="space-y-3"><label>Required subject<ReportSelect name="subject" required aria-label="Required subject" value={value} onChange={event=>setValue(event.target.value)} className="block w-64 border p-2"><option value="">Choose subject</option><option value="M">Math</option><option value="X" disabled>Disabled subject</option><option value="E">English</option></ReportSelect></label><button type="submit" className="border p-2">Submit</button><output data-testid="submitted">{submitted}</output></form>
 <ColumnFilter label="Nested filter" active={filter!=='A'} onReset={()=>setFilter('A')}><ReportSelect aria-label="Nested choice" value={filter} onChange={event=>setFilter(event.target.value)} className="w-full border p-2">{Array.from({length:30},(_,i)=><option key={i} value={i===0?'A':String(i)}>Choice {i}</option>)}</ReportSelect></ColumnFilter>
 <ReportSelect disabled aria-label="Disabled select" value="M"><option value="M">Math</option></ReportSelect><output data-testid="filter">{filter}</output></main>;
}
createRoot(document.getElementById('root')!).render(<Harness/>);
