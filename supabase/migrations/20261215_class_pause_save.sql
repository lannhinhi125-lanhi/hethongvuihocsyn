-- Apply to the existing database; no schema reset or demo seed is needed.
-- Pause edits must not fire UPDATE OF triggers for unrelated class columns.
BEGIN;
DO $patch$
DECLARE f text; original text := $old$EXECUTE format('INSERT INTO vuihoc.%I(%s) SELECT %s ON CONFLICT(madinhdanh) DO UPDATE SET %s',conf->>'table',cols,exprs,assigns) USING v;$old$;
BEGIN
 f:=pg_get_functiondef('public.vuihoc_save_business(text,jsonb)'::regprocedure);
 IF strpos(f,'update_existing_business_rows')>0 THEN RETURN; END IF;
 IF strpos(f,'class_pause_scalar_update')=0 THEN
  IF strpos(f,original)=0 THEN RAISE EXCEPTION 'Unsupported vuihoc_save_business definition; no changes applied'; END IF;
  f:=replace(f,original,$new$
   -- class_pause_scalar_update: retain authorization, conflict checks and relation writers.
   IF ds='classes' AND oldrow IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM jsonb_each(v) e(k,val)
    WHERE k NOT IN ('madinhdanh','tamdunglich','lydotamdung','manhomtamdung','ghichutamdung')
     AND val IS DISTINCT FROM oldrow->k
   ) THEN
    SELECT string_agg(format('%I=(jsonb_populate_record(NULL::vuihoc.%I,$1)).%I',k,conf->>'table',k),',')
     INTO assigns FROM jsonb_each(v) e(k,val)
     WHERE k IN ('tamdunglich','lydotamdung','manhomtamdung','ghichutamdung') AND val IS DISTINCT FROM oldrow->k;
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
