import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

const root = process.env.PGLITE_MODULE_PATH;
if (!root) throw new Error('Set PGLITE_MODULE_PATH to the installed @electric-sql/pglite directory.');
const {PGlite} = await import(pathToFileURL(root + '/dist/index.js').href);
const db = new PGlite();
try {
 await db.exec(`CREATE SCHEMA vuihoc;
 CREATE TABLE vuihoc."GIAO_VIEN" (madinhdanh text PRIMARY KEY, trangthai text, ngaybatdau text, ngaytao timestamptz DEFAULT now());
 CREATE TABLE vuihoc."LOP_HOC" (madinhdanh text PRIMARY KEY, magiaovien text, trangthai text);
 INSERT INTO vuihoc."GIAO_VIEN" VALUES ('a','CHO_LOP',NULL,'2026-11-02T18:00:00Z'),('b','TAM_NGUNG','2026-10-01',now());
 INSERT INTO vuihoc."LOP_HOC" VALUES ('old','a','DANG_HOC');`);
 const migration = readFileSync('supabase/migrations/20261210_sync_teacher_class_status.sql','utf8');
 await db.exec(migration);
 await db.exec(migration);
 const teacher = async (id: string) => (await db.query('SELECT * FROM vuihoc."GIAO_VIEN" WHERE madinhdanh=$1',[id])).rows[0];
 assert.equal((await teacher('a')).trangthai,'DANG_DAY');
 assert.equal((await teacher('a')).ngaybatdau,'2026-11-03');
 assert.equal((await teacher('b')).ngaybatdau,'2026-10-01');
 await db.exec(`INSERT INTO vuihoc."LOP_HOC" VALUES ('new','a','CHO_KHAI_GIANG');
 UPDATE vuihoc."LOP_HOC" SET trangthai='DA_KET_THUC' WHERE madinhdanh='old';`);
 assert.equal((await teacher('a')).trangthai,'DANG_DAY');
 await db.exec(`UPDATE vuihoc."LOP_HOC" SET magiaovien='b' WHERE madinhdanh='new';`);
 assert.equal((await teacher('a')).trangthai,'CHO_LOP');
 assert.equal((await teacher('b')).trangthai,'DANG_DAY');
 await db.exec(`UPDATE vuihoc."LOP_HOC" SET trangthai='TAM_DUNG' WHERE madinhdanh='new';`);
 assert.equal((await teacher('b')).trangthai,'CHO_LOP');
 await db.exec(`UPDATE vuihoc."LOP_HOC" SET trangthai='DANG_HOC' WHERE madinhdanh='new';`);
 assert.equal((await teacher('b')).trangthai,'DANG_DAY');
 await db.exec(`DELETE FROM vuihoc."LOP_HOC" WHERE madinhdanh='new';
 UPDATE vuihoc."GIAO_VIEN" SET trangthai='TAM_NGUNG' WHERE madinhdanh='b';
 INSERT INTO vuihoc."LOP_HOC" VALUES ('inactive','b','DA_KET_THUC');`);
 assert.equal((await teacher('b')).trangthai,'TAM_NGUNG');
 await db.exec(`INSERT INTO vuihoc."GIAO_VIEN" (madinhdanh,trangthai,ngaytao) VALUES ('c','CHO_LOP','2026-11-02T18:00:00Z');`);
 assert.equal((await teacher('c')).ngaybatdau,'2026-11-03');
 console.log('PASS teacher/class status: backfill, repeat migration, assignment, replacement, multiple classes, stop, reopen, delete, manual status and joining date');
} finally { await db.close(); }
