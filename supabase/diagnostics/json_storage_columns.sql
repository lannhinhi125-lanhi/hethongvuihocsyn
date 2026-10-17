-- Read-only: an empty result means no JSON/JSONB storage column in vuihoc.
-- Includes domains and arrays based on those types.
WITH RECURSIVE column_types AS (
 SELECT c.relname AS table_name,a.attname AS column_name,a.atttypid AS type_id
 FROM pg_catalog.pg_attribute a
 JOIN pg_catalog.pg_class c ON c.oid=a.attrelid
 JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='vuihoc' AND c.relkind IN ('r','p','f') AND a.attnum>0 AND NOT a.attisdropped
 UNION ALL
 SELECT c.table_name,c.column_name,CASE WHEN t.typtype='d' THEN t.typbasetype ELSE t.typelem END
 FROM column_types c JOIN pg_catalog.pg_type t ON t.oid=c.type_id
 WHERE t.typtype='d' OR t.typelem<>0
)
SELECT DISTINCT c.table_name,c.column_name,t.typname AS storage_type
FROM column_types c JOIN pg_catalog.pg_type t ON t.oid=c.type_id
JOIN pg_catalog.pg_namespace n ON n.oid=t.typnamespace
WHERE n.nspname='pg_catalog' AND t.typname IN ('json','jsonb')
ORDER BY c.table_name,c.column_name;
