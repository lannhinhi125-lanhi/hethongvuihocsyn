import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE_PATH,'index.mjs')));
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1366,height:1000}});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/api/gemini',route=>route.fulfill({json:{connected:true}}));
 await page.goto('http://127.0.0.1:3111/tests/fixtures/adminAIColors.html');
 const settings=page.getByRole('complementary',{name:'Thiết lập chatbot quản trị'});
 const chat=page.getByRole('region',{name:'Chatbot quản trị'});
 await settings.getByLabel('Câu chào mở đầu',{exact:true}).fill('Xin chào thầy/cô.');
 await page.getByText('Có thay đổi chưa lưu. Chatbot đang dùng cấu hình đã lưu.',{exact:true}).waitFor();
 const prompt=chat.getByRole('button',{name:'Quy trình báo nghỉ ca dạy?',exact:true});
 await prompt.click();assert.equal(await prompt.getAttribute('aria-pressed'),'true');
 const input=chat.getByPlaceholder('Đặt câu hỏi trong phạm vi kho tài liệu...');
 assert.equal(await input.inputValue(),'Quy trình báo nghỉ ca dạy?');
 const handle=chat.getByRole('separator',{name:'Điều chỉnh chiều cao chatbot'});
 await handle.focus();await handle.press('ArrowUp');
 assert.equal(await input.inputValue(),'Quy trình báo nghỉ ca dạy?');
 assert.equal(await settings.getByLabel('Câu chào mở đầu',{exact:true}).inputValue(),'Xin chào thầy/cô.');
 const tone=await settings.locator('.ai-config-group').first().evaluate(el=>getComputedStyle(el).backgroundColor);
 assert.notEqual(tone,'rgb(255, 255, 255)');
 await handle.dblclick();
 if(process.env.REPORT_SCREENSHOT_DIR)await page.screenshot({path:resolve(process.env.REPORT_SCREENSHOT_DIR,'admin-ai-colors.png'),fullPage:true});
 for(const width of [1024,768,390]){
  await page.setViewportSize({width,height:900});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`no overflow at ${width}`);
  assert.equal(await input.inputValue(),'Quy trình báo nghỉ ca dạy?');
 }
 assert.deepEqual(errors,[]);
 console.log('PASS admin AI colors: actual settings/chat layout, tinted groups, selected quick prompts, dirty configuration, resize preserves drafts, mobile and no browser errors.');
}finally{await browser.close();}
