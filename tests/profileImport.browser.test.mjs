import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const {chromium}=await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE_PATH,'index.mjs')));
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
try {
 const page=await browser.newPage();
 await page.addInitScript(()=>{
  window.testWrites=[];
  window.testApp={teachingCategories:[{id:'C1',name:'Cấp nguồn',options:[{id:'K1',label:'Khối nguồn'}]}],subjects:[{id:'S1',code:'SUB-X',name:'Môn nguồn',status:true}],models:[{code:'MODEL-X',name:'Mô hình nguồn',status:true}],levels:[{code:'LEVEL-X',name:'Trình độ nguồn',status:true}],students:[],teachers:[],users:[],
   showToast:(message,type)=>{document.getElementById('test-toast').textContent=type+': '+message;},
   createTeacherWithAccount:async(profile)=>{window.testWrites.push({teacher:profile});return {id:'GV-TEST',username:'GV-TEST',password:'Initial-TEST'};}
  };
 });
 await page.route('**/src/context/AppContext.tsx*',route=>route.fulfill({contentType:'application/javascript',body:'export const useApp=()=>window.testApp;'}));
 await page.route('**/src/lib/businessPersistence.ts*',route=>route.fulfill({contentType:'application/javascript',body:'export const useBusinessStatus=()=>({loadedAt:1}); export const waitForBusinessSave=async()=>{}; export const loadBusinessData=async()=>{};'}));
 await page.route('**/src/lib/accountSession.ts*',route=>route.fulfill({contentType:'application/javascript',body:`export const refreshAccountSession=async()=>{};export const teacherSessionRequest=async(name,args)=>{window.testWrites.push(args);if(args.p_changes[0].after.hoten==='Lỗi lưu')throw Error('Lỗi lưu kiểm thử');return {};};`}));
 await page.goto('http://127.0.0.1:3107/tests/fixtures/profileImport.html');
 const students=page.locator('[data-kind=students]');
 const downloadEvent=page.waitForEvent('download');await students.getByRole('button',{name:'Tải mẫu Excel'}).click();
 assert.equal((await downloadEvent).suggestedFilename(),'Mau-ho-so-hoc-sinh.xlsx');
 async function workbook(kind,rows){return page.evaluate(async({kind,rows})=>{
  const {profileTemplate}=await import('/src/lib/profileImport.ts'),{reportExcelBytes}=await import('/src/lib/reportExcel.ts');
  const a=window.testApp,data=profileTemplate(kind,{categories:a.teachingCategories,...a});data.sheets[0].rows.push(...rows);return Array.from(reportExcelBytes(data));
 },{kind,rows});}
 const row=['Học sinh A','K1','Cha','0901234567','','','C1','SUB-X','LEVEL-X','MODEL-X'];
 await students.locator('input[type=file]').setInputFiles({name:'students.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(await workbook('students',[row]))});
 await page.getByRole('button',{name:'Xác nhận nhập 1 hồ sơ'}).click();
 await page.getByText('Kết quả: 1 thành công, 0 lỗi.',{exact:true}).waitFor();
 assert.match(await page.locator('#test-toast').innerText(),/^success:/);
 assert.equal((await page.evaluate(()=>window.testWrites[0].p_changes[0].after.dangkymonhoc[0].subject)),'SUB-X');
 await page.getByRole('button',{name:'Đóng',exact:true}).click();
 await students.locator('input[type=file]').setInputFiles({name:'bad.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(await workbook('students',[[...row.slice(0,6),'BAD-CATEGORY',...row.slice(7)]]))});
 await page.getByText('File có lỗi. Đóng và sửa file, sau đó nhập lại.').waitFor();assert.ok(await page.getByRole('button',{name:'Xác nhận nhập 1 hồ sơ'}).isDisabled());
 await page.getByRole('button',{name:'Đóng',exact:true}).click();
 await students.locator('input[type=file]').setInputFiles({name:'partial.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(await workbook('students',[row,['Lỗi lưu',...row.slice(1)]]))});
 await page.getByRole('button',{name:'Xác nhận nhập 2 hồ sơ'}).click();await page.getByText('Kết quả: 1 thành công, 1 lỗi.',{exact:true}).waitFor();
 assert.match(await page.locator('#test-toast').innerText(),/^error:/);await page.getByText('Lỗi lưu kiểm thử',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Đóng',exact:true}).click();
 const teachers=page.locator('[data-kind=teachers]');
 await teachers.locator('input[type=file]').setInputFiles({name:'teachers.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(await workbook('teachers',[['Giáo viên','gv@example.test','0901234567','SUB-X','C1','K1','MODEL-X','Bằng cấp']]))});
 await page.getByRole('button',{name:'Xác nhận nhập 1 hồ sơ'}).click();await page.getByText('Tài khoản: GV-TEST',{exact:true}).waitFor();
 const resultDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Tải kết quả nhập'}).click();assert.equal((await resultDownload).suggestedFilename(),'Ket-qua-nhap-teachers.xlsx');
 console.log('PASS profile import UI: actual XLSX download/upload, preview, live catalog validation, success/error notifications, partial-save details, optional enrollment, teacher credentials result download (mocked persistence; real RPCs tested separately)');
} finally {await browser.close();}
