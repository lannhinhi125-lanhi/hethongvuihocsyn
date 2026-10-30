import type { DocumentSection, ReportDocumentOptions } from './reportDocument';
import { reportFilterLabel, reportFilterValues, type ReportResult } from './customReports';
import { alignComparisonRows, comparisonRange, defaultComparison } from './reportComparison';

export type ExcelCell = string | number | null;
export interface ReportExcelSheet {
  name: string; rows: ExcelCell[][]; columnWidths?: number[]; autoFilter?: boolean;
  /** Zero-based row indices; defaults preserve the existing table-only exports. */
  headerRow?: number; freezeRows?: number; titleRows?: number[]; sectionRows?: number[]; totalRows?: number[];
  mergedRanges?: string[]; rowHeights?: Record<number, number>; hideGridLines?: boolean;
}
export interface ReportExcelData { sheets: ReportExcelSheet[]; filename: string }

/** Capture the same computed results as the preview, without requerying on download. */
export function reportExcelData(sections: DocumentSection[], info: ReportDocumentOptions): ReportExcelData {
  const exportedAt = info.exportedAt || new Date().toLocaleString('vi-VN', {timeZone:'Asia/Bangkok'});
  const exportedBy = info.exportedBy || info.author;
  const overview: ReportExcelSheet = {name:'Tổng quan',autoFilter:false,freezeRows:0,headerRow:-1,
    columnWidths:[36,48,28,28],titleRows:[0,1],sectionRows:[],totalRows:[],mergedRanges:['A1:D1','A2:D2'],hideGridLines:true,rows:[
    [info.organization || 'Báo cáo hệ thống'],[info.title],[],
    ...(info.reportNumber ? [['Số báo cáo',info.reportNumber]] : []),
    ...(info.address ? [['Địa chỉ',info.address]] : []), ...(info.reportType ? [['Loại báo cáo',info.reportType]] : []),
    ['Phát hành', info.circulation === 'external' ? 'Báo cáo gửi bên ngoài' : 'Báo cáo nội bộ'],
    ['Ngày lập', info.date], ['Người lập', info.author], ['Người kết xuất', exportedBy], ['Thời điểm kết xuất', exportedAt], ['Dữ liệu cập nhật', info.updatedAt],
    ['Ghi chú', 'Số liệu tại thời điểm kết xuất. Ô trống là thiếu số liệu, không phải bằng 0. Tỷ lệ ghi theo đơn vị %.'],
    ...(info.remarks ? [['Nhận xét',info.remarks]] : []), ...(info.recommendations ? [['Kiến nghị',info.recommendations]] : [])
  ]};
  const sheets: ReportExcelSheet[] = [overview];
  const meta = (label:string,value:ExcelCell) => {
    if(typeof value!=='number')overview.mergedRanges!.push(`B${overview.rows.length+1}:D${overview.rows.length+1}`);
    overview.rows.push([label,value]);
  };
  overview.rows.forEach((row,index)=>{if(row.length===2)overview.mergedRanges!.push(`B${index+1}:D${index+1}`);});
  sections.forEach(({ dataset, config, result, previous }, index) => {
    const prefix = `${index + 1}`;
    const metricLabel = (id: string, label: string) => result.metrics.find(metric => metric.id === id)?.format === 'percent' ? label + ' (%)' : label;
    const filters = Object.entries(config.filters).filter(([, value]) => reportFilterValues(value).length)
      .map(([id, value]) => `${dataset.filters.find(field => field.id === id)?.label || id}: ${reportFilterLabel(dataset.filters.find(field => field.id === id), value)}`).join('; ');
    const period = (data:ReportResult) => dataset.dateKind==='snapshot' ? 'Số liệu hiện có' : !data.range.from && !data.range.to ? 'Toàn bộ thời gian' : `${data.range.from || 'Từ đầu'} — ${data.range.to || 'Hiện có'}`;
    overview.rows.push([]);
    overview.sectionRows!.push(overview.rows.length);
    overview.mergedRanges!.push(`A${overview.rows.length+1}:D${overview.rows.length+1}`);
    overview.rows.push([`${prefix}. ${dataset.label}`]);
    meta('Kỳ báo cáo',period(result));
    meta('Xem theo',dataset.dimensions.find(field=>field.id===config.groupBy)?.label || 'Tất cả');
    meta('Bộ lọc',filters || 'Tất cả');
    meta('Nhóm được chọn',config.selection ? result.rows[0]?.label || config.selection.key : 'Tất cả');
    meta('Số bản ghi nguồn',result.records.length);
    if(previous)meta('Kỳ đối chiếu',period(previous));
    overview.sectionRows!.push(overview.rows.length);
    overview.rows.push(previous ? ['Chỉ số','Kết quả','Đối chiếu','Chênh lệch'] : ['Chỉ số','Kết quả']);
    for(const metric of result.metrics){
      const current=result.totals[metric.id],prior=previous?.totals[metric.id];
      overview.rows.push([metricLabel(metric.id,metric.label),current,...(previous?[prior??null,current==null||prior==null?null:current-prior]:[])]);
    }
    if(previous&&result.metrics.some(metric=>metric.format==='percent'))meta('Đơn vị chênh lệch','Chênh lệch của chỉ số tỷ lệ tính bằng điểm phần trăm.');
    if(dataset.note)meta('Cách tính',dataset.note);
    if(dataset.nonAdditiveGroups?.includes(config.groupBy))meta('Lưu ý tổng hợp','Một bản ghi có thể thuộc nhiều nhóm. Tổng chung tính từ dữ liệu nguồn, không cộng các nhóm.');
    const addPeriod = (data: ReportResult, suffix: string) => {
      const headers = ['Nhóm', ...data.metrics.map(metric => metricLabel(metric.id, metric.label))];
      sheets.push({ name: `${prefix} Tổng hợp${suffix}`, totalRows:[1], rows: [headers, ['TỔNG', ...data.metrics.map(metric => data.totals[metric.id])],
        ...data.rows.map(row => [row.label, ...data.metrics.map(metric => row.values[metric.id])])] });
      // Export only declared report columns and calculation inputs, never hidden profile fields.
      const fields = [...dataset.detailFields];
      for (const metric of data.metrics) for (const id of [metric.field, metric.denominator]) {
        if (id && !id.startsWith('__') && !fields.some(field => field.id === id)) fields.push({ id, label: id === metric.field ? metric.label : 'Mẫu số: ' + metric.label });
      }
      const detailRows:ExcelCell[][]=[
        [info.organization || 'Báo cáo hệ thống'],[`${dataset.label} — Danh sách chi tiết${suffix}`],
        ['Kỳ báo cáo',period(data)],['Người kết xuất',exportedBy],['Thời điểm kết xuất',exportedAt],
        ['Dữ liệu cập nhật',info.updatedAt],['Bộ lọc',filters || 'Tất cả'],['Số bản ghi',data.records.length],
        ['Nhóm được chọn',config.selection ? data.rows[0]?.label || config.selection.key : 'Tất cả'],[],fields.map(field=>field.label),
        ...data.records.map(record=>fields.map(field=>record[field.id]??null))];
      const detailWidth=Math.max(2,fields.length),lastColumn=column(detailWidth-1);
      sheets.push({name:`${prefix} Chi tiết${suffix}`,rows:detailRows,headerRow:10,freezeRows:11,titleRows:[0,1],hideGridLines:true,
        columnWidths:fields.map((field,index)=>index===0?32:/tên|loại|nhóm|ghi chú|trạng thái/i.test(field.label)?34:24),
        mergedRanges:[`A1:${lastColumn}1`,`A2:${lastColumn}2`,...(detailWidth>2?[2,3,4,5,6,8].map(row=>`B${row+1}:${lastColumn}${row+1}`):[])]});
      if (dataset.id === 'incidents') {
        const events: ExcelCell[][] = [['Mã buổi', 'Ngày học', 'Mã sự cố', 'Mã danh mục', 'Loại sự cố', 'Mức độ', 'Trạng thái']];
        for (const record of data.records) {
          const selected = JSON.parse(String(record.__selectedEvents || '[]')) as Array<Record<string, string | boolean | undefined>>;
          // Scheduled breaks remain in the lesson list; they are not incident minutes.
          for (const event of selected.filter(event=>!event.catalogOnly)) events.push([record.code ?? record.id ?? '', String(record.date || ''), String(event.incidentCode || ''), String(event.categoryId || ''), String(event.incidentName || ''), String(event.urgency || ''), String(event.status || '')]);
        }
        sheets.push({ name: `${prefix} Sự cố${suffix}`, rows: events });
      }
    };
    addPeriod(result, '');
    if (previous) {
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
    ['xl/styles.xml', `<styleSheet xmlns="${ns}"><fonts count="4"><font><sz val="11"/><name val="Times New Roman"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Times New Roman"/></font><font><b/><sz val="14"/><color rgb="FF9A3412"/><name val="Times New Roman"/></font><font><b/><sz val="11"/><name val="Times New Roman"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFF5C00"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFEDD5"/></patternFill></fill></fills><borders count="2"><border/><border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="thin"><color rgb="FFCBD5E1"/></right><top style="thin"><color rgb="FFCBD5E1"/></top><bottom style="thin"><color rgb="FFCBD5E1"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="6"><xf fontId="0" fillId="0" borderId="1" applyBorder="1" xfId="0"><alignment vertical="top" wrapText="1"/></xf><xf fontId="1" fillId="2" borderId="1" applyBorder="1" xfId="0" applyFont="1" applyFill="1"><alignment vertical="center" wrapText="1"/></xf><xf fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"><alignment vertical="center" wrapText="1"/></xf><xf fontId="1" fillId="2" borderId="1" applyBorder="1" xfId="0" applyFont="1" applyFill="1"><alignment vertical="center" wrapText="1"/></xf><xf fontId="3" fillId="3" borderId="1" applyBorder="1" xfId="0" applyFont="1" applyFill="1"><alignment vertical="top" wrapText="1"/></xf><xf fontId="3" fillId="0" borderId="1" applyBorder="1" xfId="0" applyFont="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`]

  ];
  data.sheets.forEach((sheet, index) => {
    if (sheet.rows.length > 1048576 || sheet.rows.some(row => row.length > 16384)) throw new Error('Số liệu vượt giới hạn Excel. Hãy chọn kỳ báo cáo ngắn hơn.');
    const width = sheet.rows.reduce((max,row)=>Math.max(max,row.length),1);
    const headerRow=sheet.headerRow??0, freezeRows=sheet.freezeRows??Math.max(0,headerRow+1);
    const widths=Array.from({length:width},(_,i)=>sheet.columnWidths?.[i]??(index===0&&i===1?85:i===0?32:24));
    const mergedWidths=new Map<string,number>();
    for(const ref of sheet.mergedRanges||[]){
      const match=/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/.exec(ref);
      if(!match||match[2]!==match[4])throw new Error('Vùng gộp ô báo cáo không hợp lệ.');
      const colIndex=(value:string)=>[...value].reduce((total,char)=>total*26+char.charCodeAt(0)-64,0)-1;
      const from=colIndex(match[1]),to=colIndex(match[3]);
      mergedWidths.set(match[1]+match[2],widths.slice(from,to+1).reduce((total,value)=>total+value,0));
    }
    const rows=sheet.rows.map((row,r)=>{
      const style=sheet.titleRows?.includes(r)?2:sheet.sectionRows?.includes(r)?3:r===headerRow?1:sheet.totalRows?.includes(r)?4:0;
      const lines=row.reduce<number>((max,value,c)=>Math.max(max,...String(value??'').split('\n').map(line=>Math.ceil(line.length/Math.max(1,(mergedWidths.get(column(c)+(r+1))??widths[c])*0.9)))) ,1);
      const height=sheet.rowHeights?.[r]??Math.min(409,Math.max(style===2?28:22,lines*(style===2?20:16)+6));
      // Include empty cells so missing values never interrupt the table borders.
      // Deliberate spacer rows remain empty.
      const cells=Array.from({length:row.length ? width : 0},(_,c)=>{
        const value=row[c], ref=column(c)+(r+1);
        if(value==null)return `<c r="${ref}" s="${style}"/>`;
        return `<c r="${ref}" s="${style}"${typeof value==='number'&&Number.isFinite(value)?`><v>${value}</v>`:` t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is>`}</c>`;
      }).join('');
      return `<row r="${r+1}" ht="${height}" customHeight="1">${cells}</row>`;
    }).join('');
    const filter=(sheet.autoFilter??index>0)&&headerRow>=0&&sheet.rows.length>headerRow;
    files.push([`xl/worksheets/sheet${index+1}.xml`,`<worksheet xmlns="${ns}"><dimension ref="A1:${column(width-1)}${Math.max(1,sheet.rows.length)}"/><sheetViews><sheetView workbookViewId="0"${sheet.hideGridLines?' showGridLines="0"':''}>${freezeRows?`<pane ySplit="${freezeRows}" topLeftCell="A${freezeRows+1}" activePane="bottomLeft" state="frozen"/>`:''}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="22"/><cols>${widths.map((value,i)=>`<col min="${i+1}" max="${i+1}" width="${value}" customWidth="1"/>`).join('')}</cols><sheetData>${rows}</sheetData>${filter?`<autoFilter ref="A${headerRow+1}:${column(width-1)}${sheet.rows.length}"/>`:''}${sheet.mergedRanges?.length?`<mergeCells count="${sheet.mergedRanges.length}">${sheet.mergedRanges.map(ref=>`<mergeCell ref="${ref}"/>`).join('')}</mergeCells>`:''}</worksheet>`]);
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
