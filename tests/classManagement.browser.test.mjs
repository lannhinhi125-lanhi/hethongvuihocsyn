import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const {chromium}=await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE_PATH,'index.mjs')));
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:950}});
 const errors=[];page.on('pageerror',e=>errors.push(e.stack));
 await page.addInitScript(()=>{
  const vacancy=new URLSearchParams(location.search).has('vacancy');
  window.writes=[];
  window.testApp={dashboardSelection:null,users:[],incidents:[],teachers:[],timeSlots:[],students:[1,2,3,4].map(n=>({id:'S'+n,name:'Student '+n,grade:'G3',subject:'MATH',level:'L1',model:'1-3',status:n<=2||!vacancy&&n===3?'Đang học':'Chờ xếp lớp',scheduleSlots:[],registrations:[{subject:'MATH',level:'L1',model:'1-3',status:n<=2||!vacancy&&n===3?'Đang học':'Chờ xếp lớp',scheduleSlots:[]}]})),
   classes:[{id:'C1',code:'MATH-GROUP',name:'Original name',grade:'G3',categoryId:'CAP',subject:'MATH',level:'L1',model:'1-3',maxStudents:3,studentIds:vacancy?['S1','S2']:['S1','S2','S3'],status:'Đang học',startDate:'2026-10-01',roomLink:'',schedule:'T2 (18:00 - 19:30)',teacherId:'T1',teacherName:'Teacher',materials:[]}],
   subjects:[{id:'MATH',code:'MATH',name:'Toán',status:true}],levels:[{id:'L1',code:'L1',name:'Tiêu chuẩn',status:true}],models:[{id:'M3',code:'1-3',name:'Nhóm 1-3',maxStudents:3,status:true}],teachingCategories:[{id:'CAP',name:'Tiểu học',options:[{id:'G3',label:'Lớp 3'}]}],
   setClasses:()=>{},showToast:()=>{},updateClass:(id,updates)=>{window.writes.push({id,updates});return true;}
  };
 });
 await page.route('**/src/context/AppContext.tsx*',r=>r.fulfill({contentType:'application/javascript',body:'export const useApp=()=>window.testApp;'}));
 await page.route('**/src/hooks/usePermissions.ts*',r=>r.fulfill({contentType:'application/javascript',body:'export const usePermissions=()=>({can:()=>true,requirePermission:()=>true});'}));
 await page.route('**/src/hooks/useSaveConfirmation.ts*',r=>r.fulfill({contentType:'application/javascript',body:'export const useSaveConfirmation=()=>({isSavingChanges:false,confirmSave:async(fn)=>{fn();return true;}});'}));
 await page.route('**/src/lib/businessPersistence.ts*',r=>r.fulfill({contentType:'application/javascript',body:'export const loadBusinessData=async()=>{};export const useBusinessValue=()=>[[],()=>{}];export const useBusinessStatus=()=>({saving:false});export const waitForBusinessSave=async()=>{};export const removeClassStudent=async()=>{};'}));
 const url='http://127.0.0.1:3107/tests/fixtures/classManagement.html';
 async function open(url){
  await page.goto(url);await page.waitForTimeout(800);assert.deepEqual(errors,[]);await page.getByRole('button',{name:'Quản lý Lớp học',exact:true}).click();
  await page.getByRole('button',{name:'Sửa lớp',exact:true}).click();
 }
 await open(url);
 assert.deepEqual(errors,[]);
 assert.equal(await page.getByText('Chọn học sinh chờ lớp',{exact:true}).count(),0,'full class hides waiting list');
 assert.ok(await page.locator('select').filter({has:page.locator('option[value="1-3"]')}).isDisabled());
 assert.ok(await page.locator('input[type=date]').first().getAttribute('readonly')!==null,'start date stays fixed');
 await page.locator('input[value="Original name"]').fill('New name');
 await page.locator('select').filter({has:page.locator('option[value="CUSTOM"]')}).locator('..').getByRole('combobox').click();
 await page.getByRole('option',{name:'Ngày kết thúc tùy chỉnh',exact:true}).click();
 await page.locator('input[type=date][min]').fill('2027-04-30');
 await page.screenshot({path:'.tmp/class-management-edit.png'});
 await page.getByRole('button',{name:'Cập nhật lớp học',exact:true}).click();
 const saved=(await page.evaluate(()=>window.writes))[0];assert.equal(saved.updates.name,'New name');assert.equal(saved.updates.customEndDate,'2027-04-30');assert.equal('teacherId' in saved.updates,false);assert.equal('studentIds' in saved.updates,false);
 await open(url+'?vacancy');
 await page.getByText('Chọn học sinh chờ lớp',{exact:true}).waitFor();
 assert.equal(await page.getByText('Student 1',{exact:true}).count(),0,'current students cannot be unchecked in edit');
 const waiting=page.locator('label').filter({hasText:'Student 3'});await waiting.locator('input[type=checkbox]').check();
 await page.getByRole('button',{name:'Cập nhật lớp học',exact:true}).click();
 assert.deepEqual((await page.evaluate(()=>window.writes))[0].updates.studentIds,['S1','S2','S3']);
 assert.deepEqual(errors,[]);
 console.log('PASS class management UI: full class hides recruitment; vacancy restores matched waiting list; only basic metadata editable; name save without teacher/date validation; vacancy filled without removing members');
}finally{await browser.close();}
