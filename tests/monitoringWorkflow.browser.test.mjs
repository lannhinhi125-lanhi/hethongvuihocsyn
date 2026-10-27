import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE_PATH, 'index.mjs')));
const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  page.setDefaultTimeout(10000);
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
  });
  await page.route('**/src/context/AppContext.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useApp=()=>window.testApp;' }));
  await page.route('**/src/hooks/usePermissions.ts*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const usePermissions=()=>({can:()=>true,requirePermission:()=>true});' }));
  await page.route('**/src/lib/businessPersistence.ts*', route => route.fulfill({ contentType: 'application/javascript', body: `
    export const useBusinessValue=(key)=>[window.testData[key]||[],()=>{}];
    export const useBusinessStatus=()=>({saving:false,loading:false});
    export const setBusinessValue=(key,value)=>window.testWrites.push({key,value});
    export const waitForBusinessSave=async()=>{}; export const refreshBusinessData=async()=>{};` }));
  await page.route('**/tests/fixtures/monitoring-workflow.html', route => route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><meta charset="UTF-8"><div id="root"></div><script type="module">
    import RefreshRuntime from '/@react-refresh';
    RefreshRuntime.injectIntoGlobalHook(window);
    window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type;
    window.__vite_plugin_react_preamble_installed__ = true;
  </script><script type="module">
    import React from '/node_modules/.vite/deps/react.js';
    import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';
    import {Module5_OperationsMonitoring} from '/src/views/Module5_OperationsMonitoring.tsx';
    import '/src/index.css';
    ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Module5_OperationsMonitoring));
  </script></html>` }));
  await page.goto('http://127.0.0.1:3107/tests/fixtures/monitoring-workflow.html');
  console.log('Loaded monitoring fixture');
  await page.getByRole('button', { name: 'Sự cố', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: 'Nhật ký giám sát' }).getAttribute('aria-pressed'), 'true');
  await page.getByRole('button', { name: 'Đóng', exact: true }).click(); // Unchanged new form needs no confirmation.
  console.log('Clean modal closed');
  await page.getByRole('button', { name: 'Sự cố', exact: true }).click();
  await page.locator('textarea').fill('Draft note');
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('button', { name: 'Đóng', exact: true }).click();
  assert.equal(await page.locator('textarea').inputValue(), 'Draft note');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Đóng', exact: true }).click();
  await page.getByRole('button', { name: 'Sự cố & điều phối dạy thay' }).click();
  console.log('Discard confirmed; opened incidents');
  assert.equal(await page.getByRole('cell', { name: 'OLD', exact: true }).count(), 0);
  await page.getByRole('checkbox', { name: 'Tất cả sự cố chưa giải quyết' }).check();
  await page.getByRole('cell', { name: 'OLD', exact: true }).waitFor();
  assert.equal(await page.getByRole('cell', { name: 'RESOLVED', exact: true }).count(), 0);
  await page.getByRole('button', { name: 'Xử lý ca', exact: true }).click();
  await page.getByRole('button', { name: /Lưu Biên bản/ }).click();
  await page.waitForFunction(() => window.testWrites.some(row => row.key === 'lesson_incidents'));
  assert.match((await page.evaluate(() => window.testToasts)).at(-1)[0], /đang xử lý, chưa áp hệ số công/);
  console.log('PASS: stays on diary, clean close, dirty cancel/discard, unresolved across dates, resolved excluded, missing coefficient saves.');
} finally { await browser.close(); }
