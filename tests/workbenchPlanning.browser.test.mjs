import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const {chromium}=await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE_PATH,'index.mjs')));
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const width of [1440,1366,1024,768,390]){
  await page.setViewportSize({width,height:900});await page.goto('http://127.0.0.1:3107/tests/fixtures/workbenchPlanning.html');
  await page.getByRole('button',{name:'Việc cần xử lý',exact:true}).click();
  const pending=page.getByRole('button',{name:/Sự cố chờ xử lý/});await pending.getByText('1',{exact:true}).waitFor();
  await pending.click();const selection=JSON.parse(await page.getByTestId('selection').textContent());assert.deepEqual(selection.ids,['old']);
  await page.getByRole('button',{name:'Trong kỳ',exact:true}).click();await pending.getByText('0',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Tất cả chưa xử lý',exact:true}).click();await pending.getByText('1',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Học sinh & lớp học',exact:true}).click();
  await page.getByRole('heading',{name:/Lớp sắp kết thúc/}).waitFor();
  const demand=page.getByRole('heading',{name:'Nhu cầu xếp lớp hiện tại'}).locator('..').locator('..');
  const ending=page.getByRole('heading',{name:/Lớp sắp kết thúc/}).locator('..').locator('..').locator('..');
  if(width>=1024){const a=await demand.boundingBox(),b=await ending.boundingBox();assert.ok(b.x>a.x+a.width-1,'planning cards side by side');}
  const scroll=ending.locator('.overflow-auto');assert.ok(await scroll.evaluate(e=>e.scrollHeight>e.clientHeight),'long list scrolls inside card');
  const horizon=page.getByRole('combobox').last();await horizon.scrollIntoViewIfNeeded();await page.waitForTimeout(200);
  await page.getByRole('combobox',{name:'Khoảng ngày lớp sắp kết thúc'}).click();await page.getByRole('option',{name:'7 ngày tới'}).click();
  await page.getByRole('heading',{name:'Lớp sắp kết thúc · 8',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`no overflow at ${width}`);
  await page.getByRole('table').first().getByRole('button').first().click();
  assert.equal(JSON.parse(await page.getByTestId('selection').textContent()).ids.length,8);
  await page.getByRole('table').nth(1).getByRole('button').first().click();
  assert.deepEqual(JSON.parse(await page.getByTestId('selection').textContent()).ids,['c0']);
  if(process.env.WORKBENCH_SCREENSHOT_DIR)await page.screenshot({path:resolve(process.env.WORKBENCH_SCREENSHOT_DIR,`workbench-${width}.png`),fullPage:true});
  await page.getByRole('button',{name:'Tăng trưởng trong kỳ',exact:true}).click();await page.getByText('Phân loại 20 lớp được tạo trong kỳ',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`growth no overflow at ${width}`);
  console.log(`PASS ${width}px: all/period backlog, navigation, ending horizon, internal scroll, planning/growth and overflow`);
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
