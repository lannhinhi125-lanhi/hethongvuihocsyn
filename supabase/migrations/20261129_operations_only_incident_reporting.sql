-- Preserve normalized RPC logic and require operations permission.
DO $migration$
DECLARE definition text;
BEGIN
 definition := pg_get_functiondef('public.vuihoc_report_lesson_incident(text,text,date,text,text,text)'::regprocedure);
 IF position('Vui lòng liên hệ vận hành để xác minh' in definition) = 0 THEN
  IF position('actor:=vuihoc.nguoi_dung_phien(p_token);' in definition) = 0 THEN
   RAISE EXCEPTION 'Cannot locate incident RPC authorization';
  END IF;
  EXECUTE replace(definition, 'actor:=vuihoc.nguoi_dung_phien(p_token);',
   'actor:=vuihoc.nguoi_dung_phien(p_token); IF NOT vuihoc.business_can(actor.madinhdanh,''PH5'',''Ghi nhận và xử lý sự cố ca dạy'') THEN RAISE EXCEPTION ''Vui lòng liên hệ vận hành để xác minh và ghi nhận sự cố ca dạy''; END IF;');
 END IF;
END $migration$;
