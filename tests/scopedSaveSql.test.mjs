import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.env.PGLITE_MODULE_PATH||'.tmp/demo-validation/node_modules/@electric-sql/pglite';
const {PGlite}=await import(pathToFileURL(resolve(root,'dist/index.js')));
const {pgcrypto}=await import(pathToFileURL(resolve(root,'dist/contrib/pgcrypto.js')));
const db=new PGlite({extensions:{pgcrypto}});
try {
 await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;');
 await db.exec(readFileSync('supabase/schema.sql','utf8').replace("to_jsonb(t)->>'ngaytao','') DESC","to_jsonb(t)->>''ngaytao'','''') DESC").replace("END IF;'\n SELECT * INTO cls", "END IF;\n SELECT * INTO cls"));
 await db.exec(readFileSync('supabase/setup_admin.sql','utf8').replace(/matkhau text:='[^']*'/,"matkhau text:='234567'"));
 const migration=readFileSync('supabase/migrations/20261220_scoped_save_results.sql','utf8');
 await db.exec(migration);await db.exec(migration);
 const call=async(name,args)=>(await db.query('SELECT public.'+name+'('+args.map((_,i)=>'$'+(i+1)).join(',')+') result',args)).rows[0].result;
 await db.exec('SET ROLE anon');
 const {token}=await call('vuihoc_login',['admin.tong','234567']);
 const subject={madinhdanh:'SCOPE-SUB',mamonhoc:'SCOPE-SUB',tenviettat:'SCOPE',tenmonhoc:'Scoped',mota:'',danghoatdong:true};
 const receipt=await call('vuihoc_save_business',[token,JSON.stringify([{dataset:'subjects',before:null,after:subject}])]);
 assert.equal(receipt.partial,true);
 assert.ok(receipt.data.subjects.some(row=>row.madinhdanh===subject.madinhdanh));
 assert.ok(!Object.hasOwn(receipt.data,'sop_documents'));
 assert.ok(!Object.hasOwn(receipt.data,'report_templates'));
 const full=await call('vuihoc_business_data',[token]);
 assert.ok(Object.hasOwn(full,'sop_documents'),'scope restored before subsequent reads');
 assert.ok(Object.hasOwn(full,'report_templates'));
 for(const [key,value] of Object.entries(receipt.data))assert.deepEqual(value,full[key],`same authorized ${key} projection`);
 // Compare-mode conflicts still reject writes and do not leak the read scope.
 await assert.rejects(call('vuihoc_save_business',[token,JSON.stringify([{dataset:'subjects',before:{...subject,tenmonhoc:'Wrong'},after:{...subject,tenmonhoc:'New'}}])]),/thay đổi/);
 await assert.rejects(call('vuihoc_save_business',['bad-token','[]']));
 await assert.rejects(db.query('SELECT vuihoc.scoped_save_data($1,$2)',[token,['subjects']]),/permission denied/);
 await db.exec('RESET ROLE');
 const affected=(await db.query(`SELECT vuihoc.save_result_datasets('[{"dataset":"dated_lessons"}]') result`)).rows[0].result;
 assert.ok(affected.includes('monthly_payroll'));
 assert.ok(affected.includes('dated_lessons'));
 assert.ok(!affected.includes('sop_documents'));
 await db.exec(readFileSync('supabase/migrations/20261014_normalize_monthly_payroll.sql','utf8'));
 await db.exec(readFileSync('supabase/migrations/20261015_relational_catalogs_dates.sql','utf8'));
 await db.exec(migration);await db.exec(migration);
 // A missing unrelated table would fail a full read, but must not affect this save.
 await db.exec('ALTER TABLE vuihoc."TAI_LIEU_QUY_TRINH" RENAME TO "UNRELATED_READ_TRAP"; SET ROLE anon;');
 const normalized=await call('vuihoc_save_business',[token,JSON.stringify([{dataset:'subjects',before:subject,after:{...subject,tenmonhoc:'Normalized'}}])]);
 assert.equal(normalized.partial,true);
 assert.ok(normalized.data.subjects.some(row=>row.tenmonhoc==='Normalized'));
 assert.ok(!Object.hasOwn(normalized.data,'sop_documents'));
 await db.exec('RESET ROLE; ALTER TABLE vuihoc."UNRELATED_READ_TRAP" RENAME TO "TAI_LIEU_QUY_TRINH";');
 assert.ok(Object.hasOwn(await call('vuihoc_business_data',[token]),'sop_documents'));
 console.log('PASS scoped SQL: repeat migration, authorized save/read parity, unrelated datasets skipped, scope restoration, CAS, auth, private helper');
} finally {await db.close();}
