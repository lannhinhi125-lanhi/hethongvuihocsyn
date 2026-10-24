import React,{useRef,useState} from 'react';
import {useApp} from '../context/AppContext';
import {useBusinessStatus,loadBusinessData,waitForBusinessSave} from '../lib/businessPersistence';
import {teacherSessionRequest,refreshAccountSession} from '../lib/accountSession';
import {xlsxRows} from '../lib/roomLinkImport';
import {randomUUID} from '../lib/randomUUID';
import {profileHeaders,profileTemplate,validateProfileRows,importedTeacher,importedStudent,downloadProfileExcel,type ProfileImportKind,type ProfileImportRow} from '../lib/profileImport';

export function ProfileExcelImport({kind,disabled=false}:{kind:ProfileImportKind;disabled?:boolean}) {
 const app=useApp(),status=useBusinessStatus(),input=useRef<HTMLInputElement>(null);
 const [rows,setRows]=useState<ProfileImportRow[]>([]),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[finished,setFinished]=useState(false),[filename,setFilename]=useState('');
 const lock=useRef(false);
 const sources={categories:app.teachingCategories,subjects:app.subjects,models:app.models,levels:app.levels,students:app.students,teachers:app.teachers,emails:app.users.map(u=>u.email)};
 const unavailable=disabled||status.loading||status.saving||busy||!status.loadedAt;
 const label=kind==='students'?'học sinh':'giáo viên';
 const download=()=>{try{downloadProfileExcel(profileTemplate(kind,sources));app.showToast('Đã tải mẫu Excel '+label+'.','success');}catch(e){app.showToast((e as Error).message,'error');}};
 const read=async(file:File)=>{
  if(lock.current)return;lock.current=true;setBusy(true);
  try{
   if(!/\.xlsx$/i.test(file.name))throw new Error('Vui lòng dùng file Excel .xlsx theo mẫu.');
   if(file.size>5*1024*1024)throw new Error('File tối đa 5 MB.');
   const checked=validateProfileRows(kind,await xlsxRows(await file.arrayBuffer(),true),sources);
   setRows(checked);setFinished(false);setFilename(file.name);setOpen(true);
   const errors=checked.filter(r=>r.errors.length).length;
   app.showToast(errors?`Có ${errors} dòng lỗi. Sửa file rồi chọn lại để nhập.`:`Đã kiểm tra ${checked.length} hồ sơ. Xem trước và xác nhận để lưu.`,errors?'error':'info');
  }catch(e){app.showToast((e as Error).message,'error');}
  finally{lock.current=false;setBusy(false);if(input.current)input.current.value='';}
 };
 const save=async()=>{
  if(lock.current||disabled||finished||rows.some(r=>r.errors.length))return;
  lock.current=true;setBusy(true);
  const result=rows.map(r=>({...r}));let success=0;
  try{
   await waitForBusinessSave();
   // Re-check against the latest visible source before any server mutation.
   const checked=validateProfileRows(kind,[profileHeaders[kind],...rows.map(r=>r.values)],sources);
   if(checked.some(r=>r.errors.length))throw new Error('Dữ liệu hoặc danh mục đã thay đổi. Chọn lại file để kiểm tra trước khi lưu.');
   for(const row of result){
    try{
     const v=row.values;
     if(kind==='teachers'){
      const credentials=await app.createTeacherWithAccount(importedTeacher(v,sources));
      if(!credentials)throw new Error('Không tạo được hồ sơ/tài khoản. Xem thông báo lỗi; kiểm tra lại danh sách trước khi nhập lại.');
      Object.assign(row,credentials);
     }else{
      row.id='HS-'+randomUUID();
      await teacherSessionRequest('vuihoc_save_business',{p_changes:[{dataset:'students',before:null,after:importedStudent(v,row.id)}]});
     }
     row.saved=true;row.result='Thành công';success++;
    }catch(e){row.result=(e as Error).message;row.saved=false;}
    setRows(result.map(r=>({...r})));
   }
   setFinished(true);
   await loadBusinessData();
   if(kind==='teachers'&&success)await refreshAccountSession();
   app.showToast(`Đã lưu ${success}/${result.length} hồ sơ ${label}.${success<result.length?' Có dòng lỗi, xem và tải kết quả nhập.':''}`,success===result.length?'success':'error');
  }catch(e){app.showToast((e as Error).message,'error');}
  finally{lock.current=false;setBusy(false);}
 };
 const exportResults=()=>{
  try{downloadProfileExcel({filename:`Ket-qua-nhap-${kind}.xlsx`,sheets:[{name:'Ket qua',columnWidths:[10,32,22,26,24,70],rows:[['Dòng','Họ tên','Mã hồ sơ','Tên đăng nhập','Mật khẩu ban đầu','Kết quả'],...rows.map(r=>[r.row,r.values[0],r.saved?r.id||'':'',r.username||'',r.password||'',r.result||r.errors.join('; ')])]}]});}
  catch(e){app.showToast((e as Error).message,'error');}
 };
 const button='rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold disabled:opacity-50';
 return <>
  <button type="button" className={button} disabled={unavailable} onClick={download}>Tải mẫu Excel</button>
  <button type="button" className={button} disabled={unavailable} onClick={()=>input.current?.click()}>{busy?'Đang xử lý…':'Nhập Excel'}</button>
  <input ref={input} type="file" accept=".xlsx" className="hidden" aria-label={`Chọn Excel hồ sơ ${label}`} onChange={e=>{const file=e.target.files?.[0];if(file)void read(file);}} />
  {open&&<div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-labelledby={`import-${kind}-title`}>
   <div className="flex max-h-[90vh] w-full max-w-6xl flex-col gap-3 rounded-2xl bg-white p-5 shadow-xl">
    <h3 id={`import-${kind}-title`} className="font-bold">Nhập hồ sơ {label} từ Excel</h3>
    <p className="text-sm text-slate-600">{filename} — {rows.length} hồ sơ. {kind==='students'?'Có chọn môn thì tạo đăng ký chờ xếp lớp; để trống thì chỉ tạo hồ sơ. Lịch học và xếp lớp cập nhật sau.':'Tự tạo mã giáo viên và tài khoản đăng nhập cho từng hồ sơ thành công.'}</p>
    <p role="status" aria-live="polite" className="text-sm">{finished?`Kết quả: ${rows.filter(r=>r.saved).length} thành công, ${rows.filter(r=>!r.saved).length} lỗi.`:busy?'Đang lưu vào hệ thống…':rows.some(r=>r.errors.length)?'File có lỗi. Đóng và sửa file, sau đó nhập lại.':'Dữ liệu hợp lệ. Nhấn xác nhận để lưu.'}</p>
    <div className="overflow-auto"><table className="w-full text-left text-xs"><thead><tr><th className="p-2">Dòng</th>{profileHeaders[kind].map(h=><th key={h} className="p-2">{h}</th>)}<th className="p-2">Kiểm tra / kết quả</th></tr></thead><tbody>{rows.map(r=><tr key={r.row} className="border-t"><td className="p-2">{r.row}</td>{r.values.map((v,i)=><td key={i} className="p-2">{v}</td>)}<td className={`p-2 ${r.errors.length||r.saved===false?'text-red-700':'text-green-700'}`}>{r.errors.join('; ')||r.result||'Hợp lệ'}{r.username&&<div>Tài khoản: {r.username}</div>}</td></tr>)}</tbody></table></div>
    {finished&&kind==='teachers'&&rows.some(r=>r.saved)&&<p className="text-sm text-orange-700">Tải kết quả nhập để nhận mật khẩu ban đầu trước khi đóng màn hình này.</p>}
    <div className="flex flex-wrap justify-end gap-2"><button type="button" className={button} disabled={busy} onClick={()=>{setOpen(false);setRows([]);}}>Đóng</button>{finished&&<button type="button" className={button} onClick={exportResults}>Tải kết quả nhập</button>}{!finished&&<button type="button" className={button+' bg-orange-600 text-white'} disabled={busy||disabled||status.saving||rows.some(r=>r.errors.length)} onClick={()=>void save()}>Xác nhận nhập {rows.length} hồ sơ</button>}</div>
   </div>
  </div>}
 </>;
}
