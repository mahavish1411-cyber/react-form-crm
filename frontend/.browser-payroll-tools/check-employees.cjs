const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1100}});
 const id='TEST-'+Date.now(); let created;
 try {
  await page.goto('http://localhost:5173/employees');
  await page.locator('tbody tr').first().waitFor();
  for(const [name,value] of Object.entries({employeeId:id,name:'Temporary Save Test',email:id.toLowerCase()+'@example.invalid',phone:'9000000000',department:'QA',designation:'Test',basicSalary:'30000',allowance:'3000',deduction:'1000'})) await page.locator(`[name="${name}"]`).fill(value);
  const responsePromise=page.waitForResponse(r=>r.url().endsWith('/api/employees')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Add Employee',exact:true}).click();
  const response=await responsePromise; const result=await response.json(); assert.equal(response.status(),201); created=result.data._id;
  const row=page.locator('tbody tr').filter({hasText:id}); await row.waitFor();
  await row.getByRole('button',{name:'Edit',exact:true}).click();
  await page.locator('[name="allowance"]').fill('3500');
  const updatePromise=page.waitForResponse(r=>r.request().method()==='PUT');
  await page.getByRole('button',{name:'Update Employee',exact:true}).click();
  const updated=await (await updatePromise).json(); assert.equal(updated.data.allowance,3500); assert.equal(updated.data.deduction,1000);
  await page.getByRole('status').filter({hasText:'Updated'}).waitFor();
  for(const [name,value] of Object.entries({employeeId:id,name:'Duplicate Test',email:id.toLowerCase()+'@example.invalid',phone:'9000000000',department:'QA',designation:'Test'})) await page.locator(`[name="${name}"]`).fill(value);
  for(const name of ['basicSalary','allowance','deduction']) await page.locator(`[name="${name}"]`).fill('0');
  await page.getByRole('button',{name:'Add Employee',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Employee ID already exists'}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Add Employee',exact:true}).isEnabled(),true);
  await page.route('**/api/employees',route=>route.abort());
  await page.getByRole('button',{name:'Add Employee',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Cannot connect'}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Add Employee',exact:true}).isEnabled(),true);
  console.log('PASS: real employee create/update, salary persistence, duplicate validation, network failure recovery.');
 } finally {
  if(created){const r=await fetch('http://localhost:5000/api/employees/'+created,{method:'DELETE'});assert.equal(r.status,200);console.log('Temporary test employee removed.');}
  await browser.close();
 }
})().catch(e=>{console.error(e);process.exit(1)});
