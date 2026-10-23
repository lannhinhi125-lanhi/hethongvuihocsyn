import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
export async function verifyAIConfigurationChat(db,token){
 const file=p=>readFileSync(p,'utf8');
 const migration=file('supabase/migrations/20261204_normalize_ai_configuration_chat.sql');
 const bundle=file('supabase/apply_documents_ai_update.sql');
 const normalized=text=>text.replace(/\r\n/g,'\n').trim();
 assert.ok(normalized(bundle).includes(normalized(migration)),'The combined SQL must contain the current migration, not a stale RPC patch');
 assert.ok(!bundle.includes('Không nhận diện được RPC mở phiên chat theo tài khoản'),'The obsolete RPC matcher must not remain in the combined SQL');
 assert.ok(normalized(file('supabase/fix_documents_ai_rpc_v2.sql')).includes(normalized(bundle)),'The named recovery file must contain the corrected bundle');
 const rpc=async(name,args)=>{
  const call='public.'+name+'('+args.map((_,i)=>'$'+(i+1)).join(',')+')';
  if(['vuihoc_ai_chat_list','vuihoc_ai_chat_questions'].includes(name))return(await db.query('SELECT * FROM '+call,args)).rows;
  return(await db.query('SELECT '+call+' v',args)).rows[0].v;
 };
 const rows=async name=>(await db.query(`SELECT to_jsonb(t) v FROM vuihoc."${name}" t ORDER BY to_jsonb(t)::text`)).rows.map(x=>x.v);
 const owner=(await db.query('SELECT (vuihoc.nguoi_dung_phien($1)).madinhdanh id',[token])).rows[0].id;
 const legacyTeacher=(await db.query('SELECT madinhdanh,manguoidung FROM vuihoc."GIAO_VIEN" WHERE manguoidung IS NOT NULL LIMIT 1')).rows[0];
 assert.ok(legacyTeacher);
 const legacyChat=randomUUID(),legacyQuestion=randomUUID();
 await db.query('INSERT INTO vuihoc."PHIEN_CHAT_AI"(maphien,manguoidung,magiaovien) VALUES($1,$2,$3)',[legacyChat,legacyTeacher.manguoidung,legacyTeacher.madinhdanh]);
 await db.query('INSERT INTO vuihoc."CAU_HOI_CHAT_AI"(macauhoi,maphien,noidung) VALUES($1,$2,$3)',[legacyQuestion,legacyChat,'Legacy question']);
 // A conflicting mirror must stop atomically, preserving the old column/RPC.
 const mismatch=randomUUID();
 await db.query('INSERT INTO vuihoc."PHIEN_CHAT_AI"(maphien,manguoidung,magiaovien) VALUES($1,$2,$3)',[mismatch,owner,legacyTeacher.madinhdanh]);
 if(owner!==legacyTeacher.manguoidung)await assert.rejects(()=>db.exec(migration),/lệch liên kết/);
 await db.query('DELETE FROM vuihoc."PHIEN_CHAT_AI" WHERE maphien=$1',[mismatch]);
 for(const table of ['CAU_HINH_TRO_LY','CAU_HINH_HE_THONG']){
  await db.exec('BEGIN');
  try{
   await db.query(`INSERT INTO vuihoc."${table}" SELECT (jsonb_populate_record(NULL::vuihoc."${table}",to_jsonb(t)||jsonb_build_object('madinhdanh','EXTRA-CONFIG'))).* FROM vuihoc."${table}" t LIMIT 1`);
   await assert.rejects(()=>db.exec(migration),/nhiều cấu hình/);
  }finally{await db.exec('ROLLBACK');}
 }
 const preserve={};for(const table of ['CAU_HOI_CHAT_AI','CAU_HINH_TRO_LY','CAU_HINH_HE_THONG','VAN_PHONG_NHAN_XET'])preserve[table]=await rows(table);
 const originalOpen=(await db.query("SELECT pg_get_functiondef('public.vuihoc_ai_chat_open(text,uuid)'::regprocedure) f")).rows[0].f;
 for(const variant of ['formatted','teacher-only','already-normalized-open']){
  await db.exec('BEGIN');
  try{
   if(variant==='formatted')await db.exec(originalOpen.replace('(maphien,manguoidung,magiaovien)','(maphien, manguoidung, magiaovien)').replace('VALUES(p_chat,owner_id,','VALUES (p_chat, owner_id,'));
   if(variant==='already-normalized-open')await db.exec(originalOpen.replace('INSERT INTO vuihoc."PHIEN_CHAT_AI"(maphien,manguoidung,magiaovien) VALUES(p_chat,owner_id,(SELECT madinhdanh FROM vuihoc."GIAO_VIEN" WHERE manguoidung=owner_id LIMIT 1))','INSERT INTO vuihoc."PHIEN_CHAT_AI"(maphien,manguoidung) VALUES(p_chat,owner_id)'));
   if(variant==='teacher-only'){
    for(const name of ['20261106_teacher_chat_questions','20261107_teacher_question_history']){
     const old=file('supabase/migrations/'+name+'.sql');
     await db.exec(old.slice(old.indexOf('CREATE OR REPLACE FUNCTION'),old.indexOf('DO $owner$')));
    }
   }
   await db.exec(migration);await db.exec(migration);
   const probe=randomUUID(),question=randomUUID();
   await rpc('vuihoc_ai_chat_open',[token,probe]);
   await rpc('vuihoc_ai_question_save',[token,probe,question,'Restored '+variant]);
   assert.ok((await rpc('vuihoc_ai_chat_list',[token,0])).some(x=>x.maphien===probe));
   assert.equal((await rpc('vuihoc_ai_chat_questions',[token,probe,0]))[0].noidung,'Restored '+variant);
   await rpc('vuihoc_ai_chat_delete',[token,probe]);
  }finally{await db.exec('ROLLBACK');}
 }
 console.log('PASS migration recovery: formatted RPC, teacher-only API and already-normalized open function');
 const sessions=(await rows('PHIEN_CHAT_AI')).map(({magiaovien,...v})=>v);
 await db.exec(migration);await db.exec(migration);
 assert.deepEqual(await rows('PHIEN_CHAT_AI'),sessions);
 for(const [table,before]of Object.entries(preserve))assert.deepEqual(await rows(table),before);
 assert.equal((await db.query("SELECT count(*)::int n FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='PHIEN_CHAT_AI' AND column_name='magiaovien'")).rows[0].n,0);
 for(const table of ['CAU_HINH_TRO_LY','CAU_HINH_HE_THONG'])await assert.rejects(()=>db.query(`INSERT INTO vuihoc."${table}" SELECT (jsonb_populate_record(NULL::vuihoc."${table}",to_jsonb(t)||jsonb_build_object('madinhdanh','EXTRA-CONFIG'))).* FROM vuihoc."${table}" t LIMIT 1`),/unique/);
 const config=(await rows('CAU_HINH_TRO_LY'))[0];
 const updatedConfig={madinhdanh:config.madinhdanh,loichaomung:'Updated shared greeting',vanphong:'Trang trọng, xưng hô thầy/cô',chiduatrentailieu:false,cautraloiduphong:'Liên hệ điều phối để được hỗ trợ.',chidanhethong:'Trả lời tối đa 2 câu.'};
 await rpc('vuihoc_save_business',[token,[{dataset:'rag_bot_config',before:{madinhdanh:config.madinhdanh,loichaomung:config.loichaomung},after:updatedConfig}]]);
 const reloaded=(await rpc('vuihoc_business_data',[token])).rag_bot_config[0];
 for(const [key,value] of Object.entries(updatedConfig))assert.equal(reloaded[key],value);
 const {knowledgeAnswerPrompt}=await import('../src/lib/knowledgeAnswer.ts');
 const applied=knowledgeAnswerPrompt('Cách chuẩn bị bài?',[],reloaded.vanphong,reloaded.cautraloiduphong,reloaded.chidanhethong,reloaded.chiduatrentailieu);
 assert.ok(applied.includes(JSON.stringify(updatedConfig.vanphong)));assert.ok(applied.includes(JSON.stringify(updatedConfig.chidanhethong)));
 assert.match(applied,/Chế độ cho phép kiến thức chung/);
 const tone={madinhdanh:'AI-TONE-REVIEW',tenvanphong:'Review tone',chidan:'Independent feedback instructions'};
 await rpc('vuihoc_save_business',[token,[{dataset:'tone_directives',before:null,after:tone}]]);
 const settings=(await rows('CAU_HINH_HE_THONG'))[0];
 await rpc('vuihoc_save_business',[token,[{dataset:'app_settings',before:{madinhdanh:settings.madinhdanh,mavanphongdangchon:settings.mavanphongdangchon},after:{madinhdanh:settings.madinhdanh,mavanphongdangchon:tone.madinhdanh}}]]);
 assert.equal((await rpc('vuihoc_business_data',[token])).app_settings[0].mavanphongdangchon,tone.madinhdanh);
 const chat=randomUUID(),question=randomUUID();
 await rpc('vuihoc_ai_chat_open',[token,chat]);await rpc('vuihoc_ai_chat_open',[token,chat]);
 await rpc('vuihoc_ai_question_save',[token,chat,question,'New account question']);
 assert.ok((await rpc('vuihoc_ai_chat_list',[token,0])).some(x=>x.maphien===chat));
 assert.equal((await rpc('vuihoc_ai_chat_questions',[token,chat,0]))[0].noidung,'New account question');
 // Another real authenticated account cannot access this session.
 await db.query(`INSERT INTO vuihoc."NGUOI_DUNG" SELECT (jsonb_populate_record(NULL::vuihoc."NGUOI_DUNG",to_jsonb(u)||jsonb_build_object('madinhdanh','CHAT-OTHER','tendangnhap','chat.other','maxacthuc',null,'maphien_bam',null))).* FROM vuihoc."NGUOI_DUNG" u WHERE madinhdanh=$1`,[owner]);
 const other=(await rpc('vuihoc_login',['chat.other','234567'])).token;
 assert.ok(other);
 await assert.rejects(()=>rpc('vuihoc_ai_chat_open',[other,chat]),/không thuộc/);
 await assert.rejects(()=>rpc('vuihoc_ai_chat_questions',[other,chat,0]),/không thuộc/);
 await assert.rejects(()=>rpc('vuihoc_ai_question_save',[other,chat,randomUUID(),'Forbidden']),/không thuộc/);
 await rpc('vuihoc_ai_chat_delete',[other,chat]);
 assert.equal((await rpc('vuihoc_ai_chat_questions',[token,chat,0])).length,1);
 await rpc('vuihoc_ai_chat_delete',[token,chat]);
 assert.equal((await db.query('SELECT count(*)::int n FROM vuihoc."CAU_HOI_CHAT_AI" WHERE maphien=$1',[chat])).rows[0].n,0);
 await assert.rejects(()=>rpc('vuihoc_ai_question_save',[token,chat,randomUUID(),'Late write']),/đã xóa/);
 const otherChat=randomUUID();await rpc('vuihoc_ai_chat_open',[other,otherChat]);
 await rpc('vuihoc_ai_question_save',[other,otherChat,randomUUID(),'Account deletion cascade']);
 await db.query('DELETE FROM vuihoc."NGUOI_DUNG" WHERE madinhdanh=$1',['CHAT-OTHER']);
 assert.equal((await db.query('SELECT count(*)::int n FROM vuihoc."CAU_HOI_CHAT_AI" WHERE maphien=$1',[otherChat])).rows[0].n,0);
 assert.equal((await db.query('SELECT count(*)::int n FROM vuihoc."PHIEN_CHAT_AI" WHERE maphien=$1',[otherChat])).rows[0].n,0);
 assert.deepEqual((await db.query(file('supabase/diagnostics/ai_configuration_chat.sql'))).rows,[]);
 console.log('PASS AI/chat: atomic preflight, mirror removed, source facts retained, repeat migration, singleton configs, real RPC ownership isolation and cascade');
}
