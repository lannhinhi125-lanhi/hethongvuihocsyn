import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
export async function verifyProfileOnlyImport(db,token) {
 const sql=readFileSync('supabase/migrations/20261213_profile_only_student_import.sql','utf8');
 const source=(await db.query('SELECT * FROM vuihoc."HOC_SINH" LIMIT 1')).rows[0];assert.ok(source);
 const after={madinhdanh:'TEST-IMPORT-PROFILE',hoten:'Hồ sơ nhập Excel',khoi:source.makhoi,macaphoc:source.macaphoc,hotencha:'Cha kiểm thử',sodienthoaicha:'0909876543',hotenme:'',sodienthoaime:''};
 const save=changes=>db.query('SELECT public.vuihoc_save_business($1,$2::jsonb)',[token,JSON.stringify(changes)]);
 await assert.rejects(()=>save([{dataset:'students',before:null,after}]));
 await db.exec(sql);await db.exec(sql);
 await save([{dataset:'students',before:null,after}]);
 assert.equal((await db.query('SELECT count(*)::int n FROM vuihoc."DANG_KY_MON_HOC" WHERE mahocsinh=$1',[after.madinhdanh])).rows[0].n,0);
 const data=(await db.query('SELECT public.vuihoc_business_data($1) v',[token])).rows[0].v;
 const received=data.students.find(s=>s.madinhdanh===after.madinhdanh);assert.ok(received);assert.deepEqual(received.dangkymonhoc,[]);
 const existing=data.students.find(s=>s.dangkymonhoc?.length&&s.dangkymonhoc.some(d=>d.status==='CHO_XEP_LOP'));assert.ok(existing);
 const registration=existing.dangkymonhoc.find(d=>d.status==='CHO_XEP_LOP');
 await save([{dataset:'students',before:null,after:{...after,madinhdanh:'TEST-IMPORT-WITH-SUBJECT',dangkymonhoc:[{subject:registration.subject,model:registration.model,level:registration.level,status:'CHO_XEP_LOP',scheduleSlots:[],currentClassCode:null}]}}]);
 assert.equal((await db.query('SELECT count(*)::int n FROM vuihoc."DANG_KY_MON_HOC" WHERE mahocsinh=$1',['TEST-IMPORT-WITH-SUBJECT'])).rows[0].n,1);
 await save([{dataset:'students',before:{madinhdanh:after.madinhdanh},after:{madinhdanh:after.madinhdanh,dangkymonhoc:[{...registration,currentClassCode:null}]}}]);
 assert.equal((await db.query('SELECT count(*)::int n FROM vuihoc."DANG_KY_MON_HOC" WHERE mahocsinh=$1',[after.madinhdanh])).rows[0].n,1);
 await assert.rejects(()=>save([{dataset:'students',before:null,after:{...after,madinhdanh:'TEST-BAD-GRADE',khoi:'NO-SUCH-GRADE'}}]));
 console.log('PASS Excel profile reception: same business RPC and permissions, repeat migration, profile visible with no fabricated enrollment, later real registration, FK checks retained');
}
