import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const {chromium}=await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE_PATH || 'node_modules/playwright','index.mjs')));
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
try {
 const page=await browser.newPage();
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 for(const width of [1440,1366,1024,768,390]){
  await page.setViewportSize({width,height:900});
  await page.goto('http://127.0.0.1:3107/tests/fixtures/reportWorkspace.html');
  const controls=page.getByRole('complementary',{name:'Thiết lập và bộ lọc báo cáo'});
  const results=page.getByRole('region',{name:'Biểu đồ và số liệu báo cáo'});
  await controls.waitFor();
  await results.locator('svg').first().waitFor();
  await results.getByRole('table').waitFor();
  const left=await controls.boundingBox(),right=await results.boundingBox();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`no page overflow at ${width}`);
  if(width>=1024){
   assert.ok(right.x>left.x+left.width,`side by side at ${width}`);
   const handle=page.getByRole('separator',{name:'Điều chỉnh độ rộng bộ lọc'});
   const box=await handle.boundingBox();
   await page.mouse.move(box.x+box.width/2,box.y+60);await page.mouse.down();await page.mouse.move(box.x+90,box.y+60,{steps:10});await page.mouse.up();
   assert.ok((await controls.boundingBox()).width>left.width+30,'drag widens controls');
   await handle.focus();await handle.press('Home');assert.equal(Math.round((await controls.boundingBox()).width),260);
   await handle.press('ArrowRight');assert.equal(Math.round((await controls.boundingBox()).width),280);
   await handle.dblclick({position:{x:6,y:60}});assert.equal(Math.round((await controls.boundingBox()).width),320);
  }else assert.ok(right.y>=left.y+left.height,'stacked on smaller screens');
  await page.getByText('Lần cập nhật thành công gần nhất:',{exact:false}).waitFor();
  await page.getByRole('button',{name:'Thử tải lại'}).click();
  assert.equal(await page.getByRole('button',{name:'Thử tải lại'}).count(),0);
  if(process.env.REPORT_SCREENSHOT_DIR) await page.screenshot({path:resolve(process.env.REPORT_SCREENSHOT_DIR,`report-workspace-${width}.png`),fullPage:true});
  console.log(`PASS ${width}px: layout, no overflow, status retry${width>=1024?', drag, keyboard, reset':''}`);
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
