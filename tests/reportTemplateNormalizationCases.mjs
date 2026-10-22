import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
export async function verifyReportTemplateNormalization(db,token){
 const file=p=>readFileSync(p,'utf8');
 const migration=file('supabase/migrations/20261202_normalize_report_templates.sql');
 const diagnostic=file('supabase/diagnostics/report_template_legacy.sql');
 const business=async t=>(await db.query('SELECT public.vuihoc_business_data($1) AS v',[t||token])).rows[0].v;
 const save=(changes,t=token)=>db.query('SELECT public.vuihoc_save_business($1,$2::jsonb)',[t,JSON.stringify(changes)]);
 const rows=async name=>(await db.query(`SELECT to_jsonb(t) v FROM vuihoc."${name}" t ORDER BY to_jsonb(t)::text`)).rows.map(x=>x.v);
 const config={datasetId:'classes',groupBy:'subject',datePreset:'custom',from:'2026-10-01',to:'2026-10-31',sort:'label_asc',metricIds:['count'],filters:{subject:['M','E'],status:'DANG_HOC'}};
 // A previous pause-migration audit fixture intentionally has no dataset. It must stop migration.
 assert.ok((await db.query(diagnostic)).rows.some(x=>x.loai==='INVALID_TEMPLATE'));
 await assert.rejects(()=>db.exec(migration),/cấu hình cũ không hợp lệ/);
 assert.equal((await db.query("SELECT count(*)::int n FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='BO_LOC_MAU_BAO_CAO' AND column_name='thutu'")).rows[0].n,0);
 await db.query(`UPDATE vuihoc."MAU_BAO_CAO" SET nguondulieu='classes' WHERE madinhdanh='PAUSE-TEMPLATE-AUDIT' AND nguondulieu=''`);
 await save([{dataset:'report_templates',before:null,after:{madinhdanh:'REPORT-LEGACY-MULTI',tenmaubaocao:'Existing multi-select template',cauhinh:config}}]);
 const incident=(await db.query('SELECT manhom,madinhdanh FROM vuihoc."LOAI_SU_CO" ORDER BY manhom,madinhdanh LIMIT 1')).rows[0];
 const composite=JSON.stringify([incident.manhom,incident.madinhdanh]);
 await db.query('INSERT INTO vuihoc."BO_LOC_MAU_BAO_CAO" VALUES($1,$2,$3)',['REPORT-LEGACY-MULTI','cause',composite]);
 await db.query('INSERT INTO vuihoc."BO_LOC_MAU_BAO_CAO" VALUES($1,$2,$3)',['REPORT-LEGACY-MULTI','pauseReason',JSON.stringify([composite,'__NONE__'])]);
 for(const value of ['[invalid','["M",3]','["M","M"]']){
  await db.exec('BEGIN');await db.query('UPDATE vuihoc."BO_LOC_MAU_BAO_CAO" SET giatri=$1 WHERE mamau=$2 AND truong=$3',[value,'REPORT-LEGACY-MULTI','subject']);
  await assert.rejects(()=>db.exec(migration));await db.exec('ROLLBACK');
 }
 const protectedFacts={};for(const name of ['LOP_HOC','BUOI_HOC','CONG_DAY_BUOI_HOC','NGUOI_DUNG'])protectedFacts[name]=await rows(name);
 const parents=await rows('MAU_BAO_CAO'),metrics=await rows('CHI_SO_MAU_BAO_CAO');
 const tableNames=async()=>(await db.query("SELECT tablename FROM pg_tables WHERE schemaname='vuihoc' ORDER BY tablename")).rows;
 const tables=await tableNames();await db.exec(migration);await db.exec(migration);assert.deepEqual(await tableNames(),tables);
 for(const [name,old] of Object.entries(protectedFacts))assert.deepEqual(await rows(name),old);
 for(const [i,old] of parents.entries()){const updated=(await rows('MAU_BAO_CAO'))[i];for(const k of Object.keys(old))assert.deepEqual(updated[k],old[k]);}
 assert.deepEqual(await rows('CHI_SO_MAU_BAO_CAO'),metrics);
 for(const [name,count] of [['MAU_BAO_CAO',18],['CHI_SO_MAU_BAO_CAO',3],['BO_LOC_MAU_BAO_CAO',4]])assert.equal((await db.query("SELECT count(*)::int n FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name=$1",[name])).rows[0].n,count);
 assert.deepEqual((await db.query(file('supabase/diagnostics/json_storage_columns.sql'))).rows,[]);
 const read=async id=>(await business()).report_templates.find(x=>x.madinhdanh===id);
 const old=await read('REPORT-LEGACY-MULTI');
 assert.deepEqual(old.cauhinh.filters.subject,['M','E']);assert.deepEqual(old.cauhinh.filters.status,['DANG_HOC']);
 assert.deepEqual(old.cauhinh.filters.cause,[composite]);assert.deepEqual(old.cauhinh.filters.pauseReason,[composite,'__NONE__']);
 const sourceFilters=(await db.query('SELECT truong,giatri,thutu FROM vuihoc."BO_LOC_MAU_BAO_CAO" WHERE mamau=$1 ORDER BY truong,thutu',['REPORT-LEGACY-MULTI'])).rows;
 assert.deepEqual(sourceFilters.filter(x=>x.truong==='subject').map(x=>x.giatri),['M','E']);
 const allConfig={...config,filters:{subject:['M','E'],cause:[composite,'__NONE__']},comparison:{enabled:true,mode:'custom',start:'2026-09-01',end:'2026-09-30'},selection:{by:'subject',key:'M'},chartType:'bar',chartMetricId:'count'};
 await save([{dataset:'report_templates',before:null,after:{madinhdanh:'REPORT-FULL-CONFIG',tenmaubaocao:'Full source config',cauhinh:allConfig}}]);
 let current=await read('REPORT-FULL-CONFIG');assert.deepEqual(current.cauhinh,allConfig);
 const physical=(await db.query('SELECT * FROM vuihoc."MAU_BAO_CAO" WHERE madinhdanh=$1',['REPORT-FULL-CONFIG'])).rows[0];
 assert.equal(physical.kieubieudo,'bar');assert.equal(physical.sosanhbat,true);assert.equal(physical.giatrichon,'M');assert.equal(physical.truongchon,undefined);
 const update=async cfg=>{const before=await read('REPORT-FULL-CONFIG');return save([{dataset:'report_templates',before:{madinhdanh:before.madinhdanh,cauhinh:before.cauhinh},after:{madinhdanh:before.madinhdanh,cauhinh:cfg}}]);};
 for(const bad of [
  {...allConfig,filters:{subject:['M','M']}}, {...allConfig,filters:{subject:['M',12]}}, {...allConfig,filters:{subject:{nested:'bad'}}},
  {...allConfig,metricIds:['count','count']},{...allConfig,from:'2026-11-01'},
  {...allConfig,comparison:{enabled:true,mode:'custom',start:'2026-10-31',end:'2026-09-01'}},
  {...allConfig,selection:{by:'model',key:'M'}},{...allConfig,chartType:'not-a-chart'}, {...allConfig,unknown:'must not be silently lost'},
 ]){await assert.rejects(()=>update(bad));assert.deepEqual((await read('REPORT-FULL-CONFIG')).cauhinh,allConfig);}
 const next={...config,groupBy:'model',metricIds:['count','extra'],filters:{subject:[],model:['SOLO']},comparison:{enabled:false,mode:'previous',start:'',end:''}};
 await update(next);current=await read('REPORT-FULL-CONFIG');assert.deepEqual(current.cauhinh,{...next,filters:{model:['SOLO']}});
 assert.equal(current.cauhinh.chartType,undefined);assert.equal(current.cauhinh.selection,undefined);
 // A scalar input is canonicalized to a one-item array, using the same matching semantics.
 await update({...config,filters:{subject:'M'}});assert.deepEqual((await read('REPORT-FULL-CONFIG')).cauhinh.filters,{subject:['M']});
 await assert.rejects(()=>db.query('INSERT INTO vuihoc."BO_LOC_MAU_BAO_CAO" VALUES($1,$2,$3,$4)',['REPORT-FULL-CONFIG','subject','X',1]));
 await assert.rejects(()=>db.query('INSERT INTO vuihoc."BO_LOC_MAU_BAO_CAO" VALUES($1,$2,$3,$4)',['MISSING-REPORT','subject','X',1]));
 // Real source labels remain outside templates and resolve through the live report dataset.
 const {stripTypeScriptTypes}=await import('node:module');
 const custom=stripTypeScriptTypes(file('src/lib/customReports.ts'),{mode:'transform'}).replace(/^import .* from .*;\r?\n/gm,'').replace(/export /g,'');
 const {normalizeReportConfig,buildCustomReport,reportFilterLabel}=new Function('reportChartNames',custom+';return {normalizeReportConfig,buildCustomReport,reportFilterLabel};')({bar:'Bar'});
 const dataset={id:'classes',label:'Classes',dateKind:'snapshot',records:[{subject:'M'},{subject:'E'},{subject:'OTHER'}],metrics:[{id:'count',label:'Count',mode:'count'}],defaultMetricIds:['count'],dimensions:[{id:'subject',label:'Subject',choices:[{value:'M',label:'Renamed source subject'},{value:'E',label:'English'}]}],filters:[{id:'subject',label:'Subject',choices:[{value:'M',label:'Renamed source subject'},{value:'E',label:'English'}]}],detailFields:[]};
 const normalized=normalizeReportConfig((await read('REPORT-LEGACY-MULTI')).cauhinh,[dataset]);
 assert.equal(buildCustomReport(dataset,normalized).records.length,2);assert.equal(reportFilterLabel(dataset.filters[0],normalized.filters.subject),'Renamed source subject, English');
 const live=await business(),subject=live.subjects.find(x=>x.mamonhoc===live.classes[0].mamonhoc);assert.ok(subject);
 const liveConfig={...config,filters:{subject:[subject.mamonhoc]}};
 await save([{dataset:'report_templates',before:null,after:{madinhdanh:'REPORT-SOURCE-LABEL',tenmaubaocao:'Live catalog join',cauhinh:liveConfig}}]);
 const storedFilterRows=await rows('BO_LOC_MAU_BAO_CAO');
 await save([{dataset:'subjects',before:{madinhdanh:subject.madinhdanh,tenmonhoc:subject.tenmonhoc},after:{madinhdanh:subject.madinhdanh,tenmonhoc:'Renamed live source subject'}}]);
 const changed=await business(),choices=changed.subjects.map(x=>({value:x.mamonhoc,label:x.tenmonhoc}));
 const liveDataset={...dataset,records:changed.classes.map(x=>({subject:x.mamonhoc})),dimensions:[{...dataset.dimensions[0],choices}],filters:[{...dataset.filters[0],choices}]};
 const reopened=normalizeReportConfig((await read('REPORT-SOURCE-LABEL')).cauhinh,[liveDataset]);
 assert.equal(reportFilterLabel(liveDataset.filters[0],reopened.filters.subject),'Renamed live source subject');
 assert.equal(buildCustomReport(liveDataset,reopened).records.length,changed.classes.filter(x=>x.mamonhoc===subject.mamonhoc).length);
 assert.deepEqual(await rows('BO_LOC_MAU_BAO_CAO'),storedFilterRows);
 await save([{dataset:'subjects',before:{madinhdanh:subject.madinhdanh,tenmonhoc:'Renamed live source subject'},after:{madinhdanh:subject.madinhdanh,tenmonhoc:subject.tenmonhoc}}]);
 // Optimistic writes cannot replace a changed server config with an older snapshot.
 const stale=await read('REPORT-FULL-CONFIG');await update({...config,filters:{subject:['E']}});
 await assert.rejects(()=>save([{dataset:'report_templates',before:{madinhdanh:stale.madinhdanh,cauhinh:stale.cauhinh},after:{madinhdanh:stale.madinhdanh,cauhinh:config}}]));
 current=await read('REPORT-FULL-CONFIG');await save([{dataset:'report_templates',before:current,after:null}]);
 assert.equal((await db.query('SELECT count(*)::int n FROM vuihoc."BO_LOC_MAU_BAO_CAO" WHERE mamau=$1',['REPORT-FULL-CONFIG'])).rows[0].n,0);
 assert.equal((await db.query('SELECT count(*)::int n FROM vuihoc."CHI_SO_MAU_BAO_CAO" WHERE mamau=$1',['REPORT-FULL-CONFIG'])).rows[0].n,0);
 assert.deepEqual((await db.query(diagnostic)).rows,[]);
 assert.ok((await db.query(file('supabase/diagnostics/foreign_key_audit.sql'))).rows.every(x=>x.trangthai==='OK'));
 for(const signature of ['vuihoc.cau_hinh_mau_bao_cao(text)','vuihoc.luu_cau_hinh_mau_bao_cao(text,jsonb)','vuihoc.du_lieu_quan_he(text,jsonb)','vuihoc.ghi_du_lieu_quan_he(text,jsonb,boolean)'])for(const role of ['anon','authenticated'])assert.equal((await db.query('SELECT has_function_privilege($1,$2,$3) AS allowed',[role,signature,'EXECUTE'])).rows[0].allowed,false);
 for(const [name,old] of Object.entries(protectedFacts))assert.deepEqual(await rows(name),old);
 console.log('PASS report templates: atomic multi-value filters and scoped PK/FKs, legacy scalar/composite/list preservation, malformed/duplicate rollback, no new tables or JSON columns, parent 11→18 and child 3→4, repeated migration, full config roundtrip/removal, real RPC create/edit/delete/stale writes, source labels and report matching, unchanged classes/lessons/work/users and diagnostics');
}
