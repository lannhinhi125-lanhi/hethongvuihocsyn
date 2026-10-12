// Historical encrypted-password migration compatibility. Current behavior: plaintextPasswords.test.ts.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const root=process.env.PGLITE_MODULE_PATH!;
const {PGlite}=await import(pathToFileURL(root+'/dist/index.js').href);
const {pgcrypto}=await import(pathToFileURL(root+'/dist/contrib/pgcrypto.js').href);
const db=new PGlite({extensions:{pgcrypto}});
try {
 await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;');
 await db.exec((readFileSync('supabase/schema.sql','utf8').split('-- MAT KHAU TEXT 6-8 CHU SO.')[0]+'COMMIT;'));
 await db.exec(readFileSync('supabase/migrations/20261011_teacher_persistence.sql','utf8'));
 await db.exec(readFileSync('supabase/migrations/20261011_teacher_persistence.sql','utf8'));
 const setup=readFileSync('tests/fixtures/setup_admin_encrypted.sql','utf8').replace(/matkhau text:='[^']*'/,"matkhau text:='TeacherTest@890'");
 await db.exec(setup);
 const call=async(name:string,args:unknown[]) => (await db.query('SELECT public.'+name+'('+args.map((_,i)=>'$'+(i+1)).join(',')+') result',args)).rows[0].result;
 await db.exec('SET ROLE anon');
 const login=await call('vuihoc_login',['admin.tong','TeacherTest@890']);const token=login.token;
 const before=await call('vuihoc_teacher_data',[token]);
 assert.ok(before.subjects.length&&before.teaching_categories.length&&before.class_models.length);
 const category=before.teaching_categories.find((x:any)=>x.madinhdanh==='CAP-TH');
 const profile={hoten:'Giáo viên mới',thudientu:' NEW.TEACHER@example.com ',sodienthoai:'0900123456',mamonhoc:'SUB-MATH',macaphoc:category.madinhdanh,danhsachkhoi:[category.danhsachluachon[0].id],danhsachmohinh:['1-1'],bangcap:'Đại học'};
 const create=(p:object,t=token)=>call('vuihoc_create_teacher',[t,JSON.stringify(p)]);
 await assert.rejects(create(profile,'x'.repeat(64)),/hết hạn/);
 await assert.rejects(create({...profile,mamonhoc:'INVALID'}),/Môn học/);
 await assert.rejects(create({...profile,danhsachkhoi:['UNKNOWN']}),/Khối/);
 await assert.rejects(create({...profile,danhsachmohinh:['UNKNOWN']}),/Mô hình/);
 await assert.rejects(create({...profile,manhomquyen:'ROLE-01'}),/Hồ sơ/);
 const created=await create(profile);
 assert.match(created.id,/^GV-/);assert.equal(created.username,created.id);
 const refreshed=await call('vuihoc_teacher_data',[token]);
 assert.equal(refreshed.teachers.length,before.teachers.length+1);
 const persisted=refreshed.teachers.find((x:any)=>x.madinhdanh===created.id);
 assert.equal(persisted.manguoidung,created.id);assert.equal(persisted.thudientu,'new.teacher@example.com');
 assert.equal(persisted.trangthai,'CHO_LOP');assert.equal(persisted.mamonhoc,'SUB-MATH');
 assert.ok(!JSON.stringify(refreshed).includes(created.password));
 const teacherLogin=await call('vuihoc_login',[created.username,created.password]);
 assert.equal(teacherLogin.actor.madinhdanh,created.id);assert.ok(teacherLogin.actor.manhomquyen);
 const own=await call('vuihoc_teacher_data',[teacherLogin.token]);assert.equal(own.teachers.length,1);assert.equal(own.teachers[0].madinhdanh,created.id);
 await assert.rejects(create({...profile,thudientu:'other@example.com'},teacherLogin.token),/Không có quyền/);
 await assert.rejects(create(profile),/Email đã/);
 const second=await create({...profile,thudientu:'second@example.com'});assert.notEqual(second.id,created.id);
 await db.exec('RESET ROLE');
 // PH3-only operators can create teachers without receiving general account/role administration.
 await db.exec(`INSERT INTO vuihoc."NHOM_QUYEN"(madinhdanh,tennhomquyen,phanloai,mota,soluongnguoidung,danhsachquyen,congtruycap) VALUES('TEST-PH3','Creator','VẬN HÀNH','',0,ARRAY['Thêm/sửa hồ sơ và cấp tài khoản giáo viên'],'ADMIN');
 UPDATE vuihoc."NGUOI_DUNG" SET manhomquyen='TEST-PH3',matkhau_mahoa=vuihoc.ma_hoa_mat_khau('Operator@890') WHERE madinhdanh='USR-03';`);
 await db.exec('SET ROLE anon');
 // Use the stored username to avoid depending on demo naming conventions.
 await db.exec('RESET ROLE');
 const username=(await db.query('SELECT tendangnhap FROM vuihoc."NGUOI_DUNG" WHERE madinhdanh=$1',['USR-03'])).rows[0].tendangnhap;
 await db.exec('SET ROLE anon');
 const op=await call('vuihoc_login',[username,'Operator@890']);
 assert.ok(op.token);assert.equal(op.users.length,1);
 const limited=await create({...profile,thudientu:'limited@example.com'},op.token);assert.ok(limited.id);
 // Force the second insert to fail: the account insert and audit must roll back too.
 await db.exec('RESET ROLE');
 await db.exec(`CREATE FUNCTION vuihoc.fail_teacher_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.thudientu='rollback@example.com' THEN RAISE EXCEPTION 'forced teacher failure'; END IF; RETURN NEW; END $$;
 CREATE TRIGGER fail_teacher_test BEFORE INSERT ON vuihoc."GIAO_VIEN" FOR EACH ROW EXECUTE FUNCTION vuihoc.fail_teacher_test();`);
 const auditBefore=(await db.query('SELECT count(*)::int n FROM vuihoc."NHAT_KY_NGHIEP_VU"')).rows[0].n;
 await db.exec('SET ROLE anon');
 await assert.rejects(create({...profile,thudientu:'rollback@example.com'}),/forced teacher failure/);
 await db.exec('RESET ROLE');
 assert.equal((await db.query('SELECT count(*)::int n FROM vuihoc."NGUOI_DUNG" WHERE thudientu=$1',['rollback@example.com'])).rows[0].n,0);
 assert.equal((await db.query('SELECT count(*)::int n FROM vuihoc."NHAT_KY_NGHIEP_VU"')).rows[0].n,auditBefore);
 assert.equal((await db.query("SELECT count(*)::int n FROM pg_tables WHERE schemaname='vuihoc'")).rows[0].n,31);
 console.log('PASS: atomic teacher/account creation, assigned teacher role and login, reload, catalog hydration, own-profile isolation, PH3-only creation, validation, duplicate protection and rollback.');
} finally {await db.close();}
