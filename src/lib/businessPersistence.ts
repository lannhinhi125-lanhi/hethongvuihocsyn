import { useCallback, useSyncExternalStore, type SetStateAction } from 'react';
import { teacherSessionRequest } from './accountSession';
import { fromSupabaseRow, toSupabaseRow, type SupabaseDataset } from './supabaseMapper';
type Row = Record<string, any>;
type Snapshot = { data: Record<string, any>; loading: boolean; saving: boolean; error: string; saved: number };
const emptyRag = { welcomeGreeting:'',quickPrompts:[],personaTone:'',strictGroundingOnly:true,fallbackResponse:'',systemPrompt:'' };
let state: Snapshot = {data:{},loading:false,saving:false,error:'',saved:0};
let confirmed: Record<string,any> = {}, generation=0, flushing=false, scheduled=false;
let raw: Record<string,Row[]> = {};
const listeners=new Set<()=>void>();
function publish(next:Snapshot){state=next;listeners.forEach(fn=>fn());}
const collections: SupabaseDataset[] = ['subjects','levels','time_slots','class_models','teaching_categories','incident_categories','teachers','students','classes','criteria_categories','sop_documents','report_templates','custom_catalogs','teacher_evaluations','dated_lessons','lesson_incidents'];
const defaults:Record<string,any>={rag_bot_config:emptyRag,active_tone_key:'',monthly_payroll:{},tone_directives:{}};
function initial(key:string):any {if(!(key in defaults))defaults[key]=[];return defaults[key];}
function encode(key:string,value:any):Row[]{
 if(key==='active_tone_key')return [toSupabaseRow('app_settings',{id:raw.app_settings?.[0]?.madinhdanh||'global',active_tone_key:value})];
 if(key==='rag_bot_config')return [toSupabaseRow('rag_bot_config',{...value,id:raw.rag_bot_config?.[0]?.madinhdanh||'global'})];
 if(key==='tone_directives')return Object.entries(value).map(([id,v])=>toSupabaseRow('tone_directives',{...(v as object),id}));
 if(key==='monthly_payroll')return Object.entries(value).map(([month,v])=>toSupabaseRow('monthly_payroll',{...(v as object),id:raw.monthly_payroll?.find(r=>r.kycong===month)?.madinhdanh||'PAYROLL-'+month,month_period:month}));
 return value.map((r:Row)=>{
  const row=toSupabaseRow(key as SupabaseDataset,r);if(key==='sop_documents')delete row.ngaycapnhat;return row;
 });
}
function decode(rows:Record<string,Row[]>){
 const next:Record<string,any>={};
 for(const key of collections)next[key]=(rows[key]||[]).map(r=>{
  const x=fromSupabaseRow(key,r,rows);if(key==='custom_catalogs')return {...x,parentId:x.parentId||undefined};return x;
 });
 next.rag_bot_config=rows.rag_bot_config?.[0]?fromSupabaseRow('rag_bot_config',rows.rag_bot_config[0]):emptyRag;
 delete next.rag_bot_config.id;
 next.active_tone_key=rows.app_settings?.[0]?.mavanphongdangchon||'';
 next.tone_directives=Object.fromEntries((rows.tone_directives||[]).map(r=>{const x=fromSupabaseRow('tone_directives',r);return [x.id,{name:x.name,directive:x.directive}];}));
 next.monthly_payroll=Object.fromEntries((rows.monthly_payroll||[]).map(r=>{const x=fromSupabaseRow('monthly_payroll',r);const key=x.month_period;delete x.id;delete x.month_period;return [key,x];}));
 return next;
}
export function resetBusinessData(){generation++;raw={};confirmed={};publish({data:{},loading:false,saving:false,error:'',saved:0});}
export async function loadBusinessData(){
 if(state.saving) return;
 const version=++generation;publish({...state,loading:true,error:''});
 try {const result=await teacherSessionRequest('vuihoc_business_data');if(version!==generation)return;raw=result;confirmed=decode(result);publish({...state,data:confirmed,loading:false,error:''});}
 catch(error){if(version===generation)publish({...state,loading:false,error:(error as Error).message});}
}
export function acceptBusinessTeacher(teacher:Row){
 const rows=[teacher,...(state.data.teachers||[]).filter((r:Row)=>r.id!==teacher.id)];
 confirmed={...confirmed,teachers:rows};raw.teachers=[toSupabaseRow('teachers',teacher),...(raw.teachers||[]).filter(r=>r.madinhdanh!==teacher.id)];
 publish({...state,data:{...state.data,teachers:rows}});
}
export function setBusinessValue(key:string,action:SetStateAction<any>){
 if(state.loading){publish({...state,error:'Đang tải dữ liệu. Vui lòng đợi rồi lưu lại.'});return;}
 const previous=state.data[key]??initial(key),value=typeof action==='function'?action(previous):action;
 if(JSON.stringify(value)===JSON.stringify(previous))return;
 try {encode(key,value);}catch(error){publish({...state,error:(error as Error).message});return;}
 publish({...state,data:{...state.data,[key]:value},saving:true,error:''});
 if(!scheduled){scheduled=true;queueMicrotask(()=>{scheduled=false;void flush();});}
}
async function flush(){
 if(flushing)return;flushing=true;const version=generation;
 try {
  while(state.saving&&version===generation){
   const snapshot=state.data,changes:Row[]=[];
   for(const key of Object.keys(snapshot)){
    if(JSON.stringify(snapshot[key])===JSON.stringify(confirmed[key]??initial(key)))continue;
    const dataset=key==='active_tone_key'?'app_settings':key;
    const before=new Map(encode(key,confirmed[key]??initial(key)).map(r=>[r.madinhdanh,r]));
    const after=new Map(encode(key,snapshot[key]).map(r=>[r.madinhdanh,r]));
    for(const id of new Set([...before.keys(),...after.keys()])){
     const b=before.get(id),a=after.get(id);if(JSON.stringify(b)===JSON.stringify(a))continue;
     // A singleton absent from the database must be inserted, not compared with its UI default.
     const exists=raw[dataset]?.some(r=>r.madinhdanh===id);
     changes.push({dataset,before:exists?b:null,after:a||null});
    }
   }
   if(!changes.length){publish({...state,saving:false});break;}
   const receipt=await teacherSessionRequest('vuihoc_save_business',{p_changes:changes});
   if(version!==generation)return;
   confirmed=snapshot;
   for(const c of changes){raw[c.dataset]=(raw[c.dataset]||[]).filter(r=>r.madinhdanh!==(c.after||c.before).madinhdanh);if(c.after)raw[c.dataset].push(c.after);}
   const more=JSON.stringify(state.data)!==JSON.stringify(snapshot);
   if(!more&&receipt.data){raw=receipt.data;confirmed=decode(raw);}
   publish({...state,data:more?state.data:confirmed,saving:more,saved:state.saved+1});
  }
 }catch(error){if(version===generation)publish({...state,data:confirmed,saving:false,error:(error as Error).message});}
 finally{flushing=false;if(state.saving)queueMicrotask(()=>void flush());}
}
export function useBusinessStatus(){return useSyncExternalStore(fn=>{listeners.add(fn);return()=>{listeners.delete(fn);};},()=>state);}
export function useBusinessValue<T>(key:string):[T,(action:SetStateAction<T>)=>void]{const snapshot=useBusinessStatus();const setter=useCallback((action:SetStateAction<T>)=>setBusinessValue(key,action),[key]);return [snapshot.data[key]??initial(key),setter];}
export function getBusinessSnapshot(){return state;}
export function businessSaving(){return state.saving;}
if(typeof window!=='undefined')window.addEventListener('beforeunload',event=>{if(state.saving){event.preventDefault();event.returnValue='';}});
