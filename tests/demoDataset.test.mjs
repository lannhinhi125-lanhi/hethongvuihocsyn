import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.env.PGLITE_MODULE_PATH;
const {PGlite}=await import(pathToFileURL(resolve(root,'dist/index.js')));
const {pgcrypto}=await import(pathToFileURL(resolve(root,'dist/contrib/pgcrypto.js')));
const db=new PGlite({extensions:{pgcrypto},initialMemory:128*1024*1024,postgresqlconf:'shared_buffers=8MB'});
const file=p=>readFileSync(p,'utf8');
try {
 await db.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS 'SELECT null::uuid';");
 await db.exec(file('supabase/schema.sql').replace("to_jsonb(t)->>'ngaytao','') DESC","to_jsonb(t)->>''ngaytao'','''') DESC"));
 await db.exec(file('supabase/seed_test_data.sql'));
 for(const path of ['supabase/upgrade_incident_payroll.sql','supabase/migrations/20261013_teacher_live_payroll.sql','supabase/migrations/20261014_report_creation_dates.sql'])await db.exec(file(path));
 await db.exec(file('supabase/setup_admin.sql').replace(/matkhau text:='[^']*'/,"matkhau text:='234567'"));
 await db.exec(file('supabase/apply_relational_update.sql'));
 for(const name of ['20261015_remove_remaining_json','20261016_complete_foreign_keys','20261017_session_workflow','20261018_auto_checkout','20261020_remove_general_audit','20261021_manual_student_feedback','20261022_document_categories','20261023_inspection_session_queries','20261026_student_subject_enrollments','20261027_standardize_inspection_scores','20261028_document_drive_catalog'])await db.exec(file('supabase/migrations/'+name+'.sql'));
 await db.exec(file('supabase/fix_profile_class_updates.sql'));
 await db.exec(file('supabase/cleanup_unused_tables.sql'));
 await db.exec(file('supabase/setup_teacher_question_history.sql'));
 if(process.argv.includes('--inspect')) {
  const tables=['GIAO_VIEN','HOC_SINH','LOP_HOC','NGUOI_DUNG','BIEN_BAN_DU_GIO','LOAI_SU_CO','LICH_LOP','DOI_SOAT_CONG_GIAO_VIEN','BANG_CONG_THANG'];
  for(const table of tables)console.log(table,JSON.stringify((await db.query("SELECT column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name=$1 ORDER BY ordinal_position",[table])).rows));
  for(const table of ['MON_HOC','MO_HINH_LOP','TRINH_DO','CAP_HOC','LUA_CHON_CAP_HOC'])console.log(table,JSON.stringify((await db.query('SELECT * FROM vuihoc."'+table+'"')).rows));
 } else {
  const seedSql=file('supabase/reset_demo_dataset.sql');
  assert.ok(!seedSql.includes('demo_old_teacher_users'),'teacher cleanup no longer depends on temporary account table');
  assert.ok(seedSql.includes('DO $demo_reset$'),'the reset runs as one atomic SQL statement');
  assert.ok(!/\b(?:INSERT\s+INTO|UPDATE)\s+vuihoc\."(?:CONG_DAY_BUOI_HOC|BANG_CONG_THANG|DOI_SOAT_CONG_GIAO_VIEN)"/i.test(seedSql),'no direct writes to generated payroll/reconciliation');
  assert.ok(!/\bINSERT\s+INTO\s+vuihoc\."BUOI_HOC"/i.test(seedSql),'lessons come from existing schedule generation');
  const preserved=['MON_HOC','TRINH_DO','KHUNG_GIO','MO_HINH_LOP','CAP_HOC','LUA_CHON_CAP_HOC','NHOM_QUYEN','NHOM_QUYEN_CHI_TIET','TAI_LIEU_QUY_TRINH','CAU_HINH_TRO_LY'];
  const snapshot=new Map();
  for(const table of preserved)snapshot.set(table,(await db.query('SELECT * FROM vuihoc."'+table+'" ORDER BY 1')).rows);
  const adminBefore=(await db.query(`SELECT u.* FROM vuihoc."NGUOI_DUNG" u JOIN vuihoc."NHOM_QUYEN" g ON g.madinhdanh=u.manhomquyen WHERE g.congtruycap='ADMIN' ORDER BY u.madinhdanh`)).rows;
  const admin=adminBefore.find(u=>u.tendangnhap==='admin.tong');assert.ok(admin);
  const chatId='00000000-0000-4000-8000-000000000001';
  await db.query('INSERT INTO vuihoc."PHIEN_CHAT_AI"(maphien,manguoidung) VALUES($1,$2)',[chatId,admin.madinhdanh]);
  // Reproduce the deployed database: score columns exist, scoring trigger absent.
  await db.exec('DROP TRIGGER chuan_hoa_diem_du_gio ON vuihoc."BIEN_BAN_DU_GIO"');
  const triggerBefore=(await db.query(`SELECT tgrelid,tgname,tgenabled FROM pg_trigger WHERE NOT tgisinternal AND tgname<>'chuan_hoa_diem_du_gio' ORDER BY tgrelid,tgname`)).rows;
  // Existing locked payroll may be cleared by this explicit reset.
  await db.exec('UPDATE vuihoc."BANG_CONG_THANG" SET dakhoa=true');
  await db.exec(file('supabase/reset_demo_dataset.sql'));
  const count=async table=>(await db.query('SELECT count(*)::int n FROM vuihoc."'+table+'"')).rows[0].n;
  assert.equal(await count('GIAO_VIEN'),12);assert.equal(await count('HOC_SINH'),40);assert.equal(await count('LOP_HOC'),12);
  assert.ok(await count('BUOI_HOC')>250);assert.ok(await count('CONG_DAY_BUOI_HOC')>50);
  assert.equal((await db.query('SELECT count(*)::int n FROM vuihoc."DOI_SOAT_CONG_GIAO_VIEN" WHERE dagui OR trangthai<>\'CHO_GUI\'')).rows[0].n,0,'reconciliation retains generated defaults');
  for(const table of preserved)assert.deepEqual((await db.query('SELECT * FROM vuihoc."'+table+'" ORDER BY 1')).rows,snapshot.get(table),table+' preserved');
  assert.deepEqual((await db.query(`SELECT u.* FROM vuihoc."NGUOI_DUNG" u JOIN vuihoc."NHOM_QUYEN" g ON g.madinhdanh=u.manhomquyen WHERE g.congtruycap='ADMIN' ORDER BY u.madinhdanh`)).rows,adminBefore);
  assert.equal((await db.query('SELECT count(*)::int n FROM vuihoc."PHIEN_CHAT_AI" WHERE maphien=$1',[chatId])).rows[0].n,1);
  assert.deepEqual((await db.query(`SELECT tgrelid,tgname,tgenabled FROM pg_trigger WHERE NOT tgisinternal AND tgname<>'chuan_hoa_diem_du_gio' ORDER BY tgrelid,tgname`)).rows,triggerBefore,'all existing trigger modes restored');
  assert.equal((await db.query(`SELECT count(*)::int n FROM vuihoc."GIAO_VIEN" WHERE madinhdanh NOT LIKE 'DEMO-%'`)).rows[0].n,0);
  assert.equal((await db.query(`SELECT count(*)::int n FROM vuihoc."CONG_DAY_BUOI_HOC" c JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=c.mabuoi WHERE b.trangthai IN ('CHUA_HOC','CHUA_HOAN_TAT','CHUA_DIEN_RA')`)).rows[0].n,0,'uncompleted sessions earn no work');
  assert.ok((await db.query(`SELECT count(*)::int n FROM vuihoc."CONG_DAY_BUOI_HOC" c JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=c.mabuoi WHERE c.loaicong='COVER' AND c.magiaovien=b.magiaoviendaythay`)).rows[0].n>0);
  assert.ok((await db.query(`SELECT count(*)::int n FROM vuihoc."BUOI_HOC" b WHERE b.trangthai='DA_HOC' AND NOT vuihoc.ca_du_dieu_kien_ghi_cong(b.madinhdanh) AND NOT EXISTS(SELECT 1 FROM vuihoc."CONG_DAY_BUOI_HOC" c WHERE c.mabuoi=b.madinhdanh)`)).rows[0].n>0,'partial comments await credit');
  assert.equal((await db.query(`SELECT count(*)::int n FROM (SELECT mahocsinh FROM vuihoc."DANG_KY_MON_HOC" GROUP BY mahocsinh HAVING count(*)>1) x`)).rows[0].n,2);
  assert.equal((await db.query('SELECT count(DISTINCT xeploai)::int n FROM vuihoc."BIEN_BAN_DU_GIO"')).rows[0].n,4);
  const materialRows=(await db.query('SELECT * FROM vuihoc."HOC_LIEU_LOP"')).rows;
  assert.ok(materialRows.some(h=>h.sobuoi===2),'both weekly sessions have materials');
  for(const h of materialRows) {
   assert.match(h.thang,/^\d{2}\/\d{4}$/);
   assert.match(h.tuan,/Từ ngày \d{2}\/\d{2}\/\d{4} đến ngày \d{2}\/\d{2}\/\d{4}/);
  }
  const workBeforeMaterials=(await db.query('SELECT * FROM vuihoc."CONG_DAY_BUOI_HOC" ORDER BY madinhdanh')).rows;
  const lessonsBeforeMaterials=(await db.query('SELECT * FROM vuihoc."BUOI_HOC" ORDER BY madinhdanh')).rows;
  // Reproduce the already-loaded old seed, then repair without resetting lessons.
  await db.exec(`DELETE FROM vuihoc."HOC_LIEU_LOP";
   INSERT INTO vuihoc."HOC_LIEU_LOP"(malop,thutu,thang,tuan,sobuoi,tieude,lienketslide,lienketlms)
   SELECT madinhdanh,1,'Tháng 10','Tuần 42',1,'Bộ bài luyện tập tuần 1','https://example.com/vuihoc/materials/'||madinhdanh||'/1','' FROM vuihoc."LOP_HOC";`);
  await db.exec(file('supabase/fix_demo_class_materials.sql'));
  assert.equal(await count('HOC_LIEU_LOP'),materialRows.length);
  await db.exec(file('supabase/fix_demo_class_materials.sql'));
  assert.equal(await count('HOC_LIEU_LOP'),materialRows.length,'repair does not duplicate materials');
  assert.deepEqual((await db.query('SELECT * FROM vuihoc."CONG_DAY_BUOI_HOC" ORDER BY madinhdanh')).rows,workBeforeMaterials);
  assert.deepEqual((await db.query('SELECT * FROM vuihoc."BUOI_HOC" ORDER BY madinhdanh')).rows,lessonsBeforeMaterials);
  await db.exec(file('supabase/fix_class_material_updates.sql'));
  await db.exec(file('supabase/fix_class_material_updates.sql'));
  const classId='DEMO-LOP-001';
  const materialsBefore=(await db.query('SELECT * FROM vuihoc."HOC_LIEU_LOP" WHERE malop=$1 ORDER BY thutu',[classId])).rows;
  const materialJson=materialsBefore.map(h=>({month:h.thang,week:h.tuan,session:h.sobuoi,title:h.tieude,slide:h.lienketslide,lms:h.lienketlms}));
  const changed=structuredClone(materialJson);changed[0].title='Nội dung đã cập nhật';changed[0].slide='https://example.com/new-slide';
  await db.exec(`CREATE FUNCTION public.reject_material_reinsert() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'Existing material must be updated in place'; END$$;
   CREATE TRIGGER reject_material_reinsert BEFORE INSERT OR DELETE ON vuihoc."HOC_LIEU_LOP" FOR EACH ROW EXECUTE FUNCTION public.reject_material_reinsert();`);
  const materialAdmin=(await db.query("SELECT public.vuihoc_login('admin.tong','234567') value")).rows[0].value;
  await db.query('SELECT public.vuihoc_save_business($1,$2::jsonb)',[materialAdmin.token,JSON.stringify([
   {dataset:'classes',before:{madinhdanh:classId,hoclieu:materialJson},after:{madinhdanh:classId,hoclieu:changed}}
  ])]);
  const materialsAfter=(await db.query('SELECT * FROM vuihoc."HOC_LIEU_LOP" WHERE malop=$1 ORDER BY thutu',[classId])).rows;
  assert.deepEqual(materialsAfter.map(h=>h.thutu),materialsBefore.map(h=>h.thutu),'existing material primary keys remain stable');
  assert.equal(materialsAfter[0].tieude,'Nội dung đã cập nhật');assert.deepEqual(materialsAfter.slice(1),materialsBefore.slice(1),'other sessions/weeks unchanged');
  await db.exec('DROP TRIGGER reject_material_reinsert ON vuihoc."HOC_LIEU_LOP"; DROP FUNCTION public.reject_material_reinsert()');
  const added=[...changed,{...changed[0],month:'12/2026',week:'Tuần 1: Từ ngày 07/12/2026 đến ngày 13/12/2026'}];
  await db.query('SELECT vuihoc.ghi_cac_truong_con($1,$2::jsonb,false)',['LOP_HOC',JSON.stringify({madinhdanh:classId,hoclieu:added})]);
  assert.equal((await db.query('SELECT count(*)::int n FROM vuihoc."HOC_LIEU_LOP" WHERE malop=$1',[classId])).rows[0].n,materialsBefore.length+1);
  await assert.rejects(db.query('SELECT vuihoc.ghi_cac_truong_con($1,$2::jsonb,false)',['LOP_HOC',JSON.stringify({madinhdanh:classId,hoclieu:[...added,added[0]]})]),/một học liệu/);
  await db.query('SELECT vuihoc.ghi_cac_truong_con($1,$2::jsonb,false)',['LOP_HOC',JSON.stringify({madinhdanh:classId,hoclieu:materialJson})]);
  assert.deepEqual((await db.query('SELECT * FROM vuihoc."HOC_LIEU_LOP" WHERE malop=$1 ORDER BY thutu',[classId])).rows,materialsBefore);
  assert.equal((await db.query('SELECT count(*)::int n FROM vuihoc."BIEN_BAN_DU_GIO" WHERE diemtong IS DISTINCT FROM round((diemtc1+2*diemtc2+diemtc3)/4,2)')).rows[0].n,0);
  // Read the same RPCs as both portals; totals remain query-derived.
  const login=async(username,password)=>(await db.query('SELECT public.vuihoc_login($1,$2) value',[username,password])).rows[0].value;
  const adminSession=await login('admin.tong','234567');assert.ok(adminSession.token);
  const business=(await db.query('SELECT public.vuihoc_business_data($1) value',[adminSession.token])).rows[0].value;
  assert.equal(business.teachers.length,12);assert.equal(business.students.length,40);assert.equal(business.classes.length,12);
  const teacherSession=await login('gv.minhanh','246810');assert.ok(teacherSession.token);
  const own=(await db.query('SELECT public.vuihoc_business_data($1) value',[teacherSession.token])).rows[0].value;
  assert.ok(own.dated_lessons.length>0);assert.ok(own.dated_lessons.every(b=>b.magiaovienchinh==='DEMO-GV-001'||b.magiaoviendaythay==='DEMO-GV-001'));
  // Home uses the existing dashboard feature, recognized by server read guards.
  await db.exec(`INSERT INTO vuihoc."NHOM_QUYEN"(madinhdanh,tennhomquyen,phanloai,mota,soluongnguoidung,macdinh,congtruycap) VALUES('HOME-ONLY','Chỉ Bàn làm việc','VẬN HÀNH','',0,false,'ADMIN');
   INSERT INTO vuihoc."NHOM_QUYEN_CHI_TIET"(manhom,maquyen,thutu) VALUES('HOME-ONLY','Xem Dashboard chỉ số KPI & Biểu đồ tổng quan',1);
   INSERT INTO vuihoc."NGUOI_DUNG"(madinhdanh,hoten,tendangnhap,thudientu,sodienthoai,vaitro,trangthai,chucaiavatar,manhomquyen,matkhau)
   VALUES('HOME-USER','Chỉ Bàn làm việc','home.only','home@example.com','0900000000','Chỉ Bàn làm việc','active','HL','HOME-ONLY','246810');`);
  const homeSession=await login('home.only','246810');assert.ok(homeSession.token);
  const homeData=(await db.query('SELECT public.vuihoc_business_data($1) value',[homeSession.token])).rows[0].value;
  assert.equal(homeData.classes.length,12);assert.equal(homeData.students.length,40);assert.equal(homeData.dated_lessons.length,await count('BUOI_HOC'));
  await assert.rejects(db.query('SELECT public.vuihoc_save_business($1,$2::jsonb)',[homeSession.token,JSON.stringify([
   {dataset:'classes',before:{madinhdanh:'DEMO-LOP-001',tenlophoc:business.classes.find(c=>c.madinhdanh==='DEMO-LOP-001').tenlophoc},after:{madinhdanh:'DEMO-LOP-001',tenlophoc:'Unauthorized change'}}
  ])]),/quyền/);
  const counts={teachers:await count('GIAO_VIEN'),students:await count('HOC_SINH'),classes:await count('LOP_HOC'),lessons:await count('BUOI_HOC'),comments:(await db.query(`SELECT count(*)::int n FROM vuihoc."NHAN_XET_BUOI_HOC" WHERE btrim(noidung)<>''`)).rows[0].n,work:await count('CONG_DAY_BUOI_HOC'),incidents:await count('SU_CO_BUOI_HOC'),inspections:await count('BIEN_BAN_DU_GIO')};
  await db.exec('ALTER TABLE vuihoc."BIEN_BAN_DU_GIO" DISABLE TRIGGER chuan_hoa_diem_du_gio');
  await db.exec(file('supabase/reset_demo_dataset.sql'));
  assert.equal(await count('BUOI_HOC'),counts.lessons);assert.equal(await count('CONG_DAY_BUOI_HOC'),counts.work,'rerun does not duplicate work');
  assert.equal((await db.query("SELECT tgenabled FROM pg_trigger WHERE tgrelid='vuihoc.\"BIEN_BAN_DU_GIO\"'::regclass AND tgname='chuan_hoa_diem_du_gio'")).rows[0].tgenabled,'O','disabled scoring trigger is restored');
  // Unknown external dependencies abort the reset atomically instead of CASCADE.
  await db.exec(`CREATE TABLE public.demo_reset_dependency(id text REFERENCES vuihoc."BUOI_HOC"(madinhdanh)); INSERT INTO public.demo_reset_dependency SELECT madinhdanh FROM vuihoc."BUOI_HOC" LIMIT 1;`);
  await assert.rejects(db.exec(file('supabase/reset_demo_dataset.sql')),/foreign key|constraint/i);
  await db.exec('ROLLBACK');
  assert.equal(await count('BUOI_HOC'),counts.lessons);assert.equal(await count('CONG_DAY_BUOI_HOC'),counts.work);
  console.log('PASS: demo reset, preserved admin/catalogs/chat, restored guards, automatic work, portal RPCs, rerun, atomic dependency failure');
  console.log(JSON.stringify(counts));
 }
} catch(error) {console.error(error.message,error.detail||'',error.where||'');process.exitCode=1;}
finally {await db.close();}
