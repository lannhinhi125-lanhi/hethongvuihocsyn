-- Read-only before/after 20261207. WRITER_* and FOREIGN_KEY rows are informational.
WITH RECURSIVE tree(macaphoc,id,parent,path,cycle) AS (
 SELECT macaphoc,madinhdanh,macha,ARRAY[madinhdanh],false FROM vuihoc."LUA_CHON_CAP_HOC"
 UNION ALL SELECT t.macaphoc,c.madinhdanh,c.macha,t.path||c.madinhdanh,c.madinhdanh=ANY(t.path)
 FROM tree t JOIN vuihoc."LUA_CHON_CAP_HOC" c ON (c.macaphoc,c.madinhdanh)=(t.macaphoc,t.parent) WHERE NOT t.cycle
)
SELECT CASE WHEN coalesce(strpos(pg_get_functiondef(to_regprocedure('vuihoc.ghi_chi_tiet_danh_muc(text,jsonb,boolean)')),'PERFORM vuihoc.luu_lua_chon_cap_hoc'),0)>0 THEN 'WRITER_READY' ELSE 'WRITER_REVIEW' END AS loai,
 'CAP_HOC → LUA_CHON_CAP_HOC' AS doi_tuong,'After 20261207, the writer must update retained keys and only delete removed choices.' AS chitiet
UNION ALL SELECT 'FOREIGN_KEY',c.conrelid::regclass::text||'.'||c.conname,pg_get_constraintdef(c.oid)
 FROM pg_constraint c WHERE c.confrelid='vuihoc."LUA_CHON_CAP_HOC"'::regclass AND c.contype='f'
UNION ALL SELECT 'INVALID_CHOICE',macaphoc||'/'||madinhdanh,'Blank ID/label or nonpositive display order.' FROM vuihoc."LUA_CHON_CAP_HOC"
 WHERE btrim(madinhdanh)='' OR btrim(nhan)='' OR thutu<=0
UNION ALL SELECT DISTINCT 'PARENT_CYCLE',macaphoc||'/'||id,'Catalog parent cycle requires reconciliation.' FROM tree WHERE cycle
ORDER BY 1,2;
