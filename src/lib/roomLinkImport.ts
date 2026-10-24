export function parseCsv(text: string): string[][] {
  const firstLine = text.replace(/^\uFEFF/, '').split(/\r?\n/)[0];
  const delimiter = firstLine.includes(';') && !firstLine.includes(',') ? ';' : ',';
  const rows: string[][] = []; let row: string[] = [], cell = '', quoted = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else if (quoted || !cell) quoted = !quoted;
      else throw new Error('Dấu ngoặc kép trong CSV không hợp lệ.');
    } else if (!quoted && (char === delimiter || char === '\n' || char === '\r')) {
      row.push(cell); cell = '';
      if (char !== delimiter) { rows.push(row); row = []; if (char === '\r' && text[i + 1] === '\n') i++; }
    } else cell += char;
  }
  if (quoted) throw new Error('CSV thiếu dấu đóng ngoặc kép.');
  if (cell || row.length) rows.push([...row, cell]);
  return rows;
}

export function roomLinkUpdates(rows: string[][], classes: {code: string}[]) {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').trim().toLowerCase();
  const header = rows[0]?.map(normalize) || [];
  const codeColumn = header.findIndex(value => value === 'ma lop' || value === 'classcode');
  const linkColumn = header.findIndex(value => value.startsWith('link phong') || value === 'roomlink');
  if (codeColumn < 0 || linkColumn < 0) throw new Error('File cần có cột Mã lớp và Link phòng học.');
  const known = new Set(classes.map(item => item.code)), seen = new Set<string>();
  const updates: {classCode: string; roomLink: string}[] = [];
  rows.slice(1).forEach((row, index) => {
    const classCode = row[codeColumn]?.trim(), roomLink = row[linkColumn]?.trim();
    if (!roomLink) return;
    if (!classCode || !known.has(classCode)) throw new Error(`Dòng ${index + 2}: mã lớp không tồn tại.`);
    if (seen.has(classCode)) throw new Error(`Dòng ${index + 2}: mã lớp bị trùng.`);
    let url: URL;
    try { url = new URL(roomLink); } catch { throw new Error(`Dòng ${index + 2}: link phòng không hợp lệ.`); }
    if (!['https:', 'http:'].includes(url.protocol)) throw new Error(`Dòng ${index + 2}: link phòng phải dùng HTTP hoặc HTTPS.`);
    seen.add(classCode); updates.push({classCode, roomLink});
  });
  if (!updates.length) throw new Error('File chưa có link phòng để nhập.');
  return updates;
}

// Read the first worksheet from the workbook's actual relationship, including shared strings.
export async function xlsxRows(buffer: ArrayBuffer, profileImport = false): Promise<string[][]> {
  const view = new DataView(buffer), bytes = new Uint8Array(buffer), decoder = new TextDecoder();
  let end = bytes.length - 22;
  while (end >= Math.max(0, bytes.length - 65557) && view.getUint32(end, true) !== 0x06054b50) end--;
  if (end < 0 || view.getUint32(end, true) !== 0x06054b50) throw new Error('File XLSX không hợp lệ.');
  const entries = new Map<string, {offset:number; size:number; method:number; unpacked:number}>();
  let position = view.getUint32(end + 16, true);
  for (let i = 0; i < view.getUint16(end + 10, true); i++) {
    if (view.getUint32(position, true) !== 0x02014b50) throw new Error('Cấu trúc XLSX không hợp lệ.');
    const length = view.getUint16(position + 28, true);
    entries.set(decoder.decode(bytes.slice(position + 46, position + 46 + length)), {
      method:view.getUint16(position + 10, true), size:view.getUint32(position + 20, true),
      unpacked:view.getUint32(position + 24, true), offset:view.getUint32(position + 42, true)
    });
    position += 46 + length + view.getUint16(position + 30, true) + view.getUint16(position + 32, true);
  }
  const read = async (name: string) => {
    const entry = entries.get(name); if (!entry) throw new Error('XLSX thiếu ' + name);
    if (entry.unpacked > 20 * 1024 * 1024) throw new Error('Nội dung bảng tính quá lớn.');
    const start = entry.offset + 30 + view.getUint16(entry.offset + 26, true) + view.getUint16(entry.offset + 28, true);
    const data = bytes.slice(start, start + entry.size);
    const text = entry.method === 0 ? decoder.decode(data) : entry.method === 8
      ? await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text()
      : (() => { throw new Error('XLSX dùng kiểu nén chưa hỗ trợ.'); })();
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) throw new Error('Nội dung XLSX không hợp lệ.');
    return doc;
  };
  const workbook = await read('xl/workbook.xml'), rels = await read('xl/_rels/workbook.xml.rels');
  const sheet = workbook.getElementsByTagName('sheet')[0];
  const relation = Array.from(rels.getElementsByTagName('Relationship')).find(row => row.getAttribute('Id') === sheet?.getAttribute('r:id'));
  const target = relation?.getAttribute('Target'); if (!target) throw new Error('XLSX chưa có trang tính.');
  const path = new URL(target, 'https://xlsx.local/xl/workbook.xml').pathname.slice(1);
  const strings = entries.has('xl/sharedStrings.xml') ? Array.from((await read('xl/sharedStrings.xml')).getElementsByTagName('si')).map(row => Array.from(row.getElementsByTagName('t')).map(cell => cell.textContent || '').join('')) : [];
  const result: string[][] = [];
  for (const row of Array.from((await read(path)).getElementsByTagName('row'))) {
    const rowIndex = Number(row.getAttribute('r')) - 1;
    if (profileImport && (!Number.isInteger(rowIndex) || rowIndex < 0 || rowIndex > 5000)) throw new Error('Trang nhập vượt quá 5000 dòng hoặc có số dòng không hợp lệ.');
    const cells: string[] = [];
    for (const cell of Array.from(row.getElementsByTagName('c'))) {
      if (profileImport && cell.getElementsByTagName('f').length) throw new Error(`Dòng ${rowIndex + 1}: hãy nhập giá trị, không dùng công thức.`);
      const column = cell.getAttribute('r')?.match(/^[A-Z]+/)?.[0];
      if (!column) continue;
      const index = [...column].reduce((value, letter) => value * 26 + letter.charCodeAt(0) - 64, 0) - 1;
      const value = cell.getElementsByTagName('v')[0]?.textContent || '';
      cells[index] = cell.getAttribute('t') === 's' ? strings[Number(value)] || '' : cell.getAttribute('t') === 'inlineStr' ? Array.from(cell.getElementsByTagName('t')).map(part => part.textContent || '').join('') : value;
    }
    if (profileImport) result[rowIndex] = cells; else result.push(cells);
  }
  return result;
}

export async function readRoomLinkFile(file: File, classes: {code:string}[]) {
  if (file.size > 10 * 1024 * 1024) throw new Error('File nhập tối đa 10 MB.');
  if (/\.csv$/i.test(file.name)) return roomLinkUpdates(parseCsv(await file.text()), classes);
  if (/\.xlsx$/i.test(file.name)) return roomLinkUpdates(await xlsxRows(await file.arrayBuffer()), classes);
  throw new Error('Vui lòng chọn file CSV hoặc XLSX.');
}
