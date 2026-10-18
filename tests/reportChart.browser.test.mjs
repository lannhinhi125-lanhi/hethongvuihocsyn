import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const {chromium}=await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE_PATH,'index.mjs')));
const browser=await chromium.launch({executablePath:'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1100,height:850}});
 await page.goto('http://127.0.0.1:3107/tests/fixtures/reportChart.html');
 const math=page.locator('[data-report-key="Math"]');
 await math.hover();await math.click();
 await page.waitForFunction(()=>document.querySelector('[data-testid="selection"]').textContent==='Math');
 assert.equal(await page.getByTestId('records').textContent(),'1,2');
 await page.locator('[data-report-key="English"]').hover();
 assert.equal(await page.getByTestId('selection').textContent(),'Math','hover does not clear selection');
 await page.locator('[data-report-key="English"]').click();
 await page.waitForFunction(()=>document.querySelector('[data-testid="selection"]').textContent==='English');
 assert.equal(await page.getByTestId('records').textContent(),'3');
 await page.locator('[data-report-key="English"]').click();
 await page.waitForFunction(()=>document.querySelector('[data-testid="selection"]').textContent==='all');
 await math.focus();await math.press('Enter');
 await page.waitForFunction(()=>document.querySelector('[data-testid="selection"]').textContent==='Math');
 await page.getByRole('button',{name:'Outside',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('[data-testid="selection"]').textContent==='all');
 console.log('PASS real browser: hover then click filters records, switch groups, repeat click clears, keyboard and outside dismissal');
} finally {await browser.close();}
