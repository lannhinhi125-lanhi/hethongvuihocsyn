import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {spawn} from 'node:child_process';
import {readFileSync} from 'node:fs';
const server=spawn(process.execPath,['--max-old-space-size=384','--max-semi-space-size=8','node_modules/vite/bin/vite.js','--port','3107','--host','127.0.0.1'],{env:{...process.env,DISABLE_HMR:'true'},stdio:['ignore','pipe','pipe']});
await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('Vite startup timeout')),20000);
  server.stdout.on('data',data=>{if(data.toString().includes('Local:')){clearTimeout(timer);resolve();}});
  server.once('exit',code=>{clearTimeout(timer);reject(Error('Vite exited '+code));});
});
const reactHash=JSON.parse(readFileSync('node_modules/.vite/deps/_metadata.json','utf8')).browserHash;
const { chromium } = await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE_PATH || '.tmp/ui-validation/node_modules/playwright', 'index.mjs')));
const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args:['--disable-gpu','--renderer-process-limit=1'] });
try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  page.setDefaultTimeout(20000);
  page.on('console', message => {if(message.type()==='error')console.log(message.text());});
  page.on('requestfailed', request=>console.log(request.url(),request.failure()));
  page.on('pageerror', error => console.error(error.message));
  await page.addInitScript(() => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
    const cls = { id: 'CLS', code: 'CLS', name: 'Test class', subject: 'MATH', grade: '3', model: '1-1', level: 'L1', teacherId: 'T', teacherName: 'Teacher', studentIds: [], schedule: 'T4 (18:00 - 19:00)' };
    window.testApp = { classes: [cls], subjects: [{ id: 'S', code: 'MATH', name: 'Toán', status: true }], teachers: [{ id: 'T', name: 'Teacher' }],
      students: [], levels: [], teachingCategories: [], users: [], timeSlots: [{ id: 'SLOT', code: 'SLOT', timeRange: '18:00 - 19:00' }],
      currentUser: { id: 'OPS', name: 'Ops' }, incidents: [{ id: 'GRP-TCH', code: 'GRP-TCH', name: 'Giáo viên', subIncidents: [{ code: 'LATE', name: 'Đi muộn', status: true }] }],
      showToast: (...args) => window.testToasts.push(args) };
    window.testToasts = []; window.testWrites = [];
    window.testData = { dated_lessons: [
      { id: 'TODAY', displayCode: 'TODAY', classId: 'CLS', timeSlotId: 'SLOT', date: today, primaryTeacherId: 'T', status: 'CHUA_HOC' },
      { id: 'OLD', displayCode: 'OLD', classId: 'CLS', timeSlotId: 'SLOT', date: '2001-01-01', primaryTeacherId: 'T', status: 'CHUA_HOC' },
      { id: 'RESOLVED', displayCode: 'RESOLVED', classId: 'CLS', timeSlotId: 'SLOT', date: '2001-01-01', primaryTeacherId: 'T', status: 'CHUA_HOC' }
    ], lesson_incidents: [
      { id: 'INC-OLD', lessonId: 'OLD', categoryId: 'GRP-TCH', incidentCode: 'LATE', status: 'DANG_XU_LY' },
      { id: 'INC-DONE', lessonId: 'RESOLVED', categoryId: 'GRP-TCH', incidentCode: 'LATE', status: 'DA_GIAI_QUYET' }
    ] };
    window.testData.dated_lessons[0].status='CHUA_HOC';
    window.testData.lesson_incidents.push(
      {id:'FIRST',displayCode:'SC-000001',lastUpdatedAt:'2026-10-28T03:00:00Z',lessonId:'TODAY',categoryId:'GRP-TCH',incidentCode:'LATE',incidentName:'First incident',content:'First note',status:'DANG_XU_LY',reportedAt:'2026-10-28T01:00:00Z'},
      {id:'SECOND',displayCode:'SC-000002',lastUpdatedAt:'2026-10-28T04:00:00Z',lessonId:'TODAY',categoryId:'GRP-TCH',incidentCode:'LATE',incidentName:'Second incident',content:'Second note',status:'DA_GIAI_QUYET',reportedAt:'2026-10-28T02:00:00Z'}
    );
  });
  await page.route('**/src/context/AppContext.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useApp=()=>window.testApp;' }));
  await page.route('**/src/hooks/usePermissions.ts*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const usePermissions=()=>({can:()=>true,requirePermission:()=>true});' }));
  await page.route('**/src/lib/businessPersistence.ts*', route => route.fulfill({ contentType: 'application/javascript', body: `
    import React from '/node_modules/.vite/deps/react.js?v=${reactHash}';
    let version=0; const listeners=new Set(); const subscribe=fn=>{listeners.add(fn);return ()=>listeners.delete(fn);};
    export const useBusinessValue=(key)=>{React.useSyncExternalStore(subscribe,()=>version);return [window.testData[key]||[],()=>{}];};
    export const useBusinessStatus=()=>({saving:false,loading:false});
    export const setBusinessValue=(key,value)=>{window.testWrites.push({key,value});if(key==='lesson_incidents') value=value.map(row=>{const old=window.testData[key]?.find(item=>item.id===row.id);return JSON.stringify(old)===JSON.stringify(row)?row:{...row,displayCode:old?.displayCode || 'SC-000003',lastUpdatedAt:new Date().toISOString()};});window.testData[key]=value;version++;queueMicrotask(()=>listeners.forEach(fn=>fn()));};
    export const waitForBusinessSave=async()=>{}; export const refreshBusinessData=async()=>{};` }));
  await page.route('**/tests/fixtures/monitoring-workflow.html', route => route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><meta charset="UTF-8"><div id="root"></div><script type="module">
    import RefreshRuntime from '/@react-refresh';
    RefreshRuntime.injectIntoGlobalHook(window);
    window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type;
    window.__vite_plugin_react_preamble_installed__ = true;
  </script><script type="module">
    import React from '/node_modules/.vite/deps/react.js?v=${reactHash}';
    import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js?v=${reactHash}';
    import {Module5_OperationsMonitoring} from '/src/views/Module5_OperationsMonitoring.tsx';
    import '/src/index.css';
    ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Module5_OperationsMonitoring));
  </script></html>` }));
  await page.goto('http://127.0.0.1:3107/tests/fixtures/monitoring-workflow.html');
  await page.getByRole('button',{name:'2 sự cố',exact:true}).click();
  await page.getByRole('heading',{name:/Các phiếu sự cố/}).waitFor();
  await page.getByRole('button',{name:/Second incident/}).click();
  assert.equal(await page.locator('textarea').inputValue(),'Second note');
  await page.getByRole('button',{name:/First incident/}).click();
  assert.equal(await page.locator('textarea').inputValue(),'First note');
  await page.getByRole('button',{name:'+ Thêm sự cố',exact:true}).click();
  await page.locator('form').getByRole('combobox').first().click();
  await page.getByRole('option',{name:'Giáo viên',exact:true}).click();
  await page.locator('textarea').fill('Third independent incident');
  await page.getByRole('button',{name:/Lưu Biên bản/}).click();
  await page.getByRole('button',{name:'3 sự cố',exact:true}).waitFor();
  const saved=await page.evaluate(()=>window.testData.lesson_incidents.filter(row=>row.lessonId==='TODAY'));
  assert.equal(saved.length,3);assert.equal(saved.find(row=>row.id==='FIRST').content,'First note');assert.equal(saved.find(row=>row.id==='SECOND').content,'Second note');
  await page.getByRole('button',{name:'3 sự cố',exact:true}).click();
  await page.getByRole('button',{name:/First incident/}).click();
  await page.locator('textarea').fill('Edited first only');
  await page.getByRole('button',{name:/Lưu Biên bản/}).click();
  await page.waitForFunction(()=>window.testData.lesson_incidents.find(row=>row.id==='FIRST').content==='Edited first only');
  assert.equal(await page.evaluate(()=>window.testData.lesson_incidents.find(row=>row.id==='SECOND').content),'Second note');
  await page.getByRole('button',{name:'Sự cố & điều phối dạy thay',exact:true}).click();
  await page.getByRole('cell',{name:'TODAY',exact:true}).first().waitFor();
  assert.equal(await page.getByRole('cell',{name:'TODAY',exact:true}).count(),3);
  const resolvedRow=page.locator('tbody tr').filter({hasText:'Second incident'});
  assert.equal(await resolvedRow.getByRole('button',{name:'Biên bản',exact:true}).count(),1);
  assert.match(await resolvedRow.getByRole('button',{name:'Biên bản',exact:true}).getAttribute('class'),/bg-slate/);
  assert.equal(await resolvedRow.getByRole('button',{name:'Xử lý sự cố',exact:true}).count(),0);
  assert.doesNotMatch(await resolvedRow.getAttribute('class'),/bg-rose|ring-rose/);
  const reportCodes=()=>page.locator('tbody tr').evaluateAll(rows=>rows.map(row=>row.textContent.match(/SC-\d{6}/)?.[0]).filter(Boolean));
  assert.equal((await reportCodes())[0],'SC-000001');
  await page.getByRole('combobox',{name:'Sắp xếp sự cố'}).click();
  await page.getByRole('option',{name:'Cập nhật lâu nhất',exact:true}).click();
  assert.equal((await reportCodes())[0],'SC-000002');
  await page.getByRole('searchbox').fill('SC-000002');
  assert.deepEqual(await reportCodes(),['SC-000002']);
  await page.getByRole('searchbox').fill('');
  await page.getByRole('checkbox',{name:'Tất cả sự cố chưa giải quyết'}).check();
  assert.equal(await page.getByRole('cell',{name:'TODAY',exact:true}).count(),2);
  console.log('PASS: browser shows all reports, adds without overwrite, edits exact report, counts reports and filters pending individually.');
} finally { await browser.close(); server.kill(); }
