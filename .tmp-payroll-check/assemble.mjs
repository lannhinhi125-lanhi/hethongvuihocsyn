import {readFileSync,writeFileSync} from 'node:fs';
const file='supabase/migrations/20261014_normalize_monthly_payroll.sql';
const source=readFileSync(file,'utf8');
const marker='-- Generated integration definitions: same API, normalized storage.';
let sql=source.split(marker)[0]+'\n'+marker+'\n';
const draft=readFileSync('supabase/diagnostics/payroll_backfill_draft.sql','utf8');
let validation=draft.slice(draft.indexOf('CREATE OR REPLACE FUNCTION vuihoc.kiem_tra_ky_cong_buoi()'),draft.indexOf('CREATE OR REPLACE FUNCTION vuihoc.sinh_cong_khi_hoan_tat()'));
validation=validation.replace('NEW.magiaovienchinh,NEW.magiaoviendaythay,NEW.trangthai)','NEW.magiaovienchinh)').replace('OLD.magiaovienchinh,OLD.magiaoviendaythay,OLD.trangthai)','OLD.magiaovienchinh)');
validation=validation.replace("IF NEW.magiaovien IS DISTINCT FROM coalesce(cover,gv)","IF NEW.magiaovien IS DISTINCT FROM coalesce(cover,gv)");
sql+=validation+'\n';
const live=readFileSync('supabase/migrations/20261013_teacher_live_payroll.sql','utf8');
sql+=live.slice(live.indexOf('CREATE OR REPLACE FUNCTION vuihoc.business_teacher_dispute'),live.indexOf('CREATE OR REPLACE FUNCTION vuihoc.ghi_ca_vao_bang_cong'))+'\n';
let read=readFileSync('supabase/migrations/20261014_report_creation_dates.sql','utf8');
read=read.slice(read.indexOf('CREATE OR REPLACE FUNCTION'),read.lastIndexOf('COMMIT;'));
const executeStart=read.indexOf("  EXECUTE format('SELECT coalesce(jsonb_agg");
const executeEnd=read.indexOf('\n  result:=',executeStart);
read=read.slice(0,executeStart)+`  IF cfg.dataset='monthly_payroll' THEN
   EXECUTE format('SELECT coalesce(jsonb_agg(vuihoc.bang_cong_truy_van(t.kycong) ORDER BY t.kycong DESC),''[]''::jsonb) FROM vuihoc."BANG_CONG_THANG" t WHERE %s',predicate) INTO rows;
  ELSE
`+read.slice(executeStart,executeEnd)+`\n  END IF;`+read.slice(executeEnd);
const teacherStart=read.indexOf(' IF NOT isadmin THEN\n  SELECT');
const teacherEnd=read.indexOf('\n RETURN result;',teacherStart);
read=read.slice(0,teacherStart)+` IF NOT isadmin THEN
  IF own IS NOT NULL AND vuihoc.business_teacher_can(actor.madinhdanh,'Xem bảng kê công dạy cá nhân theo kỳ') THEN
   SELECT coalesce(jsonb_agg(vuihoc.bang_cong_truy_van(m.kycong,own) ORDER BY m.kycong DESC),'[]') INTO rows
   FROM vuihoc."BANG_CONG_THANG" m WHERE EXISTS(SELECT 1 FROM vuihoc."CONG_DAY_BUOI_HOC" c WHERE c.kycong=m.kycong AND c.magiaovien=own)
    OR EXISTS(SELECT 1 FROM vuihoc."DOI_SOAT_CONG_GIAO_VIEN" d WHERE d.kycong=m.kycong AND d.magiaovien=own);
  ELSE rows:='[]'; END IF;
  result:=result||jsonb_build_object('monthly_payroll',rows);
 END IF;`+read.slice(teacherEnd);
sql+=read+'\n';
const persistence=readFileSync('supabase/migrations/20261011_business_persistence.sql','utf8');
let save=persistence.slice(persistence.indexOf('CREATE OR REPLACE FUNCTION public.vuihoc_save_business'),persistence.indexOf('REVOKE ALL ON FUNCTION vuihoc.business_config'));
save=save.replace("  EXECUTE format('SELECT to_jsonb(t)",`  IF ds='monthly_payroll' THEN
   PERFORM vuihoc.luu_bang_cong(actor.madinhdanh,own,b,v);
   CONTINUE;
  END IF;
  EXECUTE format('SELECT to_jsonb(t)`);
const oldTeacherStart=save.indexOf("  IF ds='monthly_payroll' AND own IS NOT NULL");
const oldTeacherEnd=save.indexOf("  IF oldrow IS NOT NULL",oldTeacherStart);
save=save.slice(0,oldTeacherStart)+save.slice(oldTeacherEnd);
const monthlyBranch=save.indexOf("   ELSIF ds='monthly_payroll' THEN");
const monthlyEnd=save.indexOf('\n   END IF;\n   IF NOT vuihoc.business_can',monthlyBranch);
save=save.slice(0,monthlyBranch)+save.slice(monthlyEnd);
const oldGuard=save.indexOf("  IF ds='monthly_payroll' AND v IS NOT NULL");
const oldGuardEnd=save.indexOf("  IF ds='report_templates' THEN",oldGuard);
save=save.slice(0,oldGuard)+save.slice(oldGuardEnd);
save=save.split('\n').filter(line=>!line.startsWith("  IF ds='monthly_payroll' AND")).join('\n');
sql+=save+'\n';
sql+=`DROP FUNCTION IF EXISTS vuihoc.dong_bo_cong_buoi_tu_bang_thang();
ALTER TABLE vuihoc."BANG_CONG_THANG" DROP COLUMN IF EXISTS danhsachgiaovien,
  DROP COLUMN IF EXISTS danhsachgiaitrinh;
REVOKE ALL ON FUNCTION vuihoc.bang_cong_truy_van(text,text),vuihoc.ca_cong_truy_van(text,text),
 vuihoc.giai_trinh_truy_van(text),vuihoc.luu_bang_cong(text,text,jsonb,jsonb),
 vuihoc.ghi_ca_vao_bang_cong(text,text,numeric,text,text,text,boolean),
 vuihoc.ap_dung_cong_su_co(),vuihoc.cong_ca_sang_bang_thang() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.vuihoc_business_data(text),public.vuihoc_save_business(text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vuihoc_business_data(text),public.vuihoc_save_business(text,jsonb) TO anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
`;
writeFileSync(file,sql);
