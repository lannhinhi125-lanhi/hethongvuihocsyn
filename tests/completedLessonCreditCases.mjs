import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

export async function verifyCompletedLessonCredit(db) {
 await db.exec(readFileSync('supabase/reset_demo_aug_nov_2026.sql','utf8'));
 const migration=readFileSync('supabase/migrations/20261214_completed_lessons_credit.sql','utf8');
 const source=(await db.query(`SELECT to_regclass('vuihoc."V_BUOI_HOC"') IS NOT NULL yes`)).rows[0].yes?'V_BUOI_HOC':'BUOI_HOC';
 const early=(await db.query(`SELECT b.madinhdanh,b.magiaovienchinh FROM vuihoc."${source}" b
  WHERE b.ngayhoc BETWEEN date '2026-10-01' AND date '2026-10-25'
  AND b.ketthucluc<vuihoc.gio_ket_thuc_ca(b.ngayhoc,b.batdau,b.ketthuc)-interval '5 minutes'
  AND vuihoc.tien_do_nhan_xet_ca(b.madinhdanh)->>'state'='DA_DU'
  AND NOT EXISTS(SELECT 1 FROM vuihoc."SU_CO_BUOI_HOC" i WHERE i.mabuoi=b.madinhdanh)
  ORDER BY b.madinhdanh LIMIT 1`)).rows[0];
 assert.ok(early,'fixture has an early completed open-period lesson with full feedback and no incident');
 const credits=async()=> (await db.query('SELECT * FROM vuihoc."CONG_DAY_BUOI_HOC" ORDER BY madinhdanh')).rows;
 assert.equal((await credits()).filter(c=>c.mabuoi===early.madinhdanh).length,0);
 const before=await credits();
 const lockedLessons=(await db.query(`SELECT * FROM vuihoc."BUOI_HOC" WHERE ngayhoc<date '2026-10-01' ORDER BY madinhdanh`)).rows;
 const lockedPeriods=(await db.query('SELECT * FROM vuihoc."BANG_CONG_THANG" WHERE dakhoa ORDER BY kycong')).rows;

 await db.exec(migration);
 const credited=(await credits()).filter(c=>c.mabuoi===early.madinhdanh);
 assert.equal(credited.length,1);
 assert.equal(Number(credited[0].hesocong),1,'no incident means one standard credit, despite early checkout');
 assert.equal(credited[0].loaicong,'STANDARD');
 assert.equal((await db.query('SELECT trangthai FROM vuihoc."BUOI_HOC" WHERE madinhdanh=$1',[early.madinhdanh])).rows[0].trangthai,'DA_HOC');
 const after=await credits();
 for(const c of before)assert.deepEqual(after.find(row=>row.madinhdanh===c.madinhdanh),c,'preserve existing standard, incident and adjusted work');
 assert.deepEqual((await db.query(`SELECT * FROM vuihoc."BUOI_HOC" WHERE ngayhoc<date '2026-10-01' ORDER BY madinhdanh`)).rows,lockedLessons,'locked lesson history untouched');
 assert.deepEqual((await db.query('SELECT * FROM vuihoc."BANG_CONG_THANG" WHERE dakhoa ORDER BY kycong')).rows,lockedPeriods);
 await db.exec(migration);
 assert.deepEqual(await credits(),after,'repeat migration never duplicates or resets work');

 // A fresh taught lesson with no checkout is counted as taught with a warning,
 // but no credit is fabricated before saved checkout and actual feedback.
 await db.exec(`INSERT INTO vuihoc."LOP_HOC"
  SELECT (jsonb_populate_record(NULL::vuihoc."LOP_HOC",to_jsonb(l)||jsonb_build_object(
   'madinhdanh','CREDIT-TEST-CLASS','malophoc','CREDIT-TEST-CLASS'))).*
  FROM vuihoc."LOP_HOC" l WHERE l.madinhdanh=(SELECT malop FROM vuihoc."BUOI_HOC" WHERE madinhdanh='${early.madinhdanh}');
  INSERT INTO vuihoc."BUOI_HOC"
  SELECT (jsonb_populate_record(NULL::vuihoc."BUOI_HOC",to_jsonb(b)||jsonb_build_object(
   'madinhdanh','CREDIT-MISSING-CHECKOUT','malop','CREDIT-TEST-CLASS','magiaoviendaythay',NULL,'mahoclieu',NULL,
   'vaolopluc',b.vaolopluc,
   'ketthucluc',NULL,'manguoivaolop',NULL,'manguoiketthuc',NULL,'mabuoihienthi',NULL))).*
  FROM vuihoc."BUOI_HOC" b WHERE b.madinhdanh='${early.madinhdanh}'`);
 const missing=(await db.query(`SELECT trangthai FROM vuihoc."BUOI_HOC" WHERE madinhdanh='CREDIT-MISSING-CHECKOUT'`)).rows[0];
 assert.equal(missing.trangthai,'DA_HOC');
 assert.equal((await db.query(`SELECT vuihoc.ca_du_dieu_kien_ghi_cong('CREDIT-MISSING-CHECKOUT') ok`)).rows[0].ok,false);
 assert.equal((await credits()).filter(c=>c.mabuoi==='CREDIT-MISSING-CHECKOUT').length,0);

 const statuses=(await db.query(`SELECT
  vuihoc.trang_thai_ca_theo_du_lieu('2026-10-01','18:00','19:30','2026-10-01T18:00+07','2026-10-01T19:00+07','DANG_HOC','2026-10-01T20:00+07') early,
  vuihoc.trang_thai_ca_theo_du_lieu('2026-10-01','18:00','19:30',NULL,NULL,'CHUA_DIEN_RA','2026-10-01T20:00+07') absent,
  vuihoc.trang_thai_ca_theo_du_lieu('2026-10-01','18:00','19:30','2026-10-01T18:00+07',NULL,'DANG_HOC','2026-10-01T18:30+07') ongoing,
  vuihoc.trang_thai_ca_theo_du_lieu('2026-10-01','18:00','19:30','2026-10-01T18:00+07',NULL,'NGHI_HOC','2026-10-01T20:00+07') cancelled,
  vuihoc.trang_thai_ca_theo_du_lieu('2026-10-01','23:00','00:30','2026-10-01T23:00+07','2026-10-02T00:00+07','DANG_HOC','2026-10-02T00:40+07') overnight`)).rows[0];
 assert.deepEqual(statuses,{early:'DA_HOC',absent:'CHUA_HOC',ongoing:'DANG_HOC',cancelled:'NGHI_HOC',overnight:'DA_HOC'});
 assert.equal((await db.query(`SELECT count(*)::int n FROM vuihoc."CONG_DAY_BUOI_HOC" c JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=c.mabuoi
  WHERE b.vaolopluc IS NULL AND NOT EXISTS(SELECT 1 FROM vuihoc."SU_CO_BUOI_HOC" i WHERE i.mabuoi=b.madinhdanh)`)).rows[0].n,0);
 console.log('PASS completed lessons: early checkout => taught + 1 credit, full-feedback gate, no-show/cancel/ongoing, overnight, locked history, existing coefficients and rerun');
 console.log(JSON.stringify({workBefore:before.length,workAfter:after.length}));
}
