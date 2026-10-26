-- Run on the existing database. Compatible with or without 20261215.
BEGIN;
DO $patch$
DECLARE f text; original text := $old$EXECUTE format('INSERT INTO vuihoc.%I(%s) SELECT %s ON CONFLICT(madinhdanh) DO UPDATE SET %s',conf->>'table',cols,exprs,assigns) USING v;$old$;
BEGIN
 f:=pg_get_functiondef('public.vuihoc_save_business(text,jsonb)'::regprocedure);
 -- Existing recovery migrations already update changed physical columns only.
 IF strpos(f,'update_existing_business_rows')>0 THEN RETURN; END IF;
 IF strpos(f,'class_student_changed_columns')=0 THEN
  IF strpos(f,original)=0 THEN RAISE EXCEPTION 'Unsupported vuihoc_save_business definition; no changes applied'; END IF;
  f:=replace(f,original,$new$
   -- class_student_changed_columns: relation writers below still receive the full projection.
   IF ds IN ('classes','students') AND oldrow IS NOT NULL THEN
    SELECT string_agg(format('%I=(jsonb_populate_record(NULL::vuihoc.%I,$1)).%I',e.k,conf->>'table',e.k),',')
     INTO assigns FROM jsonb_each(v) e(k,val)
     JOIN pg_attribute a ON a.attrelid=to_regclass(format('vuihoc.%I',conf->>'table'))
      AND a.attname=e.k AND a.attnum>0 AND NOT a.attisdropped AND a.attgenerated=''
     WHERE e.k<>'madinhdanh' AND e.val IS DISTINCT FROM oldrow->e.k;
    IF assigns IS NOT NULL THEN
     EXECUTE format('UPDATE vuihoc.%I SET %s WHERE madinhdanh=$2',conf->>'table',assigns) USING v,id;
    END IF;
   ELSE
    EXECUTE format('INSERT INTO vuihoc.%I(%s) SELECT %s ON CONFLICT(madinhdanh) DO UPDATE SET %s',conf->>'table',cols,exprs,assigns) USING v;
   END IF;
  $new$);
  EXECUTE f;
 END IF;
END $patch$;
NOTIFY pgrst,'reload schema';
COMMIT;
