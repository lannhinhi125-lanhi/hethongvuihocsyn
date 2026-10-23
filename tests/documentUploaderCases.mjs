import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
export async function verifyDocumentUploaders(db,token){
 const sql=readFileSync('supabase/migrations/20261203_document_uploaders.sql','utf8');
 const save=changes=>db.query('SELECT public.vuihoc_save_business($1,$2::jsonb)',[token,JSON.stringify(changes)]);
 const data=async()=>(await db.query('SELECT public.vuihoc_business_data($1) v',[token])).rows[0].v;
 const actor=(await db.query('SELECT (vuihoc.nguoi_dung_phien($1)).madinhdanh id',[token])).rows[0].id;
 const before=(await data()).sop_documents;
 await db.exec(sql);await db.exec(sql);
 const columns=(await db.query("SELECT column_name FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='TAI_LIEU_QUY_TRINH' ORDER BY ordinal_position")).rows.map(x=>x.column_name);
 assert.deepEqual([...columns].sort(),['madinhdanh','tieude','maloaitailieu','tomtat','ngaycapnhat','noidung','tentepgoc','loaitepgoc','dangsudung','ngaytao','linkdrive','manguoitailen'].sort());
 for(const row of (await data()).sop_documents){
  assert.equal(row.manguoitailen??null,null);assert.equal(row.tennguoitailen??null,null);
  assert.equal(row.noidung,before.find(x=>x.madinhdanh===row.madinhdanh).noidung);
 }
 if(before.length){
  const old=before[0];
  await save([{dataset:'sop_documents',before:{madinhdanh:old.madinhdanh,tieude:old.tieude},after:{madinhdanh:old.madinhdanh,tieude:old.tieude+' (reviewed)'}}]);
  assert.equal((await data()).sop_documents.find(x=>x.madinhdanh===old.madinhdanh).manguoitailen??null,null);
 }
 const category=(await data()).document_categories.find(x=>x.danghoatdong);
 assert.ok(category);
 const doc={madinhdanh:'UPLOADER-TEST',tieude:'Upload attribution',maloaitailieu:category.madinhdanh,tomtat:'Test',noidung:'Content',dangsudung:true,linkdrive:''};
 await assert.rejects(()=>save([{dataset:'sop_documents',before:null,after:{...doc,manguoitailen:actor}}]),/máy chủ xác định/);
 await assert.rejects(()=>save([{dataset:'sop_documents',before:null,after:doc}].map(c=>({...c,after:{...c.after,tennguoitailen:'Forged'}}))),/máy chủ xác định/);
 await save([{dataset:'sop_documents',before:null,after:doc}]);
 let stored=(await data()).sop_documents.find(x=>x.madinhdanh===doc.madinhdanh);
 assert.equal(stored.manguoitailen,actor);assert.ok(stored.tennguoitailen);
 await db.exec('BEGIN');
 try{
  await db.query('UPDATE vuihoc."NGUOI_DUNG" SET hoten=$1 WHERE madinhdanh=$2',['Renamed uploader',actor]);
  assert.equal((await data()).sop_documents.find(x=>x.madinhdanh===doc.madinhdanh).tennguoitailen,'Renamed uploader');
 }finally{await db.exec('ROLLBACK');}
 await save([{dataset:'sop_documents',before:{madinhdanh:doc.madinhdanh,tieude:stored.tieude},after:{madinhdanh:doc.madinhdanh,tieude:'Edited'}}]);
 stored=(await data()).sop_documents.find(x=>x.madinhdanh===doc.madinhdanh);
 assert.equal(stored.manguoitailen,actor);
 await assert.rejects(()=>save([{dataset:'sop_documents',before:{madinhdanh:doc.madinhdanh},after:{madinhdanh:doc.madinhdanh,manguoitailen:null}}]),/máy chủ xác định/);
 const audit=(await db.query(readFileSync('supabase/diagnostics/document_uploaders.sql','utf8'))).rows[0];
 assert.equal(Number(audit.lien_ket_loi),0);
 await assert.rejects(()=>db.query('UPDATE vuihoc."TAI_LIEU_QUY_TRINH" SET manguoitailen=$1 WHERE madinhdanh=$2',['MISSING-UPLOADER',doc.madinhdanh]),/foreign key/);
 await save([{dataset:'sop_documents',before:{madinhdanh:doc.madinhdanh,tieude:stored.tieude},after:null}]);
 assert.ok(!(await data()).sop_documents.some(x=>x.madinhdanh===doc.madinhdanh));
 console.log('Document uploader attribution: passed');
}
