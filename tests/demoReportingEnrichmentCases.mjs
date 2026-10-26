import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

export async function verifyDemoReportingEnrichment(db){
 await db.exec(readFileSync('supabase/reset_demo_aug_nov_2026.sql','utf8'));
 if(!(await db.query(`SELECT count(*)::int n FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='LOP_HOC' AND column_name IN ('ngayketthuc','ngayketthuctuychinh')`)).rows[0].n){
  await db.exec(readFileSync('supabase/migrations/20261109_reenrollment_class_duration.sql','utf8'));
  await db.exec(readFileSync('supabase/migrations/20261111_custom_class_end_date.sql','utf8'));
 }
 await db.exec(readFileSync('supabase/migrations/20261214_completed_lessons_credit.sql','utf8'));
 const sql=readFileSync('supabase/enrich_demo_reporting.sql','utf8');
 const work=async()=>(await db.query('SELECT * FROM vuihoc."CONG_DAY_BUOI_HOC" ORDER BY madinhdanh')).rows;
 const beforeWork=await work();
 const historical=(await db.query(`SELECT * FROM vuihoc."BUOI_HOC" WHERE ngayhoc<=date '2026-10-26' ORDER BY madinhdanh`)).rows;
 await db.exec(sql);
 assert.deepEqual(await work(),beforeWork,'enrichment preserves every existing work row');
 assert.deepEqual((await db.query(`SELECT * FROM vuihoc."BUOI_HOC" WHERE ngayhoc<=date '2026-10-26' ORDER BY madinhdanh`)).rows,historical);
 const months=(await db.query(`SELECT to_char(ngaytao AT TIME ZONE 'Asia/Bangkok','YYYY-MM') AS month,count(*)::int count FROM vuihoc."HOC_SINH" GROUP BY 1 ORDER BY 1`)).rows;
 assert.deepEqual(months.map(row=>row.month),['2026-08','2026-09','2026-10']);
 assert.ok(months.every(row=>row.count>0));
 const teacherMonths=(await db.query(`SELECT to_char(ngaytao AT TIME ZONE 'Asia/Bangkok','YYYY-MM') AS month,count(*)::int count FROM vuihoc."GIAO_VIEN" GROUP BY 1 ORDER BY 1`)).rows;
 assert.ok(['2026-08','2026-09','2026-10'].every(month=>teacherMonths.some(row=>row.month===month&&row.count>0)));
 const categories=(await db.query(`SELECT macaphoc,count(*)::int count FROM vuihoc."GIAO_VIEN" GROUP BY 1 ORDER BY 1`)).rows;
 assert.deepEqual(categories,[{macaphoc:'CAP-TH',count:24},{macaphoc:'CAP-THCS',count:3},{macaphoc:'CAP-THPT',count:3}]);
 assert.equal((await db.query(`SELECT count(*)::int n FROM vuihoc."HOC_SINH" h JOIN vuihoc."NHAN_XET_BUOI_HOC" n ON n.mahocsinh=h.madinhdanh JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=n.mabuoi WHERE (h.ngaytao AT TIME ZONE 'Asia/Bangkok')::date>b.ngayhoc`)).rows[0].n,0,'student profiles precede their lessons');
 assert.equal((await db.query(`SELECT count(*)::int n FROM vuihoc."GIAO_VIEN" g JOIN vuihoc."BUOI_HOC" b ON b.magiaovienchinh=g.madinhdanh OR b.magiaoviendaythay=g.madinhdanh WHERE (g.ngaytao AT TIME ZONE 'Asia/Bangkok')::date>b.ngayhoc OR g.ngaybatdau::date>b.ngayhoc`)).rows[0].n,0,'teacher profiles and start dates precede teaching/cover lessons');
 assert.equal((await db.query(`SELECT count(*)::int n FROM vuihoc."DANG_KY_MON_HOC" d JOIN vuihoc."HOC_SINH" h ON h.madinhdanh=d.mahocsinh WHERE d.ngaydangky<h.ngaytao`)).rows[0].n,0,'registrations cannot predate student profiles');
 const terms=(await db.query(`SELECT vuihoc.du_lieu_quan_he('LOP_HOC',to_jsonb(l))->>'ngayketthuc' ending FROM vuihoc."LOP_HOC" l WHERE madinhdanh LIKE 'DEMO-LOP-%' ORDER BY madinhdanh`)).rows;
 assert.equal(terms.length,24);assert.ok(terms.every(row=>row.ending));
 assert.deepEqual([...new Set(terms.map(row=>row.ending.slice(0,7)))].sort(),['2026-10','2026-11','2026-12']);
 const token=(await db.query("SELECT public.vuihoc_login('admin.tong','234567') v")).rows[0].v.token;
 const data=(await db.query('SELECT public.vuihoc_business_data($1) v',[token])).rows[0].v;
 const {fromSupabaseRow}=await import('../src/lib/supabaseMapper.ts');
 const {allReportDatasets}=await import('../src/lib/allReportDatasets.ts');
 const {defaultReportConfig,buildCustomReport}=await import('../src/lib/customReports.ts');
 const map=key=>(data[key]||[]).map(row=>fromSupabaseRow(key,row,data));
 const sets=allReportDatasets({classes:map('classes'),students:map('students'),teachers:map('teachers'),lessons:map('dated_lessons'),incidents:map('lesson_incidents'),evaluations:map('teacher_evaluations'),lookups:{subjects:map('subjects'),models:map('class_models'),timeSlots:map('time_slots'),levels:map('levels'),teachingCategories:map('teaching_categories'),incidentCategories:map('incident_categories')}}).detail;
 for(const id of ['students','teachers']){
  const dataset=sets.find(row=>row.id===id);
  const result=buildCustomReport(dataset,{...defaultReportConfig(dataset),datePreset:'custom',from:'2026-09-01',to:'2026-09-30'});
  assert.ok(result.records.length>0,id+' September report has data from actual business RPC');
  assert.equal(result.records.length,(id==='students'?months:teacherMonths).find(row=>row.month==='2026-09').count,'report filtering matches SQL counts');
 }
 const endingSet=sets.find(row=>row.id==='classes_ending');
 for(const month of ['10','11','12']){
  const result=buildCustomReport(endingSet,{...defaultReportConfig(endingSet),datePreset:'custom',from:`2026-${month}-01`,to:month==='11'?'2026-11-30':`2026-${month}-31`});
  assert.ok(result.records.length>0,'ending-class report has classes in '+month);
 }
 for(const username of ['gv.demo25','gv.demo26','gv.demo27','gv.demo28','gv.demo29','gv.demo30'])assert.ok((await db.query('SELECT public.vuihoc_login($1,$2) v',[username,'246810'])).rows[0].v.token);
 const afterCounts=(await db.query(`SELECT (SELECT count(*) FROM vuihoc."GIAO_VIEN") teachers,(SELECT count(*) FROM vuihoc."BUOI_HOC") lessons`)).rows;
 await db.exec(sql);
 assert.deepEqual((await db.query(`SELECT (SELECT count(*) FROM vuihoc."GIAO_VIEN") teachers,(SELECT count(*) FROM vuihoc."BUOI_HOC") lessons`)).rows,afterCounts);
 assert.deepEqual(await work(),beforeWork);
 console.log('PASS demo enrichment: monthly SQL/RPC/report parity, 30 teachers across three levels, dates before teaching, end dates, work/history preservation and rerun');
 console.log(JSON.stringify({months,teacherMonths,categories,counts:afterCounts}));
}
