-- Run after the existing relational/class-management updates.
-- Keep the installed reader's authorization and projections; skip unrelated datasets.
BEGIN;

CREATE OR REPLACE FUNCTION vuihoc.save_result_datasets(p_changes jsonb)
RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $$
 SELECT coalesce(array_agg(DISTINCT dataset),'{}'::text[])
 FROM jsonb_array_elements(p_changes) c
 CROSS JOIN LATERAL unnest(CASE c->>'dataset'
  -- These projections include derived names, enrollment traces and work totals.
  WHEN 'classes' THEN ARRAY['classes','students','teachers','dated_lessons','lesson_incidents','monthly_payroll','teacher_evaluations']
  WHEN 'students' THEN ARRAY['students','classes','dated_lessons','teachers','monthly_payroll']
  WHEN 'teachers' THEN ARRAY['teachers','classes','dated_lessons','monthly_payroll','teacher_evaluations']
  WHEN 'dated_lessons' THEN ARRAY['dated_lessons','classes','students','teachers','lesson_incidents','monthly_payroll','teacher_evaluations']
  WHEN 'lesson_incidents' THEN ARRAY['lesson_incidents','dated_lessons','classes','students','teachers','monthly_payroll']
  WHEN 'teacher_evaluations' THEN ARRAY['teacher_evaluations','teachers']
  WHEN 'monthly_payroll' THEN ARRAY['monthly_payroll']
  WHEN 'incident_categories' THEN ARRAY['incident_categories','lesson_incidents','dated_lessons','monthly_payroll']
  WHEN 'subjects' THEN ARRAY['subjects','teachers','students','classes','monthly_payroll']
  WHEN 'teaching_categories' THEN ARRAY['teaching_categories','teachers','students','classes']
  WHEN 'levels' THEN ARRAY['levels','teachers','students','classes']
  WHEN 'class_models' THEN ARRAY['class_models','teachers','students','classes']
  WHEN 'time_slots' THEN ARRAY['time_slots','teachers','students','classes','dated_lessons','monthly_payroll']
  ELSE ARRAY[c->>'dataset'] END) dataset
 WHERE dataset IS NOT NULL
$$;

CREATE OR REPLACE FUNCTION vuihoc.scoped_save_data(p_token text,p_datasets text[])
RETURNS jsonb LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE previous_scope text:=current_setting('vuihoc.read_datasets',true); result jsonb;
BEGIN
 PERFORM set_config('vuihoc.read_datasets',to_jsonb(p_datasets)::text,true);
 result:=public.vuihoc_business_data(p_token);
 PERFORM set_config('vuihoc.read_datasets',coalesce(previous_scope,''),true);
 RETURN result;
EXCEPTION WHEN OTHERS THEN
 PERFORM set_config('vuihoc.read_datasets',coalesce(previous_scope,''),true);
 RAISE;
END $$;

DO $patch$
DECLARE f text; original text; signature text; datasets text;
BEGIN
 f:=pg_get_functiondef('public.vuihoc_business_data(text)'::regprocedure);
 IF strpos(f,'-- scoped_save_reader')=0 THEN
  original:=f;
  f:=replace(f,'predicate:=''true'';', $reader$-- scoped_save_reader
  IF nullif(current_setting('vuihoc.read_datasets',true),'') IS NOT NULL
   AND NOT (current_setting('vuihoc.read_datasets')::jsonb ? cfg.dataset) THEN CONTINUE; END IF;
  predicate:='true';$reader$);
  IF f=original THEN RAISE EXCEPTION 'Unsupported business reader: dataset loop not found'; END IF;
  IF strpos(f,'IF NOT isadmin THEN')=0 THEN RAISE EXCEPTION 'Unsupported business reader: teacher payroll branch not found'; END IF;
  f:=replace(f,'IF NOT isadmin THEN', $reader$IF NOT isadmin AND
   (nullif(current_setting('vuihoc.read_datasets',true),'') IS NULL
    OR current_setting('vuihoc.read_datasets')::jsonb ? 'monthly_payroll') THEN$reader$);
  -- The replacement also encounters ELSIF NOT isadmin THEN inside the loop.
  -- That branch must retain its original portal permission predicate.
  f:=replace(f, $reader$ELSIF NOT isadmin AND
   (nullif(current_setting('vuihoc.read_datasets',true),'') IS NULL
    OR current_setting('vuihoc.read_datasets')::jsonb ? 'monthly_payroll') THEN$reader$, 'ELSIF NOT isadmin THEN');
  EXECUTE f;
 END IF;

 FOREACH signature IN ARRAY ARRAY[
  'public.vuihoc_save_business(text,jsonb)',
  'public.vuihoc_remove_class_student(text,text,text)',
  'public.vuihoc_remove_student_registration(text,text,text)'
 ] LOOP
  IF to_regprocedure(signature) IS NULL THEN CONTINUE; END IF;
  f:=pg_get_functiondef(to_regprocedure(signature));
  IF strpos(f,'vuihoc.scoped_save_data')>0 THEN CONTINUE; END IF;
  datasets:=CASE WHEN signature='public.vuihoc_save_business(text,jsonb)'
   THEN 'vuihoc.save_result_datasets(p_changes)'
   ELSE 'ARRAY[''students'',''classes'',''teachers'',''dated_lessons'',''lesson_incidents'',''monthly_payroll'',''teacher_evaluations'']' END;
  original:=f;
  f:=replace(f,'''data'',public.vuihoc_business_data(p_token)',
   '''partial'',true,''data'',vuihoc.scoped_save_data(p_token,'||datasets||')');
  IF f=original THEN RAISE EXCEPTION 'Unsupported save receipt in %',signature; END IF;
  EXECUTE f;
 END LOOP;
END $patch$;

REVOKE ALL ON FUNCTION vuihoc.save_result_datasets(jsonb),vuihoc.scoped_save_data(text,text[]) FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
