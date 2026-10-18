import {useBusinessStatus} from '../lib/businessPersistence';

export function ReportDataStatus(){
 const {loading,saving,error,loadedAt,refreshError}=useBusinessStatus();
 const problem=error||refreshError;
 return <div role="status" className={`rounded-xl border px-3 py-2 text-[11px] ${problem?'border-amber-200 bg-amber-50 text-amber-800':'border-slate-200 bg-slate-50 text-slate-600'}`}>
  {loading?'Đang tải dữ liệu nghiệp vụ…':saving?'Đang lưu thay đổi. Số liệu sẽ được xác nhận sau khi lưu xong.':problem?`Chưa cập nhật được dữ liệu: ${problem}${loadedAt?' Đang hiển thị lần tải thành công gần nhất.':''}`:loadedAt?`Dữ liệu nghiệp vụ đã tải · Cập nhật ${new Date(loadedAt).toLocaleString('vi-VN',{timeZone:'Asia/Bangkok'})}`:'Chưa tải được dữ liệu nghiệp vụ; chưa thể kết luận số liệu bằng 0.'}
 </div>;
}
