import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const sourcePath=new URL('../supabase/diagnostics/final_3nf_schema_review.sql',import.meta.url);
const summaryMode=process.argv.includes('--summary');
const compactMode=process.argv.includes('--compact');
assert.ok(!(summaryMode&&compactMode),'Choose --summary or --compact');
const reducedMode=summaryMode||compactMode;
const expectedCount=compactMode?27:summaryMode?29:50;
const outputPath=new URL(compactMode?'../supabase/vuihoc_27_bang_chinh.dbml':summaryMode?'../supabase/vuihoc_29_bang_chinh.dbml':'../supabase/vuihoc_50_tables.dbml',import.meta.url);
const source=readFileSync(sourcePath,'utf8');
const literal="'((?:''|[^'])*)'";
const pattern=new RegExp('^ \\('+literal+','+literal+'::jsonb,'+literal+'::jsonb,'+literal+'::jsonb,'+literal+'\\)[,]?$','gm');
const decode=s=>s.replaceAll("''","'");
const allTables=[...source.matchAll(pattern)].map(m=>({name:decode(m[1]),columns:JSON.parse(decode(m[2])),constraints:JSON.parse(decode(m[3])),indexes:JSON.parse(decode(m[4])),note:decode(m[5])}));
assert.equal(allTables.length,50,'Source must cover all reviewed physical tables');
assert.equal(allTables.reduce((n,t)=>n+Object.keys(t.columns).length,0),384);
const names=new Map(allTables.map(t=>[t.name,t]));
const templateNote=' Sau 20261212: đã xóa hẳn 8 cột khoảng ngày, kỳ so sánh và nhóm bấm xem. Mẫu chỉ lưu khung báo cáo dùng lại; mở mẫu giữ thời gian đang chọn. Chỉ số và bộ lọc lấy từ CHI_SO_MAU_BAO_CAO và BO_LOC_MAU_BAO_CAO qua mamau. ngaytao/ngaycapnhat là thời điểm tạo/sửa mẫu.';
names.get('MAU_BAO_CAO').note+=templateNote;
const quote=s=>"'"+s.replaceAll('\\','\\\\').replaceAll("'","\\'").replaceAll('\r','').replaceAll('\n','\\n')+"'";
const fields=s=>s.split(',').map(x=>x.trim().replaceAll('"',''));
const list=cols=>cols.length===1?cols[0]:'('+cols.join(', ')+')';
const keyColumns=c=>fields(c.match(/\(([^)]+)\)/)[1]);
const sameSet=(a,b)=>a.length===b.length&&a.every(x=>b.includes(x));
const typeNames={'timestamp with time zone':'timestamptz','timestamp without time zone':'timestamp','time without time zone':'time','time with time zone':'timetz','double precision':'float8'};
const fullGroups={
 Tai_khoan_va_quyen:['NGUOI_DUNG','NHOM_QUYEN','QUYEN','NHOM_QUYEN_CHI_TIET'],
 Danh_muc_nguon:['MON_HOC','TRINH_DO','KHUNG_GIO','MO_HINH_LOP','CAP_HOC','LUA_CHON_CAP_HOC','DANH_MUC_SU_CO','LOAI_SU_CO','DANH_MUC_BO_SUNG','MUC_DANH_MUC'],
 Giao_vien_va_lich_ranh:['GIAO_VIEN','GIAO_VIEN_KHOI','GIAO_VIEN_MO_HINH','PHIEN_BAN_LICH_RANH','CHI_TIET_PHIEN_BAN_LICH_RANH','BIEN_BAN_DU_GIO'],
 Hoc_sinh_va_lop:['HOC_SINH','DANG_KY_MON_HOC','LICH_DANG_KY_MON_HOC','XEP_LOP_DANG_KY','LICH_SU_DANG_KY_HOC','LICH_SU_CA_DANG_KY_HOC','TRUY_VET_XEP_LOP','LOP_HOC','LICH_LOP','HOC_LIEU_LOP','CHI_TIET_CA_LOP'],
 Buoi_hoc_va_giam_sat:['BUOI_HOC','DIEM_DANH_BUOI_HOC','NHAN_XET_BUOI_HOC','SU_CO_BUOI_HOC'],
 Tai_lieu_va_AI:['LOAI_TAI_LIEU','TAI_LIEU_QUY_TRINH','CAU_HINH_HE_THONG','CAU_HINH_TRO_LY','VAN_PHONG_NHAN_XET','PHIEN_CHAT_AI','CAU_HOI_CHAT_AI'],
 Cong_va_doi_soat:['BANG_CONG_THANG','CONG_DAY_BUOI_HOC','DOI_SOAT_CONG_GIAO_VIEN','GIAI_TRINH_CONG_DAY','LINK_MINH_CHUNG_CONG'],
 Mau_bao_cao:['MAU_BAO_CAO','CHI_SO_MAU_BAO_CAO','BO_LOC_MAU_BAO_CAO']
};
const summaryGroups={
 PH1_Tai_khoan_va_phan_quyen:['NHOM_QUYEN','NGUOI_DUNG'],
 PH2_Danh_muc_cot_loi:['MON_HOC','TRINH_DO','MO_HINH_LOP','KHUNG_GIO'],
 PH3_Giao_vien_lich_ranh_du_gio:['GIAO_VIEN','PHIEN_BAN_LICH_RANH','CHI_TIET_PHIEN_BAN_LICH_RANH','BIEN_BAN_DU_GIO'],
 PH4_Hoc_sinh_dang_ky_lop:['HOC_SINH','DANG_KY_MON_HOC','LICH_DANG_KY_MON_HOC','XEP_LOP_DANG_KY','LOP_HOC','LICH_LOP','HOC_LIEU_LOP'],
 PH5_Buoi_hoc_giam_sat_su_co:['BUOI_HOC','DIEM_DANH_BUOI_HOC','NHAN_XET_BUOI_HOC','DANH_MUC_SU_CO','LOAI_SU_CO','SU_CO_BUOI_HOC'],
 PH6_Tai_lieu_phuc_vu_AI:['TAI_LIEU_QUY_TRINH'],
 PH7_Cong_day_va_doi_soat:['BANG_CONG_THANG','CONG_DAY_BUOI_HOC','DOI_SOAT_CONG_GIAO_VIEN','GIAI_TRINH_CONG_DAY'],
 PH8_Mau_bao_cao:['MAU_BAO_CAO']
};
// Omit supporting lesson feedback and class materials from the compact overview only.
const compactOmissions=new Set(['HOC_LIEU_LOP','NHAN_XET_BUOI_HOC']);
const compactGroups=Object.fromEntries(Object.entries(summaryGroups).map(([group,members])=>[group,members.filter(name=>!compactOmissions.has(name))]));
const groups=compactMode?compactGroups:summaryMode?summaryGroups:fullGroups;
const tables=reducedMode?Object.values(groups).flat().map(name=>{assert.ok(names.has(name),name);return names.get(name);}):allTables;
const selected=new Set(tables.map(t=>t.name));
assert.equal(tables.length,expectedCount);
const columnCount=tables.reduce((n,t)=>n+Object.keys(t.columns).length,0);
const projectNote=reducedMode
 ?`Sơ đồ nghiệp vụ chính: rút gọn ${expectedCount}/50 bảng vật lý, chia 8 phân hệ. Các bảng cấu hình/chi tiết/lịch sử bị lược khỏi hình vẫn tồn tại trong CSDL. Chỉ vẽ FK thật giữa các bảng được chọn; không thay thế sơ đồ vật lý đầy đủ và không dùng làm migration.`
 :'50 bảng vật lý, 384 cột sau 20261212. PK/FK/khóa ghép lấy từ cấu trúc đã rà; không bao gồm view. Dùng vẽ ERD, không chạy SQL xuất từ sơ đồ để thay migration.';
const grouped=Object.values(groups).flat();assert.equal(new Set(grouped).size,tables.length);assert.deepEqual([...grouped].sort(),[...selected].sort());
let out=`// Generated by node scripts/export-dbdiagram.mjs${compactMode?' --compact':summaryMode?' --summary':''}
// Source: reviewed vuihoc schema after 20261212; showing ${tables.length}/50 physical tables, ${columnCount} columns.
// Obsolete report-template period columns have been physically removed by 20261212.
// Ordinary views are deliberately excluded. This file documents the ERD; it is not a migration.
// Numeric precision/defaults/identity details are not supplied by the review manifest.
// PostgreSQL partial/expression unique indexes and deferred constraints are retained as notes.
Project VuiHoc_${tables.length}_bang {
  database_type: 'PostgreSQL'
  Note: ${quote(projectNote)}
}

`;
let checks=0,uniqueKeys=0,omittedForeignKeys=0;
const refs=[];
for(const t of tables){
 const pk=t.constraints.filter(c=>c.startsWith('PRIMARY KEY '));assert.equal(pk.length,1,t.name+' primary key');
 const primary=keyColumns(pk[0]);
 const unique=t.constraints.filter(c=>c.startsWith('UNIQUE ')).map(keyColumns);
 out+='Table vuihoc.'+t.name+' {\n';
 for(const [name,c] of Object.entries(t.columns)){
  const settings=[];
  if(primary.length===1&&primary[0]===name)settings.push('pk');
  settings.push(c.nullable==='NO'?'not null':'null');
  if(c.generated==='ALWAYS')settings.push('note: '+quote('Cột GENERATED ALWAYS trong PostgreSQL; không nhập độc lập.'));
  const type=typeNames[c.type]??c.type;
  out+='  '+name+' '+(type.includes(' ')?JSON.stringify(type):type)+' ['+settings.join(', ')+']\n';
 }
 if(primary.length>1||unique.length){
  out+='\n  indexes {\n';
  if(primary.length>1)out+='    ('+primary.join(', ')+') [pk]\n';
  for(const cols of unique){out+='    '+list(cols)+' [unique]\n';uniqueKeys++;}
  out+='  }\n';
 }
 const constraints=t.constraints.filter(c=>c.startsWith('CHECK '));
 if(constraints.length){
  out+='\n  // PostgreSQL CHECK constraints, retained as comments for broad DBML parser compatibility.\n';
  for(const c of constraints){checks++;out+='  // '+c+'\n';}
 }
 const extra=t.indexes.length?' Unique index PostgreSQL bổ sung (giữ nguyên định nghĩa, không diễn giải partial index thành UNIQUE toàn bảng): '+t.indexes.join('; '):'';
 const hidden=t.constraints.filter(c=>c.startsWith('FOREIGN KEY ')).filter(c=>!selected.has(c.match(/REFERENCES vuihoc\."([^"]+)"/)[1]));
 const hiddenNote=hidden.length?' FK tới bảng lược khỏi sơ đồ chính (vẫn tồn tại trong CSDL): '+hidden.join('; '):'';
 out+='\n  Note: '+quote(t.note+extra+hiddenNote)+'\n}\n\n';
 for(const c of t.constraints.filter(c=>c.startsWith('FOREIGN KEY '))){
  const fk=c.match(/^FOREIGN KEY \(([^)]+)\) REFERENCES vuihoc\."([^"]+)"\(([^)]+)\)(.*)$/);
  assert.ok(fk,'Unsupported FK: '+c);
  const child=fields(fk[1]),parent=names.get(fk[2]),target=fields(fk[3]);assert.ok(parent);
  assert.equal(child.length,target.length);
  for(const column of child)assert.ok(t.columns[column],t.name+'.'+column);
  for(const column of target)assert.ok(parent.columns[column],parent.name+'.'+column);
  const targetKeys=parent.constraints.filter(k=>/^(PRIMARY KEY|UNIQUE) /.test(k)).map(keyColumns);
  assert.ok(targetKeys.some(k=>sameSet(k,target)),'FK target is not a candidate key: '+c);
  if(!selected.has(parent.name)){omittedForeignKeys++;continue;}
  const isUnique=[primary,...unique].some(k=>sameSet(k,child));
  const action=kind=>fk[4].match(new RegExp('ON '+kind+' (CASCADE|RESTRICT|SET NULL|SET DEFAULT|NO ACTION)'))?.[1].toLowerCase()??'no action';
  const left='vuihoc.'+t.name+'.'+list(child),right='vuihoc.'+parent.name+'.'+list(target);
  const refName='fk_'+String(refs.length+1).padStart(3,'0');
  refs.push('// '+c+'\nRef '+refName+': '+(isUnique?right+' - '+left:left+' > '+right)+' [delete: '+action('DELETE')+', update: '+action('UPDATE')+']');
 }
}
out+=(reducedMode?'// Only actual FKs between shown tables; omitted FK targets remain in table notes. Composite keys preserved.\n':'// Relationships, including every composite FK. Unique child FK uses one-to-one notation.\n')+refs.join('\n\n')+'\n\n';
for(const [group,members] of Object.entries(groups))out+='TableGroup '+group+' {\n'+members.map(t=>'  vuihoc.'+t).join('\n')+'\n}\n\n';
writeFileSync(outputPath,out,'utf8');
console.log(JSON.stringify({file:fileURLToPath(outputPath),tables:tables.length,columns:columnCount,foreignKeys:refs.length,omittedForeignKeys,checks,uniqueKeys,groups:Object.keys(groups).length}));
