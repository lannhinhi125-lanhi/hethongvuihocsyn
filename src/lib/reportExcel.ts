import type { DocumentSection, ReportDocumentOptions } from './reportDocument';
import { reportFilterLabel, reportFilterValues, type ReportResult } from './customReports';
import { alignComparisonRows, comparisonRange, defaultComparison } from './reportComparison';

export type ExcelCell = string | number | null;
export interface ReportExcelSheet { name: string; rows: ExcelCell[][]; columnWidths?: number[]; autoFilter?: boolean }
export interface ReportExcelData { sheets: ReportExcelSheet[]; filename: string }

/** Capture the same computed results as the preview, without requerying on download. */
export function reportExcelData(sections: DocumentSection[], info: ReportDocumentOptions): ReportExcelData {
  const sheets: ReportExcelSheet[] = [{ name: 'Thông tin báo cáo', rows: [
    ['Thông tin', 'Giá trị'], ['Tên báo cáo', info.title], ['Số báo cáo', info.reportNumber || 'Chưa cấp số'],
    ['Đơn vị', info.organization], ['Địa chỉ', info.address || ''], ['Loại báo cáo', info.reportType || ''],
    ['Phát hành', info.circulation === 'external' ? 'Báo cáo gửi bên ngoài' : 'Báo cáo nội bộ'],
    ['Ngày lập', info.date], ['Người lập', info.author], ['Dữ liệu cập nhật', info.updatedAt],
    ['Ghi chú', 'Số liệu chụp cùng bản xem trước. Ô trống là thiếu số liệu, không phải bằng 0. Tỷ lệ ghi theo đơn vị %.'],
    ['Nhận xét', info.remarks], ['Kiến nghị', info.recommendations]
  ] }];
  sections.forEach(({ dataset, config, result, previous }, index) => {
    const prefix = `${index + 1}`;
    const metricLabel = (id: string, label: string) => result.metrics.find(metric => metric.id === id)?.format === 'percent' ? label + ' (%)' : label;
    const filters = Object.entries(config.filters).filter(([, value]) => reportFilterValues(value).length)
      .map(([id, value]) => `${dataset.filters.find(field => field.id === id)?.label || id}: ${reportFilterLabel(dataset.filters.find(field => field.id === id), value)}`).join('; ');
    sheets[0].rows.push([`Nội dung ${prefix}`, dataset.label], [`Kỳ ${prefix}`, `${result.range.from || 'Từ đầu'} — ${result.range.to || 'Hiện có'}`],
      [`Xem theo ${prefix}`, dataset.dimensions.find(field => field.id === config.groupBy)?.label || 'Tất cả'],
      [`Bộ lọc ${prefix}`, filters || 'Tất cả'], [`Nhóm từ biểu đồ ${prefix}`, config.selection ? result.rows[0]?.label || config.selection.key : 'Tất cả'], [`Phương pháp ${prefix}`, dataset.note || '']);
    const addPeriod = (data: ReportResult, suffix: string) => {
      const headers = ['Nhóm', ...data.metrics.map(metric => metricLabel(metric.id, metric.label))];
      sheets.push({ name: `${prefix} Tổng hợp${suffix}`, rows: [headers, ['TỔNG', ...data.metrics.map(metric => data.totals[metric.id])],
        ...data.rows.map(row => [row.label, ...data.metrics.map(metric => row.values[metric.id])])] });
      // Export only declared report columns and calculation inputs, never hidden profile fields.
      const fields = [...dataset.detailFields];
      for (const metric of data.metrics) for (const id of [metric.field, metric.denominator]) {
        if (id && !id.startsWith('__') && !fields.some(field => field.id === id)) fields.push({ id, label: id === metric.field ? metric.label : 'Mẫu số: ' + metric.label });
      }
      sheets.push({ name: `${prefix} Chi tiết${suffix}`, rows: [fields.map(field => field.label),
        ...data.records.map(record => fields.map(field => record[field.id] ?? null))] });
      if (dataset.id === 'incidents') {
        const events: ExcelCell[][] = [['Mã buổi', 'Ngày học', 'Mã sự cố', 'Mã danh mục', 'Loại sự cố', 'Mức độ', 'Trạng thái']];
        for (const record of data.records) {
          const selected = JSON.parse(String(record.__selectedEvents || '[]')) as Array<Record<string, string | undefined>>;
          for (const event of selected) events.push([record.code ?? record.id ?? '', String(record.date || ''), event.incidentCode || '', event.categoryId || '', event.incidentName || '', event.urgency || '', event.status || '']);
        }
        sheets.push({ name: `${prefix} Sự cố${suffix}`, rows: events });
      }
    };
    addPeriod(result, '');
    if (previous) {
      sheets[0].rows.push([`Kỳ đối chiếu ${prefix}`, `${previous.range.from} — ${previous.range.to}`]);
      addPeriod(previous, ' đối chiếu');
      const currentRange = { start: result.range.from, end: result.range.to };
      const previousRange = comparisonRange(currentRange, config.comparison || defaultComparison);
      const aligned = alignComparisonRows(result.rows, previous.rows, result.metrics, currentRange, previousRange, config.groupBy);
      sheets.push({ name: `${prefix} So sánh`, rows: [
        ['Nhóm', ...result.metrics.flatMap(metric => [metricLabel(metric.id, metric.label) + ' hiện tại', metric.label + ' đối chiếu', metric.label + ' chênh lệch'])],
        ...aligned.map(row => [row.label, ...result.metrics.flatMap(metric => {
          const current = row.current[metric.id], prior = row.previous[metric.id];
          return [current, prior, current == null || prior == null ? null : current - prior];
        })])
      ] });
    }
  });
  return { sheets, filename: (info.reportNumber || info.title).replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').slice(0, 110).replace(/[. ]+$/, '') + '-so-lieu.xlsx' };
}

const xml = (value: unknown) => String(value ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]!));
const column = (index: number): string => index < 26 ? String.fromCharCode(65 + index) : column(Math.floor(index / 26) - 1) + String.fromCharCode(65 + index % 26);
const encoder = new TextEncoder();
const crcTable = Array.from({ length: 256 }, (_, index) => { let crc = index; for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1; return crc >>> 0; });

/** Small, dependency-free OOXML writer. Text cells are literal strings, never formulas. */
export function reportExcelBytes(data: ReportExcelData): Uint8Array<ArrayBuffer> {
  const ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const files: Array<[string, string]> = [
    ['[Content_Types].xml', `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${data.sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`],
    ['_rels/.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ['xl/workbook.xml', `<workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${data.sheets.map((sheet, i) => `<sheet name="${xml(sheet.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels', `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${data.sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${data.sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml', `<styleSheet xmlns="${ns}"><fonts count="2"><font><sz val="11"/><name val="Times New Roman"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Times New Roman"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFF5C00"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf fontId="0" fillId="0" borderId="0" xfId="0"><alignment vertical="top" wrapText="1"/></xf><xf fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`]
  ];
  data.sheets.forEach((sheet, index) => {
    if (sheet.rows.length > 1048576 || sheet.rows.some(row => row.length > 16384)) throw new Error('Số liệu vượt giới hạn Excel. Hãy chọn kỳ báo cáo ngắn hơn.');
    const width = Math.max(1, ...sheet.rows.slice(0, 1).map(row => row.length));
    files.push([`xl/worksheets/sheet${index + 1}.xml`, `<worksheet xmlns="${ns}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${Array.from({ length: width }, (_, i) => `<col min="${i + 1}" max="${i + 1}" width="${sheet.columnWidths?.[i] ?? (index === 0 && i === 1 ? 85 : i === 0 ? 32 : 24)}" customWidth="1"/>`).join('')}</cols><sheetData>${sheet.rows.map((row, r) => `<row r="${r + 1}">${row.map((value, c) => value == null ? '' : `<c r="${column(c)}${r + 1}" s="${r === 0 ? 1 : 0}"${typeof value === 'number' && Number.isFinite(value) ? `><v>${value}</v>` : ` t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is>`}</c>`).join('')}</row>`).join('')}</sheetData>${(sheet.autoFilter ?? index > 0) ? `<autoFilter ref="A1:${column(width - 1)}${sheet.rows.length}"/>` : ''}</worksheet>`]);
  });
  const parts: Uint8Array[] = [], directory: Uint8Array[] = [];
  let offset = 0;
  for (const [path, content] of files) {
    const name = encoder.encode(path), body = encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' + content);
    let crc = 0xffffffff; for (const byte of body) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8); crc = (crc ^ 0xffffffff) >>> 0;
    const header = new Uint8Array(30 + name.length), view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true); view.setUint16(4, 20, true); view.setUint16(12, 33, true); view.setUint32(14, crc, true); view.setUint32(18, body.length, true); view.setUint32(22, body.length, true); view.setUint16(26, name.length, true); header.set(name, 30);
    const entry = new Uint8Array(46 + name.length), ev = new DataView(entry.buffer);
    ev.setUint32(0, 0x02014b50, true); ev.setUint16(4, 20, true); ev.setUint16(6, 20, true); ev.setUint16(14, 33, true); ev.setUint32(16, crc, true); ev.setUint32(20, body.length, true); ev.setUint32(24, body.length, true); ev.setUint16(28, name.length, true); ev.setUint32(42, offset, true); entry.set(name, 46);
    parts.push(header, body); directory.push(entry); offset += header.length + body.length;
  }
  const size = directory.reduce((sum, entry) => sum + entry.length, 0), end = new Uint8Array(22), ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true); ev.setUint32(12, size, true); ev.setUint32(16, offset, true);
  const output = new Uint8Array(offset + size + 22); let cursor = 0;
  for (const part of [...parts, ...directory, end]) { output.set(part, cursor); cursor += part.length; }
  return output;
}
