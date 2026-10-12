import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const root=process.env.PGLITE_MODULE_PATH!;
const {PGlite}=await import(pathToFileURL(root+'/dist/index.js').href);
const {pgcrypto}=await import(pathToFileURL(root+'/dist/contrib/pgcrypto.js').href);
const db=new PGlite({extensions:{pgcrypto}});
try {
 await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;');
 await db.exec(readFileSync('supabase/schema.sql','utf8'));
 await db.exec(readFileSync('supabase/seed_test_data.sql','utf8'));
 await db.exec(readFileSync('supabase/migrations/20261012_plaintext_passwords.sql','utf8'));
 const call=async(name:string,args:unknown[]) => (await db.query('SELECT public.'+name+'('+args.map((_,i)=>'$'+(i+1)).join(',')+') r',args)).rows[0].r;
 const admin=await call('vuihoc_login',['test.admin.tong','123456']);
 const teacher=await call('vuihoc_login',['test.gv.001','123456']);
 const session=await call('vuihoc_session',[admin.token]);
 const user=session.users.find((u:any)=>u.madinhdanh==='TEST-GV-001');
 assert.equal((await call('vuihoc_reveal_password',[admin.token,user.madinhdanh])).password,'123456');
 const remove=(token:string,before:object)=>call('vuihoc_save_accounts',[token,JSON.stringify([{dataset:'users',before,after:null}])]);
 await assert.rejects(remove(teacher.token,user));
 await assert.rejects(remove(admin.token,session.actor));
 await assert.rejects(remove(admin.token,session.users.find((u:any)=>u.madinhdanh==='USR-01')));
 await assert.rejects(remove(admin.token,{...user,hoten:'stale'}));
 await remove(admin.token,user);
 assert.equal((await db.query('SELECT count(*)::int n FROM vuihoc."NGUOI_DUNG" WHERE madinhdanh=$1',[user.madinhdanh])).rows[0].n,0);
 assert.equal((await db.query('SELECT manguoidung FROM vuihoc."GIAO_VIEN" WHERE madinhdanh=$1',[user.madinhdanh])).rows[0].manguoidung,null);
 await assert.rejects(call('vuihoc_session',[teacher.token]));
 console.log('PASS: reveal password; authorized delete; self/root/unauthorized/stale blocked; teaching profile preserved; deleted session invalidated.');
} finally {await db.close();}
