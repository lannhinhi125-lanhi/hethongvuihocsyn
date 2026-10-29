import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const {chromium}=await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE_PATH,'index.mjs')));
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const width of [1440,1366,1024,768,390]){
  await page.setViewportSize({width,height:900});await page.goto('http://127.0.0.1:3107/tests/fixtures/reportComposer.html');
  const controls=page.getByRole('complementary',{name:'Thiết lập tài liệu báo cáo'}),preview=page.getByRole('region',{name:'Xem trước tài liệu báo cáo'});
  await controls.waitFor();
  const left=await controls.boundingBox(),right=await preview.boundingBox();
  if(width>=1024){
   assert.ok(right.x>=left.x+left.width,'side by side');assert.ok(right.y<left.y+50,'preview at top');
   const handle=page.getByRole('separator');await handle.focus();await handle.press('ArrowLeft');assert.ok((await controls.boundingBox()).width<left.width);
  }else assert.ok(right.y>=left.y+left.height,'stacked for small screens');
  await controls.getByText('Thông tin đầu báo cáo & người ký',{exact:true}).click();
  await controls.getByLabel('Người lập báo cáo',{exact:true}).fill('Người kiểm thử');
  const generate=page.getByRole('button',{name:'Xem trước',exact:true});await generate.scrollIntoViewIfNeeded();await generate.click();
  const frame=page.frameLocator('iframe');await frame.getByText('Người kiểm thử',{exact:true}).first().waitFor();
  assert.ok(await frame.locator('table').count()>0,'generated document has data table');
  if(process.env.REPORT_SCREENSHOT_DIR)await page.screenshot({path:resolve(process.env.REPORT_SCREENSHOT_DIR,`composer-${width}.png`),fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`no page overflow ${width}`);
  await controls.getByLabel('Số báo cáo',{exact:true}).fill('01/QA');await page.locator('iframe').waitFor({state:'detached'});
  console.log(`PASS ${width}px: layout, resize, generation, preview invalidation and no overflow`);
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
