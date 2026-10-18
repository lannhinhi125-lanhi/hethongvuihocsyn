import {readFileSync,writeFileSync} from 'node:fs';
const root=new URL('./',import.meta.url);
const sources=['migrations/20261109_reenrollment_class_duration.sql','backfill_demo_class_end_dates.sql'];
const content=sources.map(path=>'-- Source: '+path+'\n'+readFileSync(new URL(path,root),'utf8').replace(/^(?:BEGIN;|COMMIT;)\s*$/gm,'')).join('\n');
writeFileSync(new URL('apply_demo_class_terms.sql',root),'-- Run this entire file once in Supabase SQL Editor.\n-- Schema upgrade and existing demo class terms are committed atomically.\nBEGIN;\n'+content+'\nCOMMIT;\n');
