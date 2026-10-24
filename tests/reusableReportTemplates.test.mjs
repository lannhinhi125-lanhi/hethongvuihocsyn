import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {PGlite}=await import(pathToFileURL(resolve(process.env.PGLITE_MODULE_PATH,'dist/index.js')));
const db=new PGlite({initialMemory:128*1024*1024,postgresqlconf:'shared_buffers=8MB'});
try {
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA vuihoc;
 CREATE FUNCTION public.vuihoc_login(text,text) RETURNS text LANGUAGE sql AS 'SELECT $1';
 CREATE TABLE vuihoc."MAU_BAO_CAO"(madinhdanh text PRIMARY KEY,tenmaubaocao text NOT NULL,nguondulieu text NOT NULL,nhomtheo text NOT NULL,
 khoangngay text NOT NULL DEFAULT 'all',tungay date,denngay date,sapxep text NOT NULL,sosanhbat boolean,kieusosanh text,sosanhtungay date,sosanhdenngay date,giatrichon text,kieubieudo text,chisobieudo text,ngaytao date NOT NULL DEFAULT CURRENT_DATE,
 CHECK(khoangngay IN ('month','previous_month','last_30_days','all','custom')),CHECK(tungay IS NULL OR denngay IS NULL OR tungay<=denngay));
 CREATE TABLE vuihoc."CHI_SO_MAU_BAO_CAO"(mamau text REFERENCES vuihoc."MAU_BAO_CAO",machiso text,thutu integer,PRIMARY KEY(mamau,machiso),UNIQUE(mamau,thutu));
 CREATE TABLE vuihoc."BO_LOC_MAU_BAO_CAO"(mamau text REFERENCES vuihoc."MAU_BAO_CAO",truong text,giatri text,thutu integer,PRIMARY KEY(mamau,truong,giatri),UNIQUE(mamau,truong,thutu));`);
 // Execute the existing production reader/writer as the upgrade prerequisite.
 const previous=readFileSync('supabase/migrations/20261202_normalize_report_templates.sql','utf8');
 for(const [name,tag] of [['cau_hinh_mau_bao_cao','read'],['luu_cau_hinh_mau_bao_cao','write']]){
  const start=previous.indexOf('CREATE FUNCTION vuihoc.'+name+'(');
  const end=previous.indexOf('$'+tag+'$;',start)+tag.length+3;
  assert.ok(start>0&&end>start);await db.exec(previous.slice(start,end));
 }
 const config={datasetId:'classes',groupBy:'subject',metricIds:['count'],filters:{subject:['M','E'],status:'DANG_HOC'},sort:'label_asc',chartType:'bar',chartMetricId:'count',datePreset:'custom',from:'2026-09-01',to:'2026-09-30',comparison:{enabled:true,mode:'custom',start:'2025-09-01',end:'2025-09-30'},selection:{by:'subject',key:'M'}};
 await db.exec(`INSERT INTO vuihoc."MAU_BAO_CAO"(madinhdanh,tenmaubaocao,nguondulieu,nhomtheo,sapxep) VALUES('T','Reusable','classes','subject','label_asc')`);
 const write=cfg=>db.query('SELECT vuihoc.luu_cau_hinh_mau_bao_cao($1,$2::jsonb)',['T',JSON.stringify(cfg)]);
 const read=async()=>(await db.query("SELECT vuihoc.cau_hinh_mau_bao_cao('T') v")).rows[0].v;
 await write(config);assert.equal((await read()).from,config.from);
 const created=(await db.query('SELECT ngaytao FROM vuihoc."MAU_BAO_CAO"')).rows[0].ngaytao;
 const dropSql=readFileSync('supabase/migrations/20261212_drop_report_template_periods.sql','utf8');
 await db.exec('BEGIN');await db.exec(dropSql);await db.exec(dropSql);await write(config);
 assert.ok(!('from' in await read()));await db.exec('ROLLBACK');
 const sql=readFileSync('supabase/migrations/20261211_reusable_report_templates.sql','utf8');
 await db.exec(sql);const first=await read();await db.exec(sql);assert.deepEqual(await read(),first);
 const {datePreset,from,to,comparison,selection,...expected}=config;
 assert.deepEqual(first,{...expected,filters:{subject:['M','E'],status:['DANG_HOC']}});
 // New application writes without dates; old application sends dates: neither stores a period.
 await write(expected);assert.deepEqual(await read(),first);
 await write({...config,from:'not-a-date',to:'also-invalid'});assert.deepEqual(await read(),first);
 await db.exec(`UPDATE vuihoc."MAU_BAO_CAO" SET tungay='2026-10-01',denngay='2026-10-31',khoangngay='custom',sosanhbat=true,kieusosanh='custom',sosanhtungay='2025-10-01',sosanhdenngay='2025-10-31',giatrichon='M'`);
 const row=(await db.query('SELECT * FROM vuihoc."MAU_BAO_CAO"')).rows[0];
 assert.equal(row.khoangngay,'all');for(const key of ['tungay','denngay','sosanhbat','kieusosanh','sosanhtungay','sosanhdenngay','giatrichon'])assert.equal(row[key],null,key);
 assert.deepEqual(row.ngaytao,created);assert.deepEqual(await read(),first);
 await assert.rejects(()=>write({...expected,unknown:'invalid'}));
 await db.exec(dropSql);await db.exec(dropSql);
 for(const key of ['khoangngay','tungay','denngay','sosanhbat','kieusosanh','sosanhtungay','sosanhdenngay','giatrichon']){
  assert.equal((await db.query("SELECT count(*)::int n FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='MAU_BAO_CAO' AND column_name=$1",[key])).rows[0].n,0,key);
 }
 await write(expected);assert.deepEqual(await read(),first);
 await write(config);assert.deepEqual(await read(),first);
 assert.deepEqual((await db.query('SELECT ngaytao FROM vuihoc."MAU_BAO_CAO"')).rows[0].ngaytao,created);
 const check=(await db.query("SELECT pg_get_constraintdef(oid) v FROM pg_constraint WHERE conrelid='vuihoc.\"MAU_BAO_CAO\"'::regclass AND conname='mau_bao_cao_khung_hop_le'")).rows[0].v;
 assert.ok(readFileSync('supabase/diagnostics/final_3nf_schema_review.sql','utf8').includes(JSON.stringify(check).slice(1,-1).replaceAll("'","''")),'review manifest matches: '+check);
 console.log('PASS reusable templates: production SQL functions, repeat migration, preserved structure/filters/creation date, new and old writers, direct SQL guard, no saved dates or drill-down');
} finally {await db.close();}
