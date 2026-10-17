import {expect,test,type Page} from '@playwright/test';
async function login(page:Page,next:string){
  await page.goto('/login?next='+encodeURIComponent(next));
  await page.getByRole('button',{name:'Email＋密碼'}).click();
  await page.locator('input[type="email"]').fill(process.env.RCSCA_E2E_EMAIL!);
  await page.locator('input[type="password"]').fill(process.env.RCSCA_E2E_PASSWORD!);
  await page.getByRole('button',{name:'登入',exact:true}).click();
  await expect(page).toHaveURL(new RegExp(next+'$'));
}
test('membership pages require login and preserve their destination',async({page})=>{
  for(const path of ['/membership/apply','/membership/directory','/membership/claim']){
    await page.goto(path);await expect(page).toHaveURL(/\/login\?next=/);
    expect(new URL(page.url()).searchParams.get('next')).toBe(path);
  }
});
test('membership validation retains editable form and a successful submission cannot repeat',async({page})=>{
  test.skip(!process.env.RCSCA_E2E_EMAIL||!process.env.RCSCA_E2E_PASSWORD,'Disposable account required');
  let submitted=false,calls=0;
  await page.route('**/rest/v1/rpc/membership_referrers',r=>r.fulfill({contentType:'application/json',body:'[]'}));
  await page.route('**/rest/v1/rpc/membership_applications_self',r=>r.fulfill({contentType:'application/json',body:JSON.stringify(submitted?[{id:'00000000-0000-4000-8000-000000001580',application_kind:'renewal',membership_type:'annual',full_name:'Synthetic applicant',identity_mask:'A******789',phone:'0900000000',email:'test@example.invalid',address:'Synthetic address',status:'pending',created_at:'2026-10-16T00:00:00+08:00'}]:[])}));
  await page.route('**/rest/v1/rpc/membership_submit_with_birthday',r=>{calls++;if(calls===1)return r.fulfill({status:400,contentType:'application/json',body:'{"message":"invalid_identity"}'});submitted=true;return r.fulfill({contentType:'application/json',body:'"00000000-0000-4000-8000-000000001580"'});});
  await login(page,'/membership/apply');
  await expect(page.getByRole('heading',{name:'2027年年度會員',exact:true})).toBeVisible();
  await expect(page.getByLabel('介紹人或所屬企業',{exact:true})).toHaveJSProperty('tagName','INPUT');
  await expect(page.getByLabel('介紹人小隊',{exact:true})).toHaveJSProperty('readOnly',true);
  await expect(page.getByText('一般會員費每年 1,200 元',{exact:true})).toBeVisible();
  await page.getByLabel('姓名＊',{exact:true}).fill('Synthetic applicant');
  await page.getByLabel('生日＊',{exact:true}).fill('1990-02-28');
  await page.getByLabel('身分證字號＊',{exact:true}).fill('A123456788');
  await page.getByLabel('聯絡電話＊',{exact:true}).fill('0900000000');
  await page.getByLabel('信箱＊',{exact:true}).fill('test@example.invalid');
  await page.getByLabel('通訊地址＊',{exact:true}).fill('Synthetic address');
  await page.getByRole('checkbox',{name:/我同意協會/}).check();
  await page.getByRole('button',{name:'送出申請',exact:true}).click();
  await expect(page.locator('.membershipWorkspace [role="alert"]')).toContainText('請確認身分證字號格式與檢查碼');
  await expect(page.getByLabel('姓名＊',{exact:true})).toBeEditable();
  await page.getByLabel('身分證字號＊',{exact:true}).fill('A123456789');
  await page.getByRole('button',{name:'送出申請',exact:true}).click();
  await expect(page.getByRole('button',{name:'送出申請',exact:true})).toBeDisabled();
  await expect(page.getByText('A******789',{exact:false})).toBeVisible();
  await expect(page.getByLabel('身分證字號＊',{exact:true})).toHaveValue('');
  expect(calls).toBe(2);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
