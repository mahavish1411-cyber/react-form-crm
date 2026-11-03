const { chromium } = require('playwright');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe', headless:true});
  const page = await browser.newPage({viewport:{width:1440,height:1100}});
  const errors=[]; page.on('pageerror', e=>errors.push(e.message));
  await page.goto('http://localhost:5173/payroll');
  await page.locator('input[type=month]').fill('2026-09');
  const row=page.locator('tr').filter({hasText:'vishnu'});
  await row.getByRole('button',{name:'View Details'}).click();
  const modal=page.locator('.payroll-details-modal');
  await modal.waitFor();
  const response=await fetch('http://localhost:5000/api/payroll?month=2026-09');
  const payroll=(await response.json()).data.find(x=>x.employee.employeeId==='vishnu');
  const currency=x=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:2,maximumFractionDigits:2}).format(x);
  for(const [label,key] of Object.entries({'Basic Salary':'basicSalary','Allowance':'allowance','Gross Salary':'grossSalary','Attendance Deduction':'attendanceDeduction','Employee Deduction':'employeeDeduction','Other Deduction':'otherDeduction','Total Deduction':'totalDeduction','Net Salary':'netSalary','Payment Status':'paymentStatus','Paid Date':'paidDate'})) {
    const expected=key==='paidDate'?new Date(payroll[key]).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):key==='paymentStatus'?payroll[key]:currency(payroll[key]);
    const actual=await modal.locator('.payroll-details-grid > div').filter({has:page.locator('span').getByText(label,{exact:true})}).locator('strong').innerText();
    if(actual!==expected) throw Error(label+': '+actual+' != '+expected);
  }
  fs.mkdirSync('artifacts',{recursive:true});
  await modal.screenshot({path:'artifacts/payroll-details-september.png'});
  const popupPromise=page.waitForEvent('popup');
  await modal.getByRole('button',{name:'Print / Save Payslip'}).click();
  const popup=await popupPromise;
  await popup.waitForLoadState();
  await popup.setViewportSize({width:1000,height:1300});
  await popup.locator('.company-logo').evaluate(img=>img.decode());
  for (const [label,key] of Object.entries({'Basic Salary':'basicSalary','Allowance':'allowance','Gross Salary':'grossSalary','Attendance Deduction':'attendanceDeduction','Employee Deduction':'employeeDeduction','Other Deduction':'otherDeduction','Total Deduction':'totalDeduction'})) {
    const actual=await popup.locator('.salary-row').filter({has:popup.getByText(label,{exact:true})}).locator('strong').innerText();
    if(actual!==currency(payroll[key])) throw Error('Payslip mismatch: '+label);
  }
  if(await popup.locator('.net-pay-amount').innerText()!==currency(payroll.netSalary)) throw Error('Net pay mismatch');
  if(!await popup.getByText('PAY-202609-VISHNU',{exact:false}).count()) throw Error('Missing payslip number');
  await popup.screenshot({path:'artifacts/artic9-payslip-september.png',fullPage:true});
  const pdf=await popup.pdf({path:'artifacts/artic9-payslip-september.pdf',preferCSSPageSize:true,printBackground:true});
  const pages=(pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)||[]).length;
  if(pages!==1) throw Error('Expected one A4 page, received '+pages);
  await popup.setViewportSize({width:390,height:844});
  const overflow=await popup.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  if(overflow) throw Error('Mobile horizontal overflow');
  if(errors.length) throw Error(errors.join('\n'));
  console.log(JSON.stringify({fieldsVerified:10,pdfPages:pages,mobileOverflow:overflow,browserErrors:errors,netSalary:payroll.netSalary}));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
