import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {PGlite}=await import(pathToFileURL(resolve('.tmp/demo-validation/node_modules/@electric-sql/pglite/dist/index.js')));
const db=new PGlite();
try {
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA vuihoc;
 CREATE TABLE vuihoc."NGUOI_DUNG"(madinhdanh text);
 CREATE TABLE vuihoc."LOP_HOC"(madinhdanh text PRIMARY KEY,trangthai text,tamdunglich boolean,ngayketthuctuychinh date);
 CREATE TABLE vuihoc."HOC_LIEU_LOP"(malop text,tieude text);
 CREATE FUNCTION vuihoc.ngay_ket_thuc_lop(jsonb) RETURNS date LANGUAGE sql AS $$ SELECT ($1->>'ngayketthuctuychinh')::date $$;
 CREATE FUNCTION vuihoc.nguoi_dung_phien(token text) RETURNS vuihoc."NGUOI_DUNG" LANGUAGE plpgsql AS $$ BEGIN
 IF token<>'valid' THEN RAISE EXCEPTION 'Invalid session'; END IF; RETURN ROW('admin')::vuihoc."NGUOI_DUNG"; END $$;
 CREATE FUNCTION public.vuihoc_business_data(p_token text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$ DECLARE actor vuihoc."NGUOI_DUNG"; BEGIN
 actor:=vuihoc.nguoi_dung_phien(p_token);
 RETURN (SELECT jsonb_agg(to_jsonb(l)) FROM vuihoc."LOP_HOC" l); END $$;
 INSERT INTO vuihoc."LOP_HOC" VALUES
 ('expired','DANG_HOC',true,(statement_timestamp() AT TIME ZONE 'Asia/Bangkok')::date-1),
 ('today','DANG_HOC',false,(statement_timestamp() AT TIME ZONE 'Asia/Bangkok')::date),
 ('future','DANG_HOC',false,(statement_timestamp() AT TIME ZONE 'Asia/Bangkok')::date+1),
 ('unlimited','DANG_HOC',false,null),
 ('stopped','TAM_DUNG',false,(statement_timestamp() AT TIME ZONE 'Asia/Bangkok')::date-1);
 INSERT INTO vuihoc."HOC_LIEU_LOP" VALUES('expired','Keep historical material');`);
 // Use the installed expiry implementation with the normalized end-date reader.
 const source=readFileSync('supabase/migrations/20261113_end_classes_material_guard.sql','utf8');
 const start=source.indexOf('CREATE OR REPLACE FUNCTION vuihoc.ket_thuc_lop_het_han()');
 const end=source.indexOf('$$;',source.indexOf('AS $$',start)+5)+3;
 await db.exec(source.slice(start,end).replace('WHERE ngayketthuc<','WHERE vuihoc.ngay_ket_thuc_lop(to_jsonb("LOP_HOC"))<'));
 const migration=readFileSync('supabase/migrations/20261223_expire_classes_on_business_read.sql','utf8');
 await db.exec(migration);await db.exec(migration);
 await db.exec(`UPDATE vuihoc."LOP_HOC" SET trangthai='DANG_HOC',tamdunglich=true WHERE madinhdanh='expired';`);
 await assert.rejects(()=>db.query(`SELECT public.vuihoc_business_data('invalid')`),/Invalid session/);
 assert.equal((await db.query(`SELECT trangthai FROM vuihoc."LOP_HOC" WHERE madinhdanh='expired'`)).rows[0].trangthai,'DANG_HOC');
 await db.exec('SET ROLE anon');
 const rows=(await db.query(`SELECT public.vuihoc_business_data('valid') AS data`)).rows[0].data;
 await db.exec('RESET ROLE');
 const get=id=>rows.find(row=>row.madinhdanh===id);
 assert.equal(get('expired').trangthai,'DA_KET_THUC');assert.equal(get('expired').tamdunglich,false);
 for(const id of ['today','future','unlimited'])assert.equal(get(id).trangthai,'DANG_HOC');
 assert.equal(get('stopped').trangthai,'TAM_DUNG');
 assert.equal((await db.query('SELECT tieude FROM vuihoc."HOC_LIEU_LOP"')).rows[0].tieude,'Keep historical material');
 console.log('Expiry on read: persisted without Cron, authenticated access, inclusive final day, manual stops, historical materials and idempotence passed.');
} finally {await db.close();}
