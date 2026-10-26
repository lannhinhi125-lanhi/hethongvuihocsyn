import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {PGlite}=await import(pathToFileURL(resolve(process.env.PGLITE_MODULE_PATH,'dist/index.js')));
const db=new PGlite();
try {
 await db.exec(`CREATE SCHEMA vuihoc;
 CREATE TABLE vuihoc."LOP_HOC"(madinhdanh text PRIMARY KEY,tamdunglich boolean DEFAULT false,lydotamdung text,manhomtamdung text,ghichutamdung text,tenlophoc text);
 CREATE TABLE vuihoc.calls(kind text);
 CREATE FUNCTION vuihoc.track() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN INSERT INTO vuihoc.calls VALUES(TG_ARGV[0]); RETURN NEW; END $$;
 CREATE TRIGGER unrelated AFTER UPDATE OF tenlophoc ON vuihoc."LOP_HOC" FOR EACH ROW EXECUTE FUNCTION vuihoc.track('unrelated');
 CREATE TRIGGER pause AFTER UPDATE OF tamdunglich ON vuihoc."LOP_HOC" FOR EACH ROW EXECUTE FUNCTION vuihoc.track('pause');
 CREATE FUNCTION public.vuihoc_save_business(p_token text,p_changes jsonb) RETURNS jsonb LANGUAGE plpgsql AS $fn$
 DECLARE c jsonb; ds text; oldrow jsonb; v jsonb; id text; conf jsonb; cols text; exprs text; assigns text;
 BEGIN
 FOR c IN SELECT value FROM jsonb_array_elements(p_changes) LOOP
 ds:=c->>'dataset'; id:=c->'after'->>'madinhdanh'; conf:='{"table":"LOP_HOC"}';
 SELECT to_jsonb(l) INTO oldrow FROM vuihoc."LOP_HOC" l WHERE madinhdanh=id;
 v:=coalesce(oldrow,'{}')||c->'after';
 SELECT string_agg(format('%I',k),','),string_agg(format('(jsonb_populate_record(NULL::vuihoc.%I,$1)).%I',conf->>'table',k),','),string_agg(format('%I=excluded.%I',k,k),',') INTO cols,exprs,assigns FROM jsonb_object_keys(v) k;
 EXECUTE format('INSERT INTO vuihoc.%I(%s) SELECT %s ON CONFLICT(madinhdanh) DO UPDATE SET %s',conf->>'table',cols,exprs,assigns) USING v;
 END LOOP; RETURN '{"saved":true}'; END $fn$;
 INSERT INTO vuihoc."LOP_HOC"(madinhdanh,tenlophoc) SELECT 'C'||n,'Class '||n FROM generate_series(1,29) n;`);
 const migration=readFileSync('supabase/migrations/20261215_class_pause_save.sql','utf8');
 await db.exec(migration); await db.exec(migration);
 const general=readFileSync('supabase/migrations/20261216_class_student_updates.sql','utf8');
 await db.exec(general); await db.exec(general);
 const save=rows=>db.query('SELECT public.vuihoc_save_business($1,$2::jsonb)',['test',JSON.stringify(rows.map(after=>({dataset:'classes',after})))]);
 await save(Array.from({length:29},(_,i)=>({madinhdanh:'C'+(i+1),tamdunglich:true,lydotamdung:'holiday'})));
 assert.equal((await db.query(`SELECT count(*)::int n FROM vuihoc.calls WHERE kind='unrelated'`)).rows[0].n,0);
 assert.equal((await db.query(`SELECT count(*)::int n FROM vuihoc.calls WHERE kind='pause'`)).rows[0].n,29);
 await save([{madinhdanh:'C1',tamdunglich:false}]);
 await save([{madinhdanh:'C1',tenlophoc:'Renamed'}]);
 assert.equal((await db.query(`SELECT count(*)::int n FROM vuihoc.calls WHERE kind='pause'`)).rows[0].n,30,'name edit must not invoke pause trigger');
 await save([{madinhdanh:'NEW',tenlophoc:'New class',tamdunglich:false}]);
 assert.equal((await db.query(`SELECT tenlophoc FROM vuihoc."LOP_HOC" WHERE madinhdanh='C1'`)).rows[0].tenlophoc,'Renamed');
 assert.equal((await db.query(`SELECT count(*)::int n FROM vuihoc."LOP_HOC"`)).rows[0].n,30);
 console.log('PASS repeat migration, 29 class pause, resume, unrelated triggers skipped, normal edit and insert');
} finally {await db.close();}
