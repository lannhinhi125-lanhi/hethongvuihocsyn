import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
export async function verifyStableGradeCatalog(db,token){
 const file=p=>readFileSync(p,'utf8'),sql=file('supabase/migrations/20261207_stable_grade_catalog_writes.sql');
 const data=async()=>(await db.query('SELECT public.vuihoc_business_data($1) v',[token])).rows[0].v;
 const write=changes=>db.query('SELECT public.vuihoc_save_business($1,$2::jsonb)',[token,JSON.stringify(changes)]);
 const rows=async t=>(await db.query(`SELECT to_jsonb(t) v FROM vuihoc."${t}" t ORDER BY to_jsonb(t)::text`)).rows.map(x=>x.v);
 const schema=async()=>(await db.query("SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_schema='vuihoc' ORDER BY table_name,ordinal_position")).rows;
 const oldSchema=await schema(),oldChoices=await rows('LUA_CHON_CAP_HOC');
 const oldConstraints=(await db.query("SELECT c.conrelid::regclass::text AS t,c.conname,pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='vuihoc' ORDER BY 1,2")).rows;
 await db.exec(sql);await db.exec(sql);assert.deepEqual(await schema(),oldSchema);assert.deepEqual(await rows('LUA_CHON_CAP_HOC'),oldChoices);
 assert.deepEqual((await db.query("SELECT c.conrelid::regclass::text AS t,c.conname,pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='vuihoc' ORDER BY 1,2")).rows,oldConstraints);
 let reference;
 if((await db.query("SELECT count(*)::int n FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='DANG_KY_MON_HOC' AND column_name='macaphocdangky'")).rows[0].n){
  reference=(await db.query('SELECT c.macaphoc,c.madinhdanh FROM vuihoc."LUA_CHON_CAP_HOC" c JOIN vuihoc."DANG_KY_MON_HOC" d ON (d.macaphocdangky,d.khoidangky)=(c.macaphoc,c.madinhdanh) LIMIT 1')).rows[0];assert.ok(reference,'latest-schema test must use a real student registration FK');
 }else{
  reference=(await db.query('SELECT macaphoc,madinhdanh FROM vuihoc."LUA_CHON_CAP_HOC" ORDER BY macaphoc,thutu LIMIT 1')).rows[0];
  // The older focused fixture predates student registrations. Reproduce the same immediate composite FK.
  await db.exec('CREATE TABLE public.grade_immediate_reference(macaphoc text,makhoi text,FOREIGN KEY(macaphoc,makhoi) REFERENCES vuihoc."LUA_CHON_CAP_HOC"(macaphoc,madinhdanh))');
  await db.query('INSERT INTO grade_immediate_reference VALUES($1,$2)',[reference.macaphoc,reference.madinhdanh]);
 }
 const protectedFacts={};for(const t of ['GIAO_VIEN_KHOI','GIAO_VIEN','HOC_SINH','LOP_HOC','DANG_KY_MON_HOC','LICH_SU_DANG_KY_HOC'])if((await db.query('SELECT to_regclass($1) r',['vuihoc."'+t+'"'])).rows[0].r)protectedFacts[t]=await rows(t);
 const read=async id=>(await data()).teaching_categories.find(x=>x.madinhdanh===id);
 let category=await read(reference.macaphoc);assert.ok(category);
 const original=structuredClone(category);
 const update=async items=>{const current=await read(reference.macaphoc);return write([{dataset:'teaching_categories',before:{madinhdanh:current.madinhdanh,danhsachluachon:current.danhsachluachon},after:{madinhdanh:current.madinhdanh,danhsachluachon:items}}]);};
 const renamed=category.danhsachluachon.map(x=>x.id===reference.madinhdanh?{...x,label:x.label+' current source label'}:x).reverse();
 const untouched=category.danhsachluachon.find(x=>x.id!==reference.madinhdanh);
 const xmin=async id=>(await db.query('SELECT xmin::text AS v FROM vuihoc."LUA_CHON_CAP_HOC" WHERE macaphoc=$1 AND madinhdanh=$2',[reference.macaphoc,id])).rows[0].v;
 await update(renamed);assert.deepEqual((await read(reference.macaphoc)).danhsachluachon,renamed);
 const stableXmin=await xmin(reference.madinhdanh);await update(renamed);assert.equal(await xmin(reference.madinhdanh),stableXmin,'unchanged choices must not be rewritten');
 if(untouched)assert.ok((await rows('LUA_CHON_CAP_HOC')).some(x=>x.macaphoc===reference.macaphoc&&x.madinhdanh===untouched.id));
 const root={id:'GRADE-TEMP-ROOT',label:'Temporary parent'},child={id:'GRADE-TEMP-CHILD',label:'Temporary child',parentId:root.id};
 const tree=[child,...renamed,root];await update(tree);assert.deepEqual((await read(reference.macaphoc)).danhsachluachon,tree,'child-first display order is preserved while inserts are parent-first');
 const reparented=tree.filter(x=>x.id!==root.id).map(x=>x.id===child.id?{...x,parentId:reference.madinhdanh}:x);await update(reparented);assert.deepEqual((await read(reference.macaphoc)).danhsachluachon,reparented);
 await update(renamed);assert.ok(!(await rows('LUA_CHON_CAP_HOC')).some(x=>x.macaphoc===reference.macaphoc&&[root.id,child.id].includes(x.madinhdanh)));
 for(const bad of [null,{},[...renamed,renamed[0]],[...renamed,{id:'',label:'Blank ID'}],[...renamed,{id:'BAD',label:''}],[...renamed,{id:'BAD',label:'Unsupported field',extra:'must not disappear'}],
  [...renamed,{id:'BAD',label:'Missing parent',parentId:'MISSING'}],[...renamed,{id:'SELF',label:'Self cycle',parentId:'SELF'}],
  [...renamed,{id:'A',label:'A',parentId:'B'},{id:'B',label:'B',parentId:'A'}]]){
  const old=await read(reference.macaphoc);await assert.rejects(()=>update(bad));assert.deepEqual(await read(reference.macaphoc),old);
 }
 const beforeDelete=await read(reference.macaphoc),beforeRows=await rows('LUA_CHON_CAP_HOC');
 await assert.rejects(()=>write([{dataset:'teaching_categories',before:{madinhdanh:reference.macaphoc,danhsachluachon:beforeDelete.danhsachluachon},after:{madinhdanh:reference.macaphoc,tencaphoc:'Must roll back parent too',danhsachluachon:renamed.filter(x=>x.id!==reference.madinhdanh)}}]),/foreign key/);
 assert.deepEqual(await read(reference.macaphoc),beforeDelete);assert.deepEqual(await rows('LUA_CHON_CAP_HOC'),beforeRows);
 // The same scoped item ID in another category is valid and gets a different global link key.
 const columns=(await db.query('SELECT vuihoc.business_config() v')).rows[0].v.teaching_categories.columns;
 const fresh=Object.fromEntries(Object.entries({...original,madinhdanh:'GRADE-CATALOG-UNUSED',tencaphoc:'Unused test category',danhsachluachon:[{id:reference.madinhdanh,label:'Other scoped label'}]}).filter(([k])=>columns.includes(k)));
 await write([{dataset:'teaching_categories',before:null,after:fresh}]);
 assert.equal((await read(fresh.madinhdanh)).danhsachluachon[0].label,'Other scoped label');
 await write([{dataset:'teaching_categories',before:{madinhdanh:fresh.madinhdanh},after:{madinhdanh:fresh.madinhdanh,danhsachluachon:[]}}]);assert.deepEqual((await read(fresh.madinhdanh)).danhsachluachon,[]);
 await write([{dataset:'teaching_categories',before:{madinhdanh:fresh.madinhdanh},after:null}]);
 await update(original.danhsachluachon);
 for(const [t,old] of Object.entries(protectedFacts))assert.deepEqual(await rows(t),old,t+' source links/facts must remain unchanged');
 for(const role of ['anon','authenticated'])assert.equal((await db.query("SELECT has_function_privilege($1,'vuihoc.luu_lua_chon_cap_hoc(text,jsonb)','EXECUTE') v",[role])).rows[0].v,false);
 assert.deepEqual(await schema(),oldSchema);
 const review=(await db.query(file('supabase/diagnostics/grade_catalog_write_review.sql'))).rows;
 assert.ok(review.some(x=>x.loai==='WRITER_READY'));assert.ok(!review.some(x=>['INVALID_CHOICE','PARENT_CYCLE'].includes(x.loai)));
 if((await db.query("SELECT to_regclass('public.grade_immediate_reference') r")).rows[0].r)await db.exec('DROP TABLE public.grade_immediate_reference');
 console.log('PASS stable grade catalogs: same schema/FKs and source facts, repeated migration, real RPC rename/reorder with immediate FK, stable/no-op rows, parent/child CRUD, scoped IDs, invalid/duplicate/cyclic rollback, referenced deletion and full parent rollback, empty unused catalogs');
}
