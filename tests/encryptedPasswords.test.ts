// Historical encrypted-password migration compatibility. Current behavior: plaintextPasswords.test.ts.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const root=process.env.PGLITE_MODULE_PATH!;
assert.ok(root);
const {PGlite}=await import(pathToFileURL(root+'/dist/index.js').href);
const {pgcrypto}=await import(pathToFileURL(root+'/dist/contrib/pgcrypto.js').href);
const db=new PGlite({extensions:{pgcrypto}});
const migration=readFileSync('supabase/migrations/20261011_encrypted_passwords.sql','utf8');
const call=async(name:string,args:unknown[]) => (await db.query('SELECT public.'+name+'('+args.map((_,i)=>'$'+(i+1)).join(',')+') result',args)).rows[0].result;
try {
 await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;');
 // Actual upgrade from the previous 32-table version, not only fresh schema.
 await db.exec((readFileSync('supabase/schema.sql','utf8').split('-- MAT KHAU TEXT 6-8 CHU SO.')[0]+'COMMIT;').split('-- MẬT KHẨU MÃ HÓA CÓ THỂ XEM LẠI.')[0]+'COMMIT;');
 await db.query('UPDATE vuihoc."NGUOI_DUNG" SET matkhau_bam=extensions.crypt($1,extensions.gen_salt($2,10)) WHERE madinhdanh=$3',['LegacyAdmin@890','bf','USR-01']);
 await db.query('UPDATE vuihoc."NGUOI_DUNG" SET matkhau_bam=extensions.crypt($1,extensions.gen_salt($2,10)) WHERE madinhdanh=$3',['LegacyTeacher@890','bf','GV-001']);
 await db.exec(migration);
 await db.exec('SET ROLE anon');
 const admin=await call('vuihoc_login',['admin.tong','LegacyAdmin@890']);assert.ok(admin.token);
 assert.equal((await call('vuihoc_reveal_password',[admin.token,'USR-01'])).password,'LegacyAdmin@890');
 assert.ok((await call('vuihoc_reveal_password',[admin.token,'GV-001'])).error.includes('dạng băm'));
 assert.ok((await call('vuihoc_login',['gv.001','wrong'])).error);
 assert.ok((await call('vuihoc_reveal_password',[admin.token,'GV-001'])).error);
 const teacher=await call('vuihoc_login',['gv.001','LegacyTeacher@890']);assert.ok(teacher.token);
 assert.equal((await call('vuihoc_reveal_password',[admin.token,'GV-001'])).password,'LegacyTeacher@890');
 await assert.rejects(call('vuihoc_reveal_password',[teacher.token,'USR-01']),/không có quyền/);
 await assert.rejects(call('vuihoc_reveal_password',['a'.repeat(64),'USR-01']),/hết hạn/);
 await assert.rejects(call('vuihoc_reveal_password',[admin.token,'MISSING']),/Không tìm thấy/);
 await assert.rejects(db.query('SELECT vuihoc.giai_ma_mat_khau(NULL)'),/permission denied/);
 await assert.rejects(db.query('SELECT khoamatkhau FROM vuihoc."CAU_HINH_HE_THONG"'),/permission denied/);
 await db.exec('RESET ROLE');
 const user=(await db.query('SELECT matkhau_bam,matkhau_mahoa FROM vuihoc."NGUOI_DUNG" WHERE madinhdanh=$1',['USR-01'])).rows[0];
 assert.equal(user.matkhau_bam,null);assert.ok(user.matkhau_mahoa);
 const key=(await db.query('SELECT khoamatkhau FROM vuihoc."CAU_HINH_HE_THONG" WHERE madinhdanh=$1',['global'])).rows[0].khoamatkhau;
 await db.exec(migration);await db.exec((readFileSync('supabase/schema.sql','utf8').split('-- MAT KHAU TEXT 6-8 CHU SO.')[0]+'COMMIT;'));
 assert.equal((await db.query('SELECT khoamatkhau FROM vuihoc."CAU_HINH_HE_THONG" WHERE madinhdanh=$1',['global'])).rows[0].khoamatkhau,key);
 assert.equal((await call('vuihoc_reveal_password',[admin.token,'USR-01'])).password,'LegacyAdmin@890','rerun keeps encryption key and ciphertext usable');
 const logs=JSON.stringify((await db.query('SELECT * FROM vuihoc."NHAT_KY_NGHIEP_VU"')).rows);
 for(const secret of [key,'LegacyAdmin@890','LegacyTeacher@890','matkhau_mahoa','khoamatkhau'])assert.ok(!logs.includes(secret),'history must not leak '+(secret===key?'encryption key':'password data'));
 // Old bootstrap SQL must invalidate a stale ciphertext instead of keeping the previous password active.
 await db.query('UPDATE vuihoc."NGUOI_DUNG" SET matkhau_bam=extensions.crypt($1,extensions.gen_salt($2,10)) WHERE madinhdanh=$3',['ResetLegacy@890','bf','GV-001']);
 assert.ok((await call('vuihoc_login',['gv.001','LegacyTeacher@890'])).error);
 assert.ok((await call('vuihoc_login',['gv.001','ResetLegacy@890'])).token);
 assert.equal((await call('vuihoc_reveal_password',[admin.token,'GV-001'])).password,'ResetLegacy@890');
 console.log('PASS: existing hash upgrade only after correct login, authorized reveal, teacher/anonymous/key-access denial, key preserved across migration and full schema reruns, audit redaction, old password reset compatibility.');
}finally{await db.close();}
