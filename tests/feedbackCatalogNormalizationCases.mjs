import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
export async function verifyFeedbackCatalogNormalization(db,token){
 const file=p=>readFileSync(p,'utf8');
 const migration=file('supabase/migrations/20261201_review_feedback_catalogs.sql'),diagnostic=file('supabase/diagnostics/feedback_catalog_legacy.sql');
 const business=async(t=token)=>(await db.query('SELECT public.vuihoc_business_data($1) AS v',[t])).rows[0].v;
 const save=changes=>db.query('SELECT public.vuihoc_save_business($1,$2::jsonb)',[token,JSON.stringify(changes)]);
 const rows=async table=>(await db.query(`SELECT to_jsonb(t) AS v FROM vuihoc."${table}" t ORDER BY to_jsonb(t)::text`)).rows.map(x=>x.v);
 const retired=['NHOM_TIEU_CHI','TIEU_CHI','LUA_CHON_TIEU_CHI','TIEU_CHI_NHAN_XET'];
 for(const name of retired)assert.equal((await db.query('SELECT to_regclass($1) AS r',['vuihoc."'+name+'"'])).rows[0].r,null);
 assert.equal((await business()).criteria_categories,undefined);
 const before={};for(const name of ['NHAN_XET_BUOI_HOC','DANH_MUC_BO_SUNG','MUC_DANH_MUC','LOP_HOC','CONG_DAY_BUOI_HOC'])before[name]=await rows(name);
 assert.ok(before.NHAN_XET_BUOI_HOC.length);assert.ok(before.NHAN_XET_BUOI_HOC.some(x=>x.noidung));assert.deepEqual((await db.query(diagnostic)).rows,[]);
 const fixtures=[
 `INSERT INTO vuihoc."DANH_MUC_BO_SUNG"(madinhdanh,madanhmuc,tendanhmuc,mota) VALUES('BAD-CODE-CASE','class_duration','Duplicate code ignoring case','')`,
 `INSERT INTO vuihoc."DANH_MUC_BO_SUNG"(madinhdanh,madanhmuc,tendanhmuc,mota) VALUES('BAD-ENTRY-CODES','BAD_ENTRY_CODES','Duplicate entries','');
  INSERT INTO vuihoc."MUC_DANH_MUC" VALUES('BAD-ENTRY-CODES','A','KEY','One','',true,1),('BAD-ENTRY-CODES','B','key','Two','',true,2)`,
 `INSERT INTO vuihoc."DANH_MUC_BO_SUNG"(madinhdanh,madanhmuc,tendanhmuc,mota) VALUES('BAD-CYCLE-A','BAD_CYCLE_A','Cycle A','');
  INSERT INTO vuihoc."DANH_MUC_BO_SUNG"(madinhdanh,madanhmuc,tendanhmuc,mota,madanhmuccha) VALUES('BAD-CYCLE-B','BAD_CYCLE_B','Cycle B','','BAD-CYCLE-A');
  UPDATE vuihoc."DANH_MUC_BO_SUNG" SET madanhmuccha='BAD-CYCLE-B' WHERE madinhdanh='BAD-CYCLE-A'`
 ];
 for(const fixture of fixtures){await db.exec('BEGIN');await db.exec(fixture);assert.ok((await db.query(diagnostic)).rows.length);await assert.rejects(()=>db.exec(migration),/mã trùng, giá trị thiếu hoặc vòng lặp/);await db.exec('ROLLBACK');}
 const tables=async()=>(await db.query("SELECT tablename FROM pg_tables WHERE schemaname='vuihoc' ORDER BY tablename")).rows;
 const tableNames=await tables();await db.exec(migration);await db.exec(migration);assert.deepEqual(await tables(),tableNames);
 for(const [name,old] of Object.entries(before))assert.deepEqual(await rows(name),old);
 for(const [name,count] of [['NHAN_XET_BUOI_HOC',6],['DANH_MUC_BO_SUNG',7],['MUC_DANH_MUC',7]])assert.equal((await db.query("SELECT count(*)::int n FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name=$1",[name])).rows[0].n,count);
 await assert.rejects(()=>save([{dataset:'criteria_categories',before:null,after:{madinhdanh:'DO-NOT-RECREATE'}}]));

 // Current handwritten feedback is the source: use the teacher's real class/session RPC.
 const feedback=(await db.query(`SELECT n.mabuoi,n.mahocsinh,c.khoaca,b.malop,g.manguoidung,u.tendangnhap
 FROM vuihoc."NHAN_XET_BUOI_HOC" n JOIN vuihoc."CHI_TIET_CA_LOP" c ON c.mabuoi=n.mabuoi
 JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=n.mabuoi JOIN vuihoc."LOP_HOC" l ON l.madinhdanh=b.malop
 JOIN vuihoc."GIAO_VIEN" g ON g.madinhdanh=coalesce(b.magiaoviendaythay,b.magiaovienchinh)
 JOIN vuihoc."NGUOI_DUNG" u ON u.madinhdanh=g.manguoidung WHERE u.trangthai='active' AND l.trangthai='DANG_HOC'
 AND NOT EXISTS(SELECT 1 FROM vuihoc."BANG_CONG_THANG" p WHERE p.kycong=to_char(b.ngayhoc,'YYYY-MM') AND p.dakhoa) LIMIT 1`)).rows[0];assert.ok(feedback);
 const teacherToken=(await db.query('SELECT public.vuihoc_login($1,$2) AS v',[feedback.tendangnhap,'246810'])).rows[0].v.token;
 const teacherData=await business(teacherToken),cls=teacherData.classes.find(x=>x.madinhdanh===feedback.malop);assert.ok(cls?.chitietcahoc[feedback.khoaca]);
 const comments=structuredClone(cls.chitietcahoc);comments[feedback.khoaca].feedback={...comments[feedback.khoaca].feedback,[feedback.mahocsinh]:'Handwritten feedback from the authoritative lesson/student row'};
 await db.query('SELECT public.vuihoc_save_business($1,$2::jsonb)',[teacherToken,JSON.stringify([{dataset:'classes',before:{madinhdanh:cls.madinhdanh,chitietcahoc:cls.chitietcahoc},after:{madinhdanh:cls.madinhdanh,chitietcahoc:comments}}])]);
 const stored=(await db.query('SELECT noidung,manguoicapnhat FROM vuihoc."NHAN_XET_BUOI_HOC" WHERE mabuoi=$1 AND mahocsinh=$2',[feedback.mabuoi,feedback.mahocsinh])).rows[0];assert.equal(stored.noidung,comments[feedback.khoaca].feedback[feedback.mahocsinh]);assert.equal(stored.manguoicapnhat,feedback.manguoidung);
 assert.equal((await business()).classes.find(x=>x.madinhdanh===cls.madinhdanh).chitietcahoc[feedback.khoaca].feedback[feedback.mahocsinh],stored.noidung);

 // Global catalog codes and per-catalog item codes have different scopes.
 const catalog=(id,code,name,parent=null,entries=[])=>({madinhdanh:id,madanhmuc:code,tendanhmuc:name,mota:'',madanhmuccha:parent,danhsachmuc:entries});
 const root=catalog('REVIEW-CATALOG-ROOT','REVIEW_CUSTOM_ROOT','Review root'),child=catalog('REVIEW-CATALOG-CHILD','REVIEW_CUSTOM_CHILD','Review child',root.madinhdanh,[{id:'ENTRY-ONE',code:'SAME',name:'First source label',desc:'',status:true}]),other=catalog('REVIEW-CATALOG-OTHER','REVIEW_CUSTOM_OTHER','Review other',null,[{id:'ENTRY-ONE',code:'SAME',name:'Second scoped source label',desc:'',status:true}]);
 for(const after of [root,child,other])await save([{dataset:'custom_catalogs',before:null,after}]);
 const getCatalog=async id=>(await business()).custom_catalogs.find(x=>x.madinhdanh===id);
 assert.equal((await getCatalog(child.madinhdanh)).danhsachmuc[0].name,'First source label');assert.equal((await getCatalog(other.madinhdanh)).danhsachmuc[0].name,'Second scoped source label');
 await assert.rejects(()=>save([{dataset:'custom_catalogs',before:null,after:catalog('REVIEW-CATALOG-DUP','review_custom_root','Duplicate in another branch',child.madinhdanh)}]));
 let current=await getCatalog(child.madinhdanh);const badEntries=[...current.danhsachmuc,{id:'DUPLICATE-ENTRY',code:' same ',name:'Duplicate item code',desc:'',status:true}];
 await assert.rejects(()=>save([{dataset:'custom_catalogs',before:{madinhdanh:current.madinhdanh,danhsachmuc:current.danhsachmuc},after:{madinhdanh:current.madinhdanh,danhsachmuc:badEntries}}]));assert.deepEqual((await getCatalog(child.madinhdanh)).danhsachmuc,current.danhsachmuc);
 current=await getCatalog(root.madinhdanh);await assert.rejects(()=>save([{dataset:'custom_catalogs',before:{madinhdanh:current.madinhdanh,madanhmuccha:current.madanhmuccha},after:{madinhdanh:current.madinhdanh,madanhmuccha:child.madinhdanh}}]),/vòng lặp/);
 await assert.rejects(()=>save([{dataset:'custom_catalogs',before:{madinhdanh:current.madinhdanh},after:{madinhdanh:current.madinhdanh,madanhmuccha:current.madinhdanh}}]),/vòng lặp/);
 await assert.rejects(()=>save([{dataset:'custom_catalogs',before:{madinhdanh:root.madinhdanh},after:null}]));
 current=await getCatalog(child.madinhdanh);const renamed=current.danhsachmuc.map(x=>({...x,name:'Renamed authoritative label'}));await save([{dataset:'custom_catalogs',before:{madinhdanh:current.madinhdanh,danhsachmuc:current.danhsachmuc},after:{madinhdanh:current.madinhdanh,danhsachmuc:renamed}}]);assert.equal((await getCatalog(child.madinhdanh)).danhsachmuc[0].name,'Renamed authoritative label');
 await assert.rejects(()=>db.query('UPDATE vuihoc."MUC_DANH_MUC" SET thutu=0 WHERE madanhmuc=$1',[child.madinhdanh]));

 // Existing class-term FKs still reference the same item IDs after source label editing.
 await db.exec('BEGIN');
 const termGroup=(await business()).custom_catalogs.find(x=>x.madanhmuc==='CLASS_DURATION');
 const term=termGroup.danhsachmuc.find(x=>x.status);assert.ok(term);
 const source=(await db.query('SELECT to_jsonb(l) AS v FROM vuihoc."LOP_HOC" l LIMIT 1')).rows[0].v;
 await db.query('INSERT INTO vuihoc."LOP_HOC" SELECT (jsonb_populate_record(NULL::vuihoc."LOP_HOC",$1::jsonb)).*',[JSON.stringify({...source,madinhdanh:'REVIEW-TERM-CLASS',malophoc:'REVIEW-TERM-CLASS',magiaovien:null,trangthai:'CHO_KHAI_GIANG',ngaybatdau:'2090-01-01',ngayketthuctuychinh:null,madanhmucthoihan:termGroup.madinhdanh,mathoihan:term.id})]);
 const bound=(await db.query('SELECT madinhdanh,madanhmucthoihan,mathoihan FROM vuihoc."LOP_HOC" WHERE madinhdanh=$1',['REVIEW-TERM-CLASS'])).rows[0];assert.ok(bound);
 const duration=await getCatalog(bound.madanhmucthoihan),classFacts=await rows('LOP_HOC'),workFacts=await rows('CONG_DAY_BUOI_HOC');
 const renamedDuration=duration.danhsachmuc.map(x=>x.id===bound.mathoihan?{...x,name:'Updated duration source label'}:x);
 await save([{dataset:'custom_catalogs',before:{madinhdanh:duration.madinhdanh,danhsachmuc:duration.danhsachmuc},after:{madinhdanh:duration.madinhdanh,danhsachmuc:renamedDuration}}]);
 assert.deepEqual(await rows('LOP_HOC'),classFacts);assert.deepEqual(await rows('CONG_DAY_BUOI_HOC'),workFacts);assert.equal((await getCatalog(duration.madinhdanh)).danhsachmuc.find(x=>x.id===bound.mathoihan).name,'Updated duration source label');
 await db.exec('ROLLBACK');
 assert.deepEqual((await db.query(diagnostic)).rows,[]);assert.ok((await db.query(file('supabase/diagnostics/foreign_key_audit.sql'))).rows.every(r=>r.trangthai==='OK'));
 const retiredFindings=(await db.query(file('supabase/diagnostics/relational_storage_audit.sql'))).rows.filter(r=>r.category==='MISSING_TABLE'&&retired.includes(r.table_name));assert.deepEqual(retiredFindings,[]);
 for(const name of retired)assert.equal((await db.query('SELECT to_regclass($1) AS r',['vuihoc."'+name+'"'])).rows[0].r,null);
 console.log('PASS feedback/catalog review: retired criteria remain absent, 6/7/7 columns and all stored facts preserved, no new tables, duplicate/cycle preflight rollback, repeated migration, real teacher feedback/author reads, scoped catalog CRUD/rename, duplicate codes and cyclic parents blocked, class-term FK labels update without class/work copies, diagnostics');
}
