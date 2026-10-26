import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {PGlite}=await import(pathToFileURL(resolve(process.env.PGLITE_MODULE_PATH,'dist/index.js')));
const db=new PGlite();
try {
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE broken_rpc_owner;
 CREATE SCHEMA vuihoc;
 CREATE TABLE vuihoc."NGUOI_DUNG"(madinhdanh text);
 CREATE TABLE vuihoc."LOP_HOC"(madinhdanh text PRIMARY KEY,tenlophoc text,tamdunglich boolean DEFAULT false);
 INSERT INTO vuihoc."LOP_HOC" SELECT 'C'||n,'Class '||n,false FROM generate_series(1,29) n;
 CREATE FUNCTION public.vuihoc_login(text,text) RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;
 CREATE FUNCTION vuihoc.nguoi_dung_phien(token text) RETURNS text LANGUAGE plpgsql AS $$ BEGIN
 IF token<>'admin' THEN RAISE EXCEPTION 'invalid session'; END IF; RETURN token; END $$;
 REVOKE ALL ON FUNCTION vuihoc.nguoi_dung_phien(text) FROM PUBLIC;
 CREATE FUNCTION vuihoc.kiem_tra_thoi_han_lop() RETURNS void LANGUAGE plpgsql AS $$ BEGIN
 IF EXISTS(SELECT 1 FROM vuihoc."LOP_HOC" WHERE tenlophoc='INVALID') THEN RAISE EXCEPTION 'invalid class'; END IF; END $$;
 CREATE FUNCTION public.vuihoc_business_data(token text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$ BEGIN
 PERFORM vuihoc.nguoi_dung_phien(token); RETURN jsonb_build_object('classes',(SELECT jsonb_agg(to_jsonb(l)) FROM vuihoc."LOP_HOC" l)); END $$;
 CREATE FUNCTION public.vuihoc_save_business(token text,changes jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$ DECLARE c jsonb; BEGIN
 PERFORM vuihoc.nguoi_dung_phien(token);
 FOR c IN SELECT value FROM jsonb_array_elements(changes) LOOP
 UPDATE vuihoc."LOP_HOC" SET tamdunglich=coalesce((c->>'paused')::boolean,tamdunglich),tenlophoc=coalesce(c->>'name',tenlophoc) WHERE madinhdanh=c->>'id';
 END LOOP; RETURN jsonb_build_object('saved',true); END $$;
 GRANT USAGE,CREATE ON SCHEMA public TO broken_rpc_owner;`);
 // Execute the exact deferred trigger body installed by the duration migration.
 const source=readFileSync('supabase/migrations/20261124_normalize_class_terms.sql','utf8');
 const start=source.indexOf('CREATE OR REPLACE FUNCTION vuihoc.kiem_tra_thoi_han_trigger()');
 const end=source.indexOf('END $check$;',start)+'END $check$;'.length;
 await db.exec(source.slice(start,end));
 await db.exec(`ALTER FUNCTION vuihoc.kiem_tra_thoi_han_trigger() SECURITY DEFINER; ALTER FUNCTION vuihoc.kiem_tra_thoi_han_trigger() OWNER TO broken_rpc_owner;`);
 await db.exec(`CREATE CONSTRAINT TRIGGER kiem_tra_thoi_han_lop AFTER INSERT OR UPDATE ON vuihoc."LOP_HOC" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION vuihoc.kiem_tra_thoi_han_trigger();`);
 const save=async(changes,token='admin')=>{
  await db.exec('SET ROLE anon');
  try{return await db.query('SELECT public.vuihoc_save_business($1,$2::jsonb)',[token,JSON.stringify(changes)]);}finally{await db.exec('RESET ROLE');}
 };
 await db.exec('SET ROLE anon');
 assert.ok((await db.query(`SELECT public.vuihoc_business_data('admin') AS data`)).rows[0].data.classes.length);
 await db.exec('RESET ROLE');
 await assert.rejects(()=>save([{id:'C1',paused:true}]),/permission denied for schema vuihoc/);
 await assert.rejects(()=>save([{id:'C1',name:'Renamed'}]),/permission denied for schema vuihoc/);
 const repair=readFileSync('supabase/fix_class_save_permissions.sql','utf8');
 await db.exec(repair);await db.exec(repair);
 await save(Array.from({length:29},(_,i)=>({id:'C'+(i+1),paused:true})));
 assert.equal((await db.query(`SELECT count(*)::int n FROM vuihoc."LOP_HOC" WHERE tamdunglich`)).rows[0].n,29);
 await save([{id:'C1',name:'Renamed',paused:false}]);
 assert.deepEqual((await db.query(`SELECT tenlophoc,tamdunglich FROM vuihoc."LOP_HOC" WHERE madinhdanh='C1'`)).rows,[{tenlophoc:'Renamed',tamdunglich:false}]);
 await assert.rejects(()=>save([{id:'C1',name:'INVALID'}]),/invalid class/,'constraint still validates');
 await assert.rejects(()=>save([{id:'C1',paused:true}],'invalid'),/invalid session/);
 await db.exec(`ALTER FUNCTION public.vuihoc_save_business(text,jsonb) SECURITY INVOKER`);
 await assert.rejects(()=>save([{id:'C1',paused:true}]),/permission denied for schema vuihoc/);
 await db.exec(repair);await save([{id:'C1',paused:true}]);
 await db.exec(`ALTER FUNCTION vuihoc.kiem_tra_thoi_han_trigger() OWNER TO broken_rpc_owner`);
 await assert.rejects(()=>save([{id:'C1',paused:false}]),/permission denied for schema vuihoc/);
 await db.exec(repair);await save([{id:'C1',paused:false}]);
 assert.equal((await db.query(`SELECT has_schema_privilege('anon','vuihoc','USAGE') AS allowed`)).rows[0].allowed,false);
 assert.equal((await db.query(`SELECT has_function_privilege('anon','vuihoc.kiem_tra_thoi_han_trigger()','EXECUTE') AS allowed`)).rows[0].allowed,false);
 console.log('PASS exact deferred class trigger failure reproduced as anon; 29-class pause, rename, resume, RPC/trigger owner repair, validation and private schema preserved');
}finally{await db.close();}
