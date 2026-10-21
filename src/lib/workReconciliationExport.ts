import {reportDocumentTypography} from './reportTypography';
import { workTeachingGroups, type WorkTeachingContext } from './workTeachingGroups';
﻿import type { TeacherPayrollSummary } from '../types';
import type { ReportExcelData } from './reportExcel';
import { escapeReportHtml } from './reportDocument';
import { vuihocReportLogo } from './reportBrand';

export { isIncidentWorkSession, workCreditBreakdown, workCreditText, staffReconcileLabel, workHandoffRows, workHandoffTotals, type WorkHandoffInfo } from './workCredits';
import { workCreditText, staffReconcileLabel, workHandoffRows, workHandoffTotals, type WorkHandoffInfo } from './workCredits';

export const workHandoffFilename = (month: string) => `Doi-soat-cong-${month}.xlsx`;

export function workHandoffExcel(staff: TeacherPayrollSummary[], info: WorkHandoffInfo, context: WorkTeachingContext = {}): ReportExcelData {
  const rows = workHandoffRows(staff);
  for (const person of rows) for (const session of person.sessions) {
    if (session.creditCoeff===null || !Number.isFinite(session.creditCoeff) || session.creditCoeff < 0) throw new Error('Có hệ số công không hợp lệ. Vui lòng kiểm tra trước khi bàn giao.');
  }
  const state = info.isLocked ? 'Đã khóa kỳ' : 'Chưa khóa kỳ';
  return { filename: workHandoffFilename(info.month), sheets: [
    { name: 'Tổng hợp công dạy giáo viên', autoFilter: true, columnWidths: [12, 20, 28, 22, 20, 24, 28, 22, 14, 14, 16, 16, 16, 24, 20], rows: [
      ['Kỳ công', 'Mã nhân sự', 'Họ và tên', 'Phân loại nhân sự', 'Môn học', 'Mô hình dạy', 'Chương trình / Trình độ', 'Cấp học', 'Buổi chuẩn', 'Buổi sự cố', 'Công chuẩn', 'Công sự cố', 'Tổng công', 'Trạng thái đối soát', 'Trạng thái kỳ công'],
      ...workTeachingGroups(staff, context).map(row => [info.month, row.teacherId, row.teacherName, row.staffRole === 'GIA_SU' ? 'Gia sư' : 'Giáo viên', row.subjectName,
        row.modelName, row.programName, row.categoryName, row.standardSessions, row.incidentSessions, row.standardCredit, row.incidentCredit, row.totalCredit, staffReconcileLabel(row.reconcileStatus), state])
    ] },
    { name: 'Thông tin bàn giao', autoFilter: false, columnWidths: [30, 90], rows: [
      ['Thông tin', 'Giá trị'], ['Đơn vị', info.organization], ['Địa chỉ', info.address], ['Số biên bản', info.reportNumber || 'Chưa cấp số'], ['Kỳ công', info.month], ['Phạm vi', info.scope], ['Người lập', info.author], ['Ngày lập', info.createdAt],
      ['Bộ phận tiếp nhận', info.receiver], ['Trạng thái kỳ', state], ['Thời điểm khóa kỳ', info.lockedAt || 'Chưa khóa'],
      ['Quy tắc', 'Buổi chuẩn gồm STANDARD và COVER (dạy thay). Các loại còn lại thuộc buổi sự cố; giữ nguyên hệ số đã đối soát, kể cả 0 công.'],
      ['Cách cộng', 'Công chuẩn/công sự cố là tổng hệ số các buổi tương ứng. Tổng công = công chuẩn + công sự cố. Đơn vị: công quy chuẩn; không phải số tiền.'],
      ['Sử dụng', 'Mỗi dòng công theo nhóm dạy phân bổ theo từng tổ hợp môn, mô hình, chương trình/trình độ, cấp học. Cộng các nhóm của cùng mã nhân sự để lấy tổng công trong kỳ. Trạng thái chưa khóa/chưa chốt được giữ nguyên, không tự coi là công đã duyệt.'],
      ['Nguồn phân nhóm', 'Mô hình ưu tiên giá trị lưu trong dòng công. Chương trình/trình độ và cấp học theo lớp liên kết hiện có; chưa phải bản chụp lịch sử danh mục tại ngày dạy.'],
      ['Thiếu dữ liệu', 'Thiếu liên kết lớp/danh mục thì ghi Chưa xác định, vẫn giữ nguyên số công; không suy đoán từ hồ sơ giáo viên.']
    ] }
  ] };
}

export function workHandoffDocument(staff: TeacherPayrollSummary[], info: WorkHandoffInfo): string {
  const esc = escapeReportHtml, total = workHandoffTotals(staff);
  const filename = workHandoffFilename(info.month);
  const signer = (role: string, name: string) => `<div><strong>${role}</strong><p><i>(Ký, ghi rõ họ tên)</i></p><div class="sign-space"></div><strong>${esc(name)}</strong></div>`;
  const metrics: Array<[string, string | number]> = [
    ['Tổng nhân sự bàn giao', `${total.staff} người`], ['Tổng số buổi dạy', `${total.sessions} buổi`],
    ['Buổi chuẩn (gồm dạy thay)', total.standardSessions], ['Buổi sự cố', total.incidentSessions],
    ['Công chuẩn', workCreditText(total.standardCredit)], ['Công sự cố', workCreditText(total.incidentCredit)],
    ['Tổng công ghi nhận', workCreditText(total.totalCredit)]
  ];
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Biên bản đối soát công ${esc(info.month)}</title><style>
@page{size:A4 portrait;margin:15mm 12mm 18mm;@bottom-right{content:"Trang " counter(page);font:9pt "Times New Roman",serif}}
*{box-sizing:border-box}body{margin:0;background:#e2e8f0;color:#111827;font:11pt/1.45 "Times New Roman",serif}main{width:210mm;min-height:297mm;margin:16px auto;padding:15mm 12mm;background:white}header{break-inside:avoid}.letterhead{display:flex;justify-content:space-between;gap:20px}.classification{text-align:right;font-size:10pt}.organization{font-weight:bold;text-transform:uppercase}img{display:block;width:142px;height:auto;margin:8px 0}h1{text-align:center;font-size:16pt;margin:16px 0 10px}p{margin:5px 0;overflow-wrap:anywhere}.meta{font-size:10pt;border-block:1px solid #cbd5e1;padding:8px 0;margin:10px 0}.notice{font-size:10pt;margin:10px 0}.summary{font-weight:bold;margin:10px 0}table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:8pt}th,td{border:1px solid #cbd5e1;padding:5px 4px;vertical-align:top;overflow-wrap:anywhere}th{background:#f1f5f9}thead{display:table-header-group}tr{break-inside:avoid}small{display:block;font-size:7.5pt;color:#475569}tfoot{display:table-row-group;font-weight:bold}h2{font-size:11pt;margin:12px 0 6px;break-after:avoid}.totals-table{font-size:10pt;margin-bottom:10px}.totals-table th{width:70%;text-align:left;font-weight:normal;background:white}.totals-table td{text-align:right}.totals-table tr:last-child{font-weight:bold;background:#f1f5f9}.totals-table tr:last-child th{font-weight:bold;background:#f1f5f9}.attachments{font-size:10pt;break-inside:avoid}.attachments a{color:inherit;text-decoration:none}.signatures{display:flex;justify-content:space-between;gap:12px;text-align:center;margin-top:20px;font-size:10pt;break-inside:avoid}.signatures>div{width:32%}.sign-space{height:60px}.footer{margin-top:16px;border-top:1px solid #cbd5e1;padding-top:6px;font-size:8pt;color:#475569}
@media print{body{background:white}main{width:auto;min-height:0;margin:0;padding:0}th,img{print-color-adjust:exact}}
${reportDocumentTypography}</style></head><body><main><section class="handoff-cover"><header><div class="letterhead"><div><p class="organization">${esc(info.organization)}</p><img src="${vuihocReportLogo}" alt="VUIHOC">${info.address ? `<p>${esc(info.address)}</p>` : ''}<p>Số: ${esc(info.reportNumber || 'Chưa cấp số')}</p></div><div class="classification"><strong>BIÊN BẢN NỘI BỘ</strong><p>Ngày lập: ${esc(info.createdAt)}</p></div></div><h1>BIÊN BẢN ĐỐI SOÁT VÀ BÀN GIAO CÔNG DẠY</h1><div class="meta"><p>Kỳ công: ${esc(info.month)}</p><p>Phạm vi: ${esc(info.scope)}</p><p>Bộ phận tiếp nhận: ${esc(info.receiver)}</p><p>Người lập: ${esc(info.author)}</p><p>Trạng thái kỳ: <strong>${info.isLocked ? 'Đã khóa kỳ' : 'Chưa khóa kỳ — số liệu có thể thay đổi'}</strong></p></div></header>
<p class="notice">Bàn giao số buổi và công quy chuẩn làm dữ liệu đầu vào cho bộ phận tính lương. Trạng thái đối soát của từng nhân sự được ghi trong file Excel kèm theo; biên bản không tự xác nhận các dòng chưa chốt công.</p>
<h2>1. Số liệu bàn giao</h2><table class="totals-table"><tbody>${metrics.map(([label, value]) => `<tr><th scope="row">${label}</th><td>${esc(value)}</td></tr>`).join('')}</tbody></table>
<section class="attachments"><h2>2. Tài liệu kèm theo</h2><p>File Excel: <strong>${esc(filename)}</strong>.</p><p>Gồm 2 trang tính: Tổng hợp công dạy giáo viên và Thông tin bàn giao. Tổng công đối chiếu: <strong>${workCreditText(total.totalCredit)}</strong> công; tổng số buổi: <strong>${total.sessions}</strong>.</p><p>Mỗi dòng Excel là công theo một tổ hợp môn, mô hình dạy, chương trình/trình độ và cấp học; cộng các nhóm cùng mã nhân sự để đối chiếu với số liệu tổng hợp trong biên bản.</p></section>
<p class="notice">Buổi chuẩn bao gồm dạy thay. Công được cộng theo hệ số đã ghi nhận; buổi 0 công vẫn có trong số buổi. Bên giao và bên nhận kiểm tra phạm vi, số nhân sự và tổng công trước khi ký xác nhận.</p>
<div class="signatures">${signer('NGƯỜI LẬP BIÊN BẢN', info.author)}${signer('VẬN HÀNH ĐÀO TẠO', info.operationsSigner)}${signer('BỘ PHẬN TIẾP NHẬN', info.receivingSigner)}</div><p class="footer">Số liệu trong phạm vi đã chọn tại thời điểm lập biên bản. Công quy chuẩn không phải số tiền lương.</p></section>
</main></body></html>`;
}
