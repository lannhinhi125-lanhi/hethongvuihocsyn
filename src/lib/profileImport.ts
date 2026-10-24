import type { CategoryGroup } from '../components/CategoryMultiFilter';
import type { SubjectItem, ClassModelItem, LevelItem, StudentRecord, TeacherProfile } from '../types';
import { reportExcelBytes, type ReportExcelData } from './reportExcel';
export type ProfileImportKind = 'students' | 'teachers';
export interface ProfileImportSources {
 categories: CategoryGroup[]; subjects: SubjectItem[]; models: ClassModelItem[]; levels: LevelItem[];
 students: StudentRecord[]; teachers: TeacherProfile[]; emails: string[];
}
export const profileHeaders = {
 students:['Họ tên học sinh','Mã khối','Họ tên cha','Số điện thoại cha','Họ tên mẹ','Số điện thoại mẹ','Mã cấp học','Mã môn (tùy chọn)','Mã trình độ (khi chọn môn)','Mã mô hình (khi chọn môn)'],
 teachers:['Họ tên giáo viên','Email','Số điện thoại','Mã môn','Mã cấp học','Mã khối (phân cách ;)','Mã mô hình (phân cách ;)','Bằng cấp']
};
export interface ProfileImportRow { row: number; values: string[]; errors: string[]; id?: string; username?: string; password?: string; result?: string; saved?: boolean }
const normalize=(s:string)=>s.normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('vi');
const phone=(s:string)=>s.replace(/[\s.()-]/g,'');
const codes=(s:string)=>s.split(';').map(x=>x.trim()).filter(Boolean);
export function activeImportCategories(s:ProfileImportSources) {return s.categories.filter(c=>c.status!==false);}
export function validateProfileRows(kind:ProfileImportKind, rows:string[][], s:ProfileImportSources):ProfileImportRow[] {
 const expected=profileHeaders[kind];
 if(expected.some((h,i)=>normalize(rows[0]?.[i]||'')!==normalize(h)) || (rows[0]?.slice(expected.length).some(Boolean)))throw new Error('Tiêu đề không đúng. Hãy tải mẫu mới và giữ nguyên hàng tiêu đề, thứ tự cột.');
 const input=Array.from(rows, (values,i)=>({row:i+1,values:expected.map((_,j)=>String(values?.[j]||'').trim()),extra:values?.slice(expected.length).some(Boolean)})).slice(1).filter(x=>x.values.some(Boolean)||x.extra);
 if(!input.length)throw new Error('File chưa có hồ sơ. Điền dữ liệu vào sheet đầu tiên, từ dòng 2.');
 if(input.length>200)throw new Error('Mỗi lần nhập tối đa 200 hồ sơ.');
 const seen=new Set<string>(), cats=activeImportCategories(s);
 return input.map(({row,values:v,extra})=>{
  const errors:string[]=[];if(extra)errors.push('Có dữ liệu ngoài các cột của mẫu.');
  if(!v[0])errors.push('Thiếu họ tên.');if(v.some(x=>x.length>500))errors.push('Mỗi ô tối đa 500 ký tự.');
  if(kind==='students'){
   const category=cats.find(c=>c.id===v[6]);
   if(!category)errors.push('Mã cấp học không thuộc danh mục đang hoạt động.');
   if(!category?.options.some(o=>o.id===v[1]&&!category.options.some(child=>child.parentId===o.id)))errors.push('Mã khối phải thuộc cấp học đã chọn.');
   if(v[7]||v[8]||v[9]){
    if(!s.subjects.some(x=>x.status&&x.code===v[7]))errors.push('Mã môn không hoạt động hoặc không tồn tại.');
    if(!s.levels.some(x=>x.status&&x.code===v[8]))errors.push('Chọn mã trình độ đang hoạt động khi đăng ký môn.');
    if(!s.models.some(x=>x.status&&x.code===v[9]))errors.push('Chọn mã mô hình đang hoạt động khi đăng ký môn.');
   }
   if(!v[3]&&!v[5])errors.push('Cần số điện thoại cha hoặc mẹ.');
   for(const i of [3,5]){v[i]=phone(v[i]);if(v[i]&&!/^(0\d{8,10}|\+\d{9,14})$/.test(v[i]))errors.push(`Số điện thoại ${i===3?'cha':'mẹ'} không hợp lệ; giữ số 0 đầu.`);}
   const keys=[v[3],v[5]].filter(Boolean).map(p=>JSON.stringify([normalize(v[0]),p]));
   if(keys.some(key=>seen.has(key))||s.students.some(p=>normalize(p.name)===normalize(v[0])&&[p.fatherPhone,p.motherPhone].some(p=>p&&[v[3],v[5]].includes(phone(p)))))errors.push('Hồ sơ trùng họ tên và số liên hệ trong file hoặc hệ thống.');
   keys.forEach(key=>seen.add(key));
  }else{
   v[1]=v[1].toLowerCase();v[2]=phone(v[2]);
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v[1]))errors.push('Email không hợp lệ.');
   if(seen.has(v[1])||s.emails.some(e=>e?.trim().toLowerCase()===v[1])||s.teachers.some(t=>t.email?.toLowerCase()===v[1]))errors.push('Email trùng trong file hoặc đã được sử dụng.');seen.add(v[1]);
   if(v[2]&&!/^(0\d{8,10}|\+\d{9,14})$/.test(v[2]))errors.push('Số điện thoại không hợp lệ; giữ số 0 đầu.');
   if(!s.subjects.some(x=>x.status&&x.code===v[3]))errors.push('Mã môn không hoạt động hoặc không tồn tại.');
   const cat=cats.find(c=>c.id===v[4]);if(!cat)errors.push('Mã cấp học không hoạt động hoặc không tồn tại.');
   const grades=codes(v[5]), models=codes(v[6]);
   if(!grades.length||grades.some(id=>!cat?.options.some(o=>o.id===id&&!cat.options.some(child=>child.parentId===id)))||new Set(grades).size!==grades.length)errors.push('Cần ít nhất một mã khối hợp lệ thuộc cấp học; không lặp mã.');
   if(!models.length||models.some(code=>!s.models.some(m=>m.status&&m.code===code))||new Set(models).size!==models.length)errors.push('Cần ít nhất một mã mô hình đang hoạt động; không lặp mã.');
  }
  return {row,values:v,errors};
 });
}
export function importedTeacher(v:string[],s:ProfileImportSources):Omit<TeacherProfile,'id'|'username'|'passwordRaw'> {
 return {name:v[0],email:v[1],phone:v[2],subject:v[3],subjectName:s.subjects.find(x=>x.code===v[3])?.name||'',levelId:v[4],levelName:s.categories.find(x=>x.id===v[4])?.name||'',grades:codes(v[5]),models:codes(v[6]),degree:v[7],status:'CHO_LOP',statusLabel:'Chờ lớp',evalStatus:'UNSCORED',evalScore:null,evalComment:'',freeSlots:0,busySlots:0,isFull:false,successfulSessions:[],schedule:{}};
}
export function importedStudent(v:string[],id:string) {
 return {madinhdanh:id,hoten:v[0],khoi:v[1],macaphoc:v[6],hotencha:v[2],sodienthoaicha:v[3],hotenme:v[4],sodienthoaime:v[5],
  ...(v[7]?{dangkymonhoc:[{subject:v[7],level:v[8],model:v[9],status:'CHO_XEP_LOP',scheduleSlots:[],currentClassCode:null}]}:{})};
}
export function profileTemplate(kind:ProfileImportKind,s:ProfileImportSources):ReportExcelData {
 const cats=activeImportCategories(s);
 const catalog=[['Loại','Mã','Tên','Mã cấp học'],...cats.flatMap(c=>[
  ['Cấp học',c.id,c.name,''],...c.options.filter(o=>!c.options.some(child=>child.parentId===o.id)).map(o=>['Khối',o.id,o.label,c.id])
 ]),...s.subjects.filter(x=>x.status).map(x=>['Môn',x.code,x.name,'']),...s.models.filter(x=>x.status).map(x=>['Mô hình',x.code,x.name,'']),...(kind==='students'?s.levels.filter(x=>x.status).map(x=>['Trình độ',x.code,x.name,'']):[])];
 return {filename:kind==='students'?'Mau-ho-so-hoc-sinh.xlsx':'Mau-ho-so-giao-vien.xlsx',sheets:[
  {name:'Nhap ho so',rows:[profileHeaders[kind]],columnWidths:profileHeaders[kind].map(()=>28)},
  {name:'Huong dan',columnWidths:[110],rows:[['HƯỚNG DẪN NHẬP HỒ SƠ'],['Điền sheet Nhap ho so từ dòng 2. Không đổi tên, thứ tự cột hoặc dùng công thức.'],['Mỗi file tối đa 200 hồ sơ, 5 MB. Số điện thoại nhập dạng văn bản để giữ số 0 đầu.'],['Tra mã ở sheet Danh muc; danh mục lấy từ hệ thống tại thời điểm tải mẫu.'],[kind==='teachers'?'Bắt buộc họ tên, email duy nhất, mã môn, cấp học, khối và mô hình. Nhiều mã ngăn bằng dấu ;.':'Bắt buộc họ tên, mã cấp học, mã khối thuộc cấp học và ít nhất số điện thoại cha hoặc mẹ.'],[kind==='teachers'?'Mỗi hồ sơ hợp lệ sẽ tự tạo tài khoản. Tải kết quả nhập để nhận tên đăng nhập và mật khẩu ban đầu.':'Có thể để trống môn/trình độ/mô hình để chỉ tạo hồ sơ. Chọn môn thì điền đủ trình độ và mô hình: tạo đăng ký chờ xếp lớp, chưa có lịch học; cập nhật lịch trên hệ thống. Không tự động xếp lớp.'],['Màn hình kiểm tra toàn bộ file trước khi cho lưu. Nếu lỗi khi lưu, xem kết quả từng dòng; không nhập lại các hồ sơ đã thành công.']]},
  {name:'Danh muc',rows:catalog,columnWidths:[18,28,40,28]}
 ]};
}
export function downloadProfileExcel(data:ReportExcelData) {
 const url=URL.createObjectURL(new Blob([reportExcelBytes(data)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
 const a=document.createElement('a');a.href=url;a.download=data.filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
