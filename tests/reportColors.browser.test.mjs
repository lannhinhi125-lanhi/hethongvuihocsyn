import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE_PATH||'node_modules/playwright','index.mjs')));
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:3110/tests/fixtures/reportColors.html');
 const classes=page.getByRole('button',{name:'Lớp theo môn',exact:true});
 const students=page.getByRole('button',{name:'Học sinh theo khối',exact:true});
 await classes.click();assert.equal(await classes.getAttribute('aria-pressed'),'true');
 assert.equal(await students.getAttribute('aria-pressed'),'false');
 const selectedColor=await classes.evaluate(el=>getComputedStyle(el).backgroundColor);
 const idleColor=await students.evaluate(el=>getComputedStyle(el).backgroundColor);
 assert.notEqual(selectedColor,idleColor,'selected template is visually distinct');
 assert.notEqual(idleColor,'rgb(255, 255, 255)','suggestions have a tinted surface');
 await students.click();assert.equal(await students.getAttribute('aria-pressed'),'true');
 assert.equal(await classes.getAttribute('aria-pressed'),'false');
 await page.getByRole('heading',{name:'Học sinh theo khối lớp',exact:true,level:2}).waitFor();
 const results=page.getByRole('region',{name:'Biểu đồ và số liệu báo cáo'});
 assert.ok((await results.getByRole('table').innerText()).includes('Khối 3'));
 const summary=page.locator('summary').filter({hasText:'Mẫu gợi ý'});
 await summary.click();assert.equal(await students.isVisible(),false);
 await summary.focus();await summary.press('Enter');assert.equal(await students.isVisible(),true);
 await classes.click();
 if(process.env.REPORT_SCREENSHOT_DIR)await page.screenshot({path:resolve(process.env.REPORT_SCREENSHOT_DIR,'report-colors-desktop.png'),fullPage:true});
 for(const width of [1024,768,390]){
  await page.setViewportSize({width,height:900});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`no overflow at ${width}`);
  await students.click();assert.equal(await students.getAttribute('aria-pressed'),'true');
 }
 assert.deepEqual(errors,[]);
 console.log('PASS report colors: orange suggestions, selected state, unchanged template switching/results, keyboard collapse, mobile layout and no browser errors.');
}finally{await browser.close();}
