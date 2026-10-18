import {expect,test} from '@playwright/test';
import {legacyCSVTemplate} from '../../lib/legacy-member-import.mjs';

test('legacy CSV rejects invalid bytes and changing files clears prior evidence and confirmation',async({page})=>{
 test.skip(!process.env.RCSCA_E2E_EMAIL||!process.env.RCSCA_E2E_PASSWORD,'Disposable account required');
 let importCalls=0;
 await page.route('**/rest/v1/rpc/admin_legacy_member_claims',r=>r.fulfill({contentType:'application/json',body:'[]'}));
 await page.route('**/rest/v1/rpc/admin_legacy_members_import',r=>{
  importCalls++;
  const input=r.request().postDataJSON();
  expect(input.p_commit).toBe(false);
  const row=input.p_rows[0];
  return r.fulfill({contentType:'application/json',body:JSON.stringify({ready:1,total:1,fingerprint:'synthetic',rows:[{row:1,name:row.name,membership_type:row.membership_type,member_since:row.member_since,errors:[]}]})});
 });
 await page.goto('/login?next=%2Fadmin%2Fmembers%2Flegacy');
 await page.getByRole('button',{name:'Email＋密碼'}).click();
 await page.locator('input[type="email"]').fill(process.env.RCSCA_E2E_EMAIL!);
 await page.locator('input[type="password"]').fill(process.env.RCSCA_E2E_PASSWORD!);
 await page.getByRole('button',{name:'登入',exact:true}).click();
 await expect(page).toHaveURL(/\/admin\/members\/legacy$/);
 const file=page.getByLabel('選取待認領會員CSV');
 const preview=page.getByRole('button',{name:'預覽核對',exact:true});
 await file.setInputFiles({name:'damaged.csv',mimeType:'text/csv',buffer:Buffer.concat([Buffer.from(legacyCSVTemplate()),Buffer.from([0xff])])});
 await expect(page.locator('.membershipWorkspace').getByRole('alert')).toContainText('檔案不是有效的 UTF-8');
 await expect(preview).toBeDisabled();
 expect(importCalls).toBe(0);
 for(const [index,year] of [2025,2026].entries()){
  await file.setInputFiles({name:`valid-${year}.csv`,mimeType:'text/csv',buffer:Buffer.from(legacyCSVTemplate()+`測試會員,一般會員,2018-03-01,${year},fixture@example.invalid,,,,\r\n`)});
  await expect(preview).toBeEnabled();await preview.click();
  await expect(page.locator('.membershipWorkspace').getByRole('status')).toContainText('可匯入 1／1 筆');
  await expect(page.getByText(`最後有效年度：${year}`,{exact:true})).toBeVisible();
  await expect(page.getByText(/原入會日期：2018-03-01/)).toBeVisible();
  const evidence=page.getByLabel('名冊來源與核對依據');
  const confirmation=page.getByRole('checkbox',{name:/已核對來源/});
  await expect(evidence).toHaveValue('');await expect(confirmation).not.toBeChecked();
  await expect(page.getByRole('button',{name:'確認匯入待認領名冊',exact:true})).toBeDisabled();
  if(index===0){await evidence.fill('First file evidence');await confirmation.check();await expect(page.getByRole('button',{name:'確認匯入待認領名冊',exact:true})).toBeEnabled();}
 }
 expect(importCalls).toBe(2);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
