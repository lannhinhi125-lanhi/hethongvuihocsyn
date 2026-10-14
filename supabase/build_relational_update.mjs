import {readFileSync,writeFileSync} from 'node:fs';
const files=[
 '20261014_normalize_monthly_payroll.sql',
 '20261015_relational_catalogs_dates.sql',
 '20261015_relational_teacher_reports.sql',
];
const root=new URL('./',import.meta.url);
const parts=files.map(name=>{
 const source=readFileSync(new URL('migrations/'+name,root),'utf8');
 return '-- Source: '+name+'\n'+source.replace(/^(?:BEGIN;|COMMIT;)\s*$/gm,'');
});
writeFileSync(new URL('apply_relational_update.sql',root),
 '-- Run this ONE file in Supabase SQL Editor. The entire update is atomic.\n'
 +'-- Includes the previous unrun payroll/catalog/date update and the new requests.\n'
 +'BEGIN;\nSET CONSTRAINTS ALL IMMEDIATE;\n'
 +'DROP VIEW IF EXISTS vuihoc."V_BANG_CONG_THEO_GIAO_VIEN";\n'
 +'DROP VIEW IF EXISTS vuihoc."V_CONG_DAY_THEO_CA";\n'
 +parts.join('\nSET CONSTRAINTS ALL IMMEDIATE;\n')
 +'\nSET CONSTRAINTS ALL IMMEDIATE;\nCOMMIT;\n');
