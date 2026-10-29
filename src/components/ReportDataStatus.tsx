import {loadBusinessData, useBusinessStatus} from '../lib/businessPersistence';

type Status = Pick<ReturnType<typeof useBusinessStatus>, 'loading' | 'saving' | 'error' | 'loadedAt' | 'refreshError' | 'errorOperation'>;

export function ReportDataStatusContent({status, showSuccess = true, onRetry}: {status: Status; showSuccess?: boolean; onRetry: () => void}) {
 const {loading, saving, error, loadedAt, refreshError, errorOperation} = status;
 const problem = error || refreshError;
 if (!showSuccess && loadedAt && !loading && !saving && !problem) return null;
 const saveFailed = Boolean(error && errorOperation === 'save');
 const updated = loadedAt ? new Date(loadedAt).toLocaleString('vi-VN', {timeZone:'Asia/Bangkok'}) : '';
 return <div role="status" className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs ${problem ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
  <div className="min-w-0 space-y-1">
   <p>{loading ? 'Đang tải lại dữ liệu báo cáo…' : saving ? 'Đang lưu thay đổi. Số liệu chưa được xác nhận.' : problem
    ? `${saveFailed ? 'Chưa lưu được thay đổi' : 'Chưa tải được dữ liệu mới'}: ${problem}`
    : loadedAt ? `Dữ liệu đã cập nhật lúc ${updated}.` : 'Chưa tải được dữ liệu báo cáo; chưa thể kết luận số liệu bằng 0.'}</p>
   {(problem || loading || saving) && <p>{loadedAt
    ? `Lần cập nhật thành công gần nhất: ${updated}. ${saving ? 'Thay đổi đang chờ lưu.' : 'Số liệu có thể chưa phản ánh thay đổi mới nhất.'}`
    : 'Chưa có lần tải thành công để đối chiếu số liệu.'}</p>}
   {saveFailed && !loading && !saving && <p>Tải lại chỉ lấy dữ liệu đã lưu trên hệ thống; bạn cần thực hiện lại thay đổi chưa lưu.</p>}
  </div>
  {problem && <button type="button" disabled={loading || saving} onClick={onRetry}
   className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 font-semibold hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-50">{loading ? 'Đang tải…' : 'Thử tải lại'}</button>}
 </div>;
}

export function ReportDataStatus({showSuccess = true}: {showSuccess?: boolean}) {
 const status = useBusinessStatus();
 return <ReportDataStatusContent status={status} showSuccess={showSuccess} onRetry={() => void loadBusinessData()} />;
}
