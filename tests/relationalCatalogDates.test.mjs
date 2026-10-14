import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.env.PGLITE_MODULE_PATH;
const {PGlite}=await import(pathToFileURL(resolve(root,'dist/index.js')));
const {pgcrypto}=await import(pathToFileURL(resolve(root,'dist/contrib/pgcrypto.js')));
const db=new PGlite({extensions:{pgcrypto}});
const file=p=>readFileSync(p,'utf8');
const rpc=async(name,args)=>(await db.query('SELECT public.'+name+'('+args.map((_,i)=>'$'+(i+1)).join(',')+') result',args)).rows[0].result;
try {
 await db.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS 'SELECT null::uuid';");
 await db.exec(file('supabase/schema.sql').replace("to_jsonb(t)->>'ngaytao','') DESC","to_jsonb(t)->>''ngaytao'','''') DESC"));
 await db.exec(file('supabase/seed_test_data.sql'));
 await db.exec(file('supabase/upgrade_incident_payroll.sql'));
 await db.exec(file('supabase/migrations/20261013_teacher_live_payroll.sql'));
 await db.exec(file('supabase/migrations/20261014_report_creation_dates.sql'));
 await db.exec(file('supabase/setup_admin.sql').replace(/matkhau text:='[^']*'/,"matkhau text:='234567'"));
 const admin=await rpc('vuihoc_login',['admin.tong','234567']);
 const templateConfig={datasetId:'teachers',metricIds:['count'],groupBy:'subject',datePreset:'all',from:'',to:'',filters:{status:'DANG_DAY'},sort:'value_desc'};
 await db.query(`INSERT INTO vuihoc."MAU_BAO_CAO"(madinhdanh,tenmaubaocao,manguoidung,cauhinh) VALUES('REL-TEMPLATE','Test',(SELECT madinhdanh FROM vuihoc."NGUOI_DUNG" WHERE tendangnhap='admin.tong'),$1)`,[templateConfig]);
 const before=await rpc('vuihoc_business_data',[admin.token]);
 const migration=file('supabase/apply_relational_update.sql');
 await db.exec(`UPDATE vuihoc."GIAO_VIEN" SET danhsachmohinh=array_append(danhsachmohinh,'UNKNOWN-CATALOG-MODEL') WHERE madinhdanh='GV-001'`);
 await assert.rejects(db.exec(migration),/foreign key|vi phạm/i);
 await db.exec('ROLLBACK');
 assert.equal((await db.query(`SELECT count(*)::int n FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='BANG_CONG_THANG' AND column_name='danhsachgiaovien'`)).rows[0].n,1,'The whole combined update rolls back on invalid historical data');
 await db.exec(`UPDATE vuihoc."GIAO_VIEN" SET danhsachmohinh=array_remove(danhsachmohinh,'UNKNOWN-CATALOG-MODEL') WHERE madinhdanh='GV-001'`);
 await db.exec(migration);
 await db.exec(migration);
 const after=await rpc('vuihoc_business_data',[admin.token]);
 assert.deepEqual(after.criteria_categories,before.criteria_categories);
 assert.deepEqual(after.custom_catalogs,before.custom_catalogs);
 assert.deepEqual(after.teaching_categories,before.teaching_categories);
 assert.deepEqual(after.incident_categories,before.incident_categories);
 const types=(await db.query(`SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_schema='vuihoc'`)).rows;
 assert.equal(types.find(c=>c.table_name==='BUOI_HOC'&&c.column_name==='batdau').data_type,'time without time zone');
 assert.equal(types.find(c=>c.table_name==='SU_CO_BUOI_HOC'&&c.column_name==='baoluc').data_type,'date');
 assert.ok(!types.some(c=>['danhsachtieuchi','danhsachmuc','danhsachluachon','danhsachsuco'].includes(c.column_name)));
 for(const dataset of ['criteria_categories','custom_catalogs','teaching_categories','incident_categories']) {
  const list={criteria_categories:'danhsachtieuchi',custom_catalogs:'danhsachmuc',teaching_categories:'danhsachluachon',incident_categories:'danhsachsuco'}[dataset];
  const old=after[dataset].find(row=>row[list].length);
  const next={...old,[list]:[]};
  await rpc('vuihoc_save_business',[admin.token,[{dataset,before:old,after:next}]]);
  const saved=await rpc('vuihoc_business_data',[admin.token]);
  assert.deepEqual(saved[dataset].find(r=>r.madinhdanh===old.madinhdanh)[list],[]);
  await assert.rejects(rpc('vuihoc_save_business',[admin.token,[{dataset,before:old,after:old}]]));
  await rpc('vuihoc_save_business',[admin.token,[{dataset,before:next,after:old}]]);
 }
 const lesson={madinhdanh:'DATE-TIME-TEST',malop:'CLS-001',ngayhoc:'2026-11-01',makhunggio:'SLOT-1',batdau:'18:00:00',ketthuc:'19:30:00',magiaovienchinh:'GV-001',trangthai:'CHUA_DIEN_RA'};
 await rpc('vuihoc_save_business',[admin.token,[{dataset:'dated_lessons',before:null,after:lesson}]]);
 const inc={madinhdanh:'DATE-INCIDENT',mabuoi:lesson.madinhdanh,manhomsuco:'GRP-TCH',masuco:'INC-TCH-03',tensuco:'Late',noidung:'Test',trangthai:'DANG_XU_LY',baoluc:'2026-11-01',xulyluc:'2026-11-01'};
 await rpc('vuihoc_save_business',[admin.token,[{dataset:'lesson_incidents',before:null,after:inc}]]);
 assert.match((await db.query(`SELECT madinhdanh FROM vuihoc."CONG_DAY_BUOI_HOC" WHERE mabuoi='DATE-TIME-TEST'`)).rows[0].madinhdanh,/^CD-\d+$/);
 await db.exec(`UPDATE vuihoc."BUOI_HOC" SET vaolopluc='2026-11-01 18:00+07',ketthucluc='2026-11-01 19:30+07',trangthai='HOAN_THANH' WHERE madinhdanh='DATE-TIME-TEST'`);
 const payroll=await rpc('vuihoc_business_data',[admin.token]);
 assert.ok(payroll.monthly_payroll.length);
 const cat=payroll.incident_categories.find(c=>c.madinhdanh==='GRP-TCH');
 const revised={...cat,danhsachsuco:cat.danhsachsuco.map(s=>s.code==='INC-TCH-03'?{...s,creditCoeff:0.25}:s)};
 await rpc('vuihoc_save_business',[admin.token,[{dataset:'incident_categories',before:cat,after:revised}]]);
 assert.equal(Number((await db.query(`SELECT hesocongapdung FROM vuihoc."SU_CO_BUOI_HOC" WHERE madinhdanh='DATE-INCIDENT'`)).rows[0].hesocongapdung),0.25);
 await rpc('vuihoc_report_lesson_incident',[admin.token,after.classes.find(c=>c.madinhdanh==='CLS-001').malophoc,'2026-11-02',after.time_slots.find(s=>s.madinhdanh==='SLOT-1').khoanggio,'INC-TCH-03','Test create lesson']);
 const relational=await rpc('vuihoc_business_data',[admin.token]);
 assert.ok(relational.teachers[0].danhsachkhoi.length);
 const live=await rpc('vuihoc_teacher_data',[admin.token]);
 assert.ok(live.teaching_categories[0].danhsachluachon.length);
 assert.ok(live.teachers[0].baocaodanhgia);
 for(const original of before.teachers) {
  const projected=live.teachers.find(t=>t.madinhdanh===original.madinhdanh);
  assert.ok(projected.cahochoanthanh.length >= original.cahochoanthanh.length,`${original.madinhdanh}: completed lessons preserved (${projected.cahochoanthanh.length}/${original.cahochoanthanh.length})`);
 }
 assert.deepEqual(relational.report_templates.find(t=>t.madinhdanh==='REL-TEMPLATE').cauhinh,templateConfig);
 const columns=(await db.query(`SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_schema='vuihoc'`)).rows;
 for(const [table,names] of Object.entries({
  GIAO_VIEN:['danhsachkhoi','danhsachmohinh','baocaodanhgia','cahochoanthanh','lichranh'],
  CAU_HINH_TRO_LY:['cauhoinhanh'],MAU_BAO_CAO:['cauhinh'],
  NHAN_XET_BUOI_HOC:['tieuchidachon'],GIAI_TRINH_CONG_DAY:['minhchung'],
 })) assert.ok(!columns.some(c=>c.table_name===table&&names.includes(c.column_name)),table);
 assert.ok(!columns.some(c=>['SU_KIEN_NGHIEP_VU','CHI_TIET_NHAT_KY','NHAT_KY_NGHIEP_VU'].includes(c.table_name)&&c.data_type==='jsonb'));
 const created=await rpc('vuihoc_create_teacher',[admin.token,{
  hoten:'Relational teacher',thudientu:'relational.teacher@example.com',sodienthoai:'',mamonhoc:'SUB-MATH',macaphoc:'CAP-TH',
  danhsachkhoi:['Lớp 3'],danhsachmohinh:['1-3'],bangcap:'Test',ngaybatdau:'2026-10-15',ngayketthuc:''
 }]);
 assert.deepEqual(created.teacher.danhsachmohinh,['1-3']);
 let fresh=await rpc('vuihoc_business_data',[admin.token]);
 const clean=row=>Object.fromEntries(Object.entries(row).filter(([k])=>k!=='ngaytao'));
 const teacher=clean(fresh.teachers.find(t=>t.madinhdanh===created.id));
 const evalSource=fresh.teachers.flatMap(t=>t.baocaodanhgia)[0];
 const evaluation={...evalSource,id:'REL-EVAL',teacherId:created.id,recipientUserId:created.id,evaluatorUserId:(await db.query(`SELECT madinhdanh FROM vuihoc."NGUOI_DUNG" WHERE tendangnhap='admin.tong'`)).rows[0].madinhdanh,reportCode:'REL-EVAL-1'};
 await rpc('vuihoc_save_business',[admin.token,[{dataset:'teachers',before:teacher,after:{...teacher,baocaodanhgia:[evaluation]}}]]);
 const teacherSession=await rpc('vuihoc_login',[created.username,created.password]);
 const ownData=await rpc('vuihoc_business_data',[teacherSession.token]);
 assert.equal(ownData.report_templates.length,0,'Saved report choices remain private to their owner');
 const own=clean(ownData.teachers.find(t=>t.madinhdanh===created.id));
 await rpc('vuihoc_save_business',[teacherSession.token,[{dataset:'teachers',before:own,after:{...own,lichranh:{'SLOT-1':['free','none','none','none','none','none','none']}}}]]);
 assert.equal((await db.query(`SELECT count(*)::int n FROM vuihoc."BIEN_BAN_DU_GIO" WHERE magiaovien=$1`,[created.id])).rows[0].n,1);
 const template=clean(fresh.report_templates.find(t=>t.madinhdanh==='REL-TEMPLATE'));
 await rpc('vuihoc_save_business',[admin.token,[{dataset:'report_templates',before:template,after:{...template,cauhinh:{...templateConfig,filters:{status:'CHO_LOP'}}}}]]);
 assert.equal((await db.query(`SELECT giatri FROM vuihoc."BO_LOC_MAU_BAO_CAO" WHERE mamau='REL-TEMPLATE' AND truong='status'`)).rows[0].giatri,'CHO_LOP');
 const criterion=(await db.query(`SELECT manhom,matieuchi,madinhdanh FROM vuihoc."LUA_CHON_TIEU_CHI" WHERE matieuchi='CRI_T1' LIMIT 1`)).rows[0];
 const student=(await db.query(`SELECT unnest(danhsachmahocsinh) id FROM vuihoc."LOP_HOC" WHERE madinhdanh='CLS-001' LIMIT 1`)).rows[0].id;
 await db.query(`INSERT INTO vuihoc."NHAN_XET_BUOI_HOC"(mabuoi,mahocsinh,noidung) VALUES('DATE-TIME-TEST',$1,'Test') ON CONFLICT DO NOTHING`,[student]);
 await db.query(`SELECT vuihoc.luu_tieu_chi_nhan_xet('DATE-TIME-TEST',$1,$2)`,[student,{[criterion.matieuchi]:criterion.madinhdanh}]);
 assert.equal((await db.query(`SELECT count(*)::int n FROM vuihoc."TIEU_CHI_NHAN_XET" WHERE mabuoi='DATE-TIME-TEST'`)).rows[0].n,1);
 assert.equal((await db.query(`SELECT count(*)::int n FROM vuihoc."CHI_TIET_NHAT_KY" WHERE duongdan='/matkhau'`)).rows[0].n,0);
 assert.ok((await db.query(`SELECT count(*)::int n FROM vuihoc."NHAT_KY_NGHIEP_VU"`)).rows[0].n>0);
 const current=await rpc('vuihoc_business_data',[admin.token]);
 const category=current.teaching_categories.find(c=>c.madinhdanh==='CAP-TH');
 const tree={...category,danhsachluachon:[...category.danhsachluachon,{id:'TREE-1',label:'Branch'},{id:'TREE-2',label:'Child',parentId:'TREE-1'},{id:'TREE-3',label:'Leaf',parentId:'TREE-2'}]};
 await rpc('vuihoc_save_business',[admin.token,[{dataset:'teaching_categories',before:category,after:tree}]]);
 assert.equal((await db.query(`SELECT macha FROM vuihoc."LUA_CHON_CAP_HOC" WHERE macaphoc='CAP-TH' AND madinhdanh='TREE-3'`)).rows[0].macha,'TREE-2');
 await assert.rejects(rpc('vuihoc_save_business',[admin.token,[{dataset:'teaching_categories',before:tree,after:{...tree,danhsachluachon:tree.danhsachluachon.map(o=>o.id==='TREE-1'?{...o,parentId:'TREE-3'}:o)}}]]),/vòng lặp/);
 const classData=await rpc('vuihoc_business_data',[admin.token]);
 const classRow=clean(classData.classes.find(c=>c.madinhdanh==='CLS-001'));
 const updatedClass={...classRow,chitietcahoc:{...classRow.chitietcahoc,'REL-DRAFT':{sessionNum:200,dateStr:'2026-11-03 (18:00 - 19:30)',feedbackCriteria:{[student]:{[criterion.matieuchi]:criterion.madinhdanh}}}}};
 await rpc('vuihoc_save_business',[admin.token,[{dataset:'classes',before:classRow,after:updatedClass}]]);
 const storedClass=(await db.query(`SELECT chitietcahoc FROM vuihoc."LOP_HOC" WHERE madinhdanh='CLS-001'`)).rows[0];
 assert.ok(!('feedbackCriteria' in storedClass.chitietcahoc['REL-DRAFT']),'Selections are never stored inside the class JSON');
 const restoredClass=(await rpc('vuihoc_business_data',[admin.token])).classes.find(c=>c.madinhdanh==='CLS-001');
 assert.equal(restoredClass.chitietcahoc['REL-DRAFT'].feedbackCriteria[student][criterion.matieuchi],criterion.madinhdanh);
 const credit=(await db.query(`SELECT madinhdanh FROM vuihoc."CONG_DAY_BUOI_HOC" WHERE mabuoi='DATE-TIME-TEST' LIMIT 1`)).rows[0].madinhdanh;
 await db.query(`INSERT INTO vuihoc."GIAI_TRINH_CONG_DAY"(madinhdanh,macong,noidung,loaisuco,lienketminhchung) VALUES('REL-EVIDENCE',$1,'Evidence','Test',$2)`,[credit,'https://drive.google.com/file/d/one/view\nhttps://drive.google.com/file/d/two/view']);
 assert.equal((await db.query(`SELECT count(*)::int n FROM vuihoc."LINK_MINH_CHUNG_CONG" WHERE magiaitrinh='REL-EVIDENCE'`)).rows[0].n,2);
 await assert.rejects(db.exec(`UPDATE vuihoc."GIAI_TRINH_CONG_DAY" SET lienketminhchung='invalid-link' WHERE madinhdanh='REL-EVIDENCE'`),/check constraint/);
 assert.equal((await db.query(`SELECT count(*)::int n FROM vuihoc."LINK_MINH_CHUNG_CONG" WHERE magiaitrinh='REL-EVIDENCE'`)).rows[0].n,2);
 console.log('Passed: migration rerun, exact catalog transfer, date/time types, authorized CRUD and stale-write rejection.');
} catch(error) { console.error(error.message,error.where||'');process.exitCode=1; }
finally { await db.close(); }
