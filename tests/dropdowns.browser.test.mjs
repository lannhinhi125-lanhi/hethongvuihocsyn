import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const {chromium}=await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE_PATH,'index.mjs')));
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1100,height:800}});
 await page.goto((process.env.DROPDOWN_TEST_URL||'http://127.0.0.1:3107')+'/tests/fixtures/dropdowns.html');
 const period=page.getByRole('combobox',{name:'Chế độ thời gian giám sát'});
 await period.click();await page.getByRole('option',{name:'Tháng',exact:true}).click();
 assert.equal(await page.getByTestId('range').textContent(),'2026-10-01 / 2026-10-31');
 await page.getByRole('button',{name:'Tháng sau',exact:true}).click();
 assert.equal(await page.getByTestId('range').textContent(),'2026-11-01 / 2026-11-30');
 // Required fields still block form submission and open the styled menu.
 await page.getByRole('button',{name:'Submit',exact:true}).click();
 assert.equal(await page.getByTestId('submitted').textContent(),'');
 const subject=page.getByRole('combobox',{name:'Required subject'});
 assert.equal(await subject.getAttribute('aria-expanded'),'true');
 await subject.press('End');await subject.press('Enter');
 await page.getByRole('button',{name:'Submit',exact:true}).click();
 assert.equal(await page.getByTestId('submitted').textContent(),'E');
 await subject.click();assert.equal(await page.getByRole('option',{name:'Disabled subject'}).getAttribute('aria-disabled'),'true');
 await subject.press('Escape');assert.equal(await subject.getAttribute('aria-expanded'),'false');
 assert.ok(await page.getByRole('combobox',{name:'Disabled select'}).isDisabled());
 // Portal list scrolling/clicks must not dismiss the parent column filter.
 await page.getByRole('button',{name:'Lọc riêng cột Nested filter'}).click();
 const nested=page.getByRole('combobox',{name:'Nested choice'});
 await nested.click();await nested.press('End');await nested.press('Enter');
 assert.equal(await page.getByTestId('filter').textContent(),'29');
 assert.ok(await page.getByRole('dialog',{name:'Lọc riêng cột Nested filter'}).isVisible());
 await nested.click();await page.getByRole('option',{name:'Choice 27',exact:true}).click();
 assert.equal(await page.getByTestId('filter').textContent(),'27');
 await nested.click();await nested.press('Escape');
 assert.ok(await page.getByRole('dialog',{name:'Lọc riêng cột Nested filter'}).isVisible());
 await nested.press('Escape');assert.equal(await page.getByRole('dialog',{name:'Lọc riêng cột Nested filter'}).count(),0);
 console.log('PASS: styled menus, monthly range, required forms, form values, disabled choices, keyboard and nested portal selection');
}finally{await browser.close();}
