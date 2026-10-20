import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {deflateRawSync} from 'node:zlib';

// Convert the application's stored ZIP to the deflated form produced by Excel.
function compressZip(input) {
  const bytes=Buffer.from(input), end=bytes.length-22, count=bytes.readUInt16LE(end+10);
  let cursor=bytes.readUInt32LE(end+16), offset=0;
  const locals=[], central=[];
  for(let i=0;i<count;i++) {
    const name=bytes.readUInt16LE(cursor+28),extra=bytes.readUInt16LE(cursor+30),comment=bytes.readUInt16LE(cursor+32);
    const record=Buffer.from(bytes.subarray(cursor,cursor+46+name+extra+comment));
    const oldOffset=record.readUInt32LE(42), size=record.readUInt32LE(20);
    const dataStart=oldOffset+30+bytes.readUInt16LE(oldOffset+26)+bytes.readUInt16LE(oldOffset+28);
    const header=Buffer.from(bytes.subarray(oldOffset,dataStart)), data=deflateRawSync(bytes.subarray(dataStart,dataStart+size));
    header.writeUInt16LE(8,8);header.writeUInt32LE(data.length,18);
    record.writeUInt16LE(8,10);record.writeUInt32LE(data.length,20);record.writeUInt32LE(offset,42);
    locals.push(header,data);central.push(record);offset+=header.length+data.length;cursor+=record.length;
  }
  const directory=Buffer.concat(central),footer=Buffer.from(bytes.subarray(end));
  footer.writeUInt32LE(directory.length,12);footer.writeUInt32LE(offset,16);
  return Buffer.concat([...locals,directory,footer]);
}

const {chromium}=await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE_PATH,'index.mjs')));
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
try {
  const page=await browser.newPage();
  await page.goto((process.env.ROOM_IMPORT_TEST_URL||'http://127.0.0.1:3107')+'/tests/fixtures/dropdowns.html');
  const {result,bytes}=await page.evaluate(async()=>{
    const {readRoomLinkFile}=await import('/src/lib/roomLinkImport.ts');
    const {reportExcelBytes}=await import('/src/lib/reportExcel.ts');
    const bytes=reportExcelBytes({filename:'rooms.xlsx',sheets:[{name:'Phòng học',rows:[['Mã lớp','Tên lớp','Link phòng học'],['C1','Lớp có dấu, ký tự &','https://room.example/real']]}]});
    return {result:await readRoomLinkFile(new File([bytes],'rooms.xlsx'),[{code:'C1'}]),bytes:Array.from(bytes)};
  });
  const expected=[{classCode:'C1',roomLink:'https://room.example/real'}];
  assert.deepEqual(result,expected);
  const compressed=Array.from(compressZip(bytes));
  const second=await page.evaluate(async bytes=>{
    const {readRoomLinkFile}=await import('/src/lib/roomLinkImport.ts');
    return readRoomLinkFile(new File([new Uint8Array(bytes)],'excel.xlsx'),[{code:'C1'}]);
  },compressed);
  assert.deepEqual(second,expected);
  console.log('PASS browser: stored and deflated XLSX import preserves supplied class code and room URL');
} finally {await browser.close();}
