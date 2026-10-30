import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {PGlite}=await import(pathToFileURL(resolve('.tmp/demo-validation/node_modules/@electric-sql/pglite/dist/index.js')));
const db=new PGlite();
try {
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA vuihoc;
 CREATE TABLE vuihoc."HOC_LIEU_LOP"(malop text,mahoclieu integer,tungay date,denngay date,sobuoi integer,tieude text,lienketslide text,lienketlms text);
 INSERT INTO vuihoc."HOC_LIEU_LOP" VALUES('A',1,'2026-11-02','2026-11-08',1,'Old','','');
 CREATE VIEW vuihoc."V_HOC_LIEU_LOP" WITH(security_invoker=true) AS SELECT h.malop,h.mahoclieu,h.tungay,h.denngay,h.sobuoi,h.tieude,h.lienketslide,h.lienketlms FROM vuihoc."HOC_LIEU_LOP" h;
 CREATE FUNCTION vuihoc.lop_truong_truy_van(jsonb) RETURNS jsonb LANGUAGE sql AS $$ SELECT jsonb_agg(jsonb_build_object('id',h.mahoclieu,'title',h.tieude)) FROM vuihoc."V_HOC_LIEU_LOP" h $$;
 CREATE FUNCTION vuihoc.kiem_tra_truong_json(x jsonb,fields text[]) RETURNS void LANGUAGE plpgsql AS $$ BEGIN
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(x) k WHERE NOT(k=ANY(fields))) THEN RAISE EXCEPTION 'Invalid field'; END IF; END $$;
 CREATE FUNCTION vuihoc.luu_hoc_lieu_lop(p_lop text,p_data jsonb) RETURNS void LANGUAGE plpgsql AS $$ DECLARE x jsonb; BEGIN
 FOR x IN SELECT value FROM jsonb_array_elements(p_data) LOOP PERFORM vuihoc.kiem_tra_truong_json(x,ARRAY['id','title']); END LOOP; END $$;`);
 const patch=readFileSync('supabase/migrations/20261222_material_updated_at.sql','utf8');
 await db.exec(patch);await db.exec(patch);
 const get=async()=> (await db.query('SELECT vuihoc.lop_truong_truy_van(null) AS data')).rows[0].data;
 assert.equal((await get())[0].updatedAt,null,'do not fabricate historical update dates');
 await db.exec(`UPDATE vuihoc."HOC_LIEU_LOP" SET tieude='Updated' WHERE mahoclieu=1;`);
 const updated=(await get())[0].updatedAt;assert.ok(updated);
 await db.exec(`UPDATE vuihoc."HOC_LIEU_LOP" SET tieude=tieude;`);
 assert.equal((await get())[0].updatedAt,updated,'no-op saves must not move rows');
 await db.exec(`INSERT INTO vuihoc."HOC_LIEU_LOP" VALUES('B',2,'2026-11-02','2026-11-08',1,'New','','',null);`);
 const rows=await get();assert.ok(rows[1].updatedAt);assert.ok(Date.parse(rows[1].updatedAt)>=Date.parse(updated));
 await db.query('SELECT vuihoc.luu_hoc_lieu_lop($1,$2::jsonb)',['A',JSON.stringify(rows)]);
 console.log('Material update timestamps: old data unknown, content edits, no-op saves, inserts and idempotent migration passed.');
} finally {await db.close();}
