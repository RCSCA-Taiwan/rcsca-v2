import {expect,test,type Page} from '@playwright/test';

async function login(page:Page){
 await page.goto('/login?next=%2Faccount%2Fprofile');
 await page.getByRole('button',{name:'Email＋密碼',exact:true}).click();
 await page.locator('input[type="email"]').fill(process.env.RCSCA_E2E_EMAIL!);
 await page.locator('input[type="password"]').fill(process.env.RCSCA_E2E_PASSWORD!);
 await page.getByRole('button',{name:'登入',exact:true}).click();
 await expect(page).toHaveURL(/\/account\/profile$/);
}
const history={birth_date:'1990-02-28',greetings_consent:false,membership_type:'annual',membership_status:'active',member_since:'2018-03-01',years:8,claim:null};

test('profile cannot overwrite unreadable data, retains a draft and separates saved data from failed readback',async({page})=>{
 test.skip(!process.env.RCSCA_E2E_EMAIL||!process.env.RCSCA_E2E_PASSWORD,'Disposable member required');
 let failed=true,writes=0,release=()=>{},record={display_name:'合成原姓名',mobile:'0900000000'};
 await page.route('**/rest/v1/profiles?**',async route=>{
  const url=new URL(route.request().url());
  if(url.searchParams.get('select')!=='display_name,mobile'){await route.continue();return;}
  expect(url.searchParams.get('id')).toMatch(/^eq\.[0-9a-f-]{36}$/i);
  await route.fulfill({status:failed?403:200,contentType:'application/json',body:JSON.stringify(failed?{message:'Synthetic read rejection'}:record)});
 });
 await page.route('**/rest/v1/rpc/member_history_self',r=>r.fulfill({contentType:'application/json',body:JSON.stringify(history)}));
 await page.route('**/rest/v1/rpc/account_update_basic_profile',async route=>{
  writes++;expect(route.request().postDataJSON()).toEqual({p_display_name:'合成修改姓名',p_mobile:'0911111111'});
  if(writes===1){await new Promise<void>(resolve=>{release=resolve;});await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({message:'Synthetic save rejection'})});return;}
  record={display_name:'合成修改姓名',mobile:'0911111111'};failed=true;
  await route.fulfill({status:204,body:''});
 });
 await login(page);
 const basic=page.getByRole('region',{name:'基本資料',exact:true}),birthday=page.getByRole('region',{name:'會籍與生日資料',exact:true});
 const retry=basic.getByRole('button',{name:'重新讀取基本資料',exact:true}),form=basic.getByRole('form',{name:'基本資料',exact:true});
 await expect(basic.getByRole('alert')).toContainText('目前無法確認基本資料');
 await expect(form).toHaveCount(0);await expect(birthday.getByLabel('生日',{exact:true})).toHaveValue(history.birth_date);
 await expect(page.getByRole('navigation',{name:'個人資料後續操作',exact:true})).toBeVisible();
 failed=false;await retry.click();
 await expect(form.getByLabel('顯示名稱',{exact:true})).toHaveValue('合成原姓名');
 await form.getByLabel('顯示名稱',{exact:true}).fill('合成修改姓名');await form.getByLabel('手機',{exact:true}).fill('0911111111');
 record={display_name:'伺服器讀回姓名',mobile:'0922222222'};await retry.click();
 await expect(form.getByLabel('顯示名稱',{exact:true})).toHaveValue('合成修改姓名');
 await expect(form.getByLabel('手機',{exact:true})).toHaveValue('0911111111');
 await form.getByRole('button',{name:'儲存基本資料',exact:true}).click();
 try{await expect.poll(()=>writes).toBe(1);await expect(form.getByLabel('手機',{exact:true})).toBeDisabled();await form.dispatchEvent('submit');expect(writes).toBe(1);await expect(retry).toBeDisabled();}finally{release();}
 await expect(basic.getByRole('alert')).toHaveText('儲存失敗，請稍後再試。');
 await expect(form.getByLabel('顯示名稱',{exact:true})).toHaveValue('合成修改姓名');
 await form.getByRole('button',{name:'儲存基本資料',exact:true}).click();
 await expect(basic.getByRole('status').filter({hasText:'已儲存。'})).toHaveText('已儲存。');
 await expect(basic.getByRole('alert')).toContainText('目前無法確認基本資料');await expect(form).toHaveCount(0);expect(writes).toBe(2);
 failed=false;await retry.click();await expect(form.getByLabel('手機',{exact:true})).toHaveValue('0911111111');
 await page.reload();await expect(form.getByLabel('顯示名稱',{exact:true})).toHaveValue('合成修改姓名');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('birthday retries malformed results, retains rejected input, blocks duplicate saves and clears consent with a removed date',async({page})=>{
 test.skip(!process.env.RCSCA_E2E_EMAIL||!process.env.RCSCA_E2E_PASSWORD,'Disposable member required');
 let malformed=true,writes=0,release=()=>{},record={...history,birth_date:history.birth_date as string|null};
 await page.route('**/rest/v1/rpc/member_history_self',r=>r.fulfill({contentType:'application/json',body:JSON.stringify(malformed?null:record)}));
 await page.route('**/rest/v1/rpc/member_birthday_save',async route=>{
  writes++;
  if(writes<=2)expect(route.request().postDataJSON()).toEqual({p_birth_date:'1992-02-29',p_greetings:true});
  if(writes===1){await new Promise<void>(resolve=>{release=resolve;});await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({message:'invalid_birthday'})});return;}
  if(writes===2){record={...history,birth_date:'1992-02-29',greetings_consent:true};malformed=true;}
  else{expect(route.request().postDataJSON()).toEqual({p_birth_date:null,p_greetings:false});record={...record,birth_date:null,greetings_consent:false};}
  await route.fulfill({status:204,body:''});
 });
 await login(page);
 const panel=page.getByRole('region',{name:'會籍與生日資料',exact:true}),form=panel.getByRole('form',{name:'生日資料',exact:true}),retry=panel.getByRole('button',{name:'重新讀取會籍與生日',exact:true});
 await expect(panel.getByRole('alert')).toContainText('目前無法確認會籍與生日資料');await expect(form).toHaveCount(0);
 await expect(page.getByRole('region',{name:'基本資料',exact:true}).getByRole('form')).toBeVisible();
 malformed=false;await retry.click();await expect(form.getByLabel('生日',{exact:true})).toHaveValue('1990-02-28');
 await form.getByLabel('生日',{exact:true}).fill('1992-02-29');await form.getByRole('checkbox').check();
 record={...record,birth_date:'1991-03-01'};await retry.click();
 await expect(form.getByLabel('生日',{exact:true})).toHaveValue('1992-02-29');await expect(form.getByRole('checkbox')).toBeChecked();
 await form.getByRole('button',{name:'儲存生日資料',exact:true}).click();
 try{await expect.poll(()=>writes).toBe(1);await expect(form.getByLabel('生日',{exact:true})).toBeDisabled();await form.dispatchEvent('submit');expect(writes).toBe(1);await expect(retry).toBeDisabled();}finally{release();}
 await expect(panel.getByRole('alert')).toHaveText('請填寫有效生日，不能晚於今天。');await expect(form.getByLabel('生日',{exact:true})).toHaveValue('1992-02-29');
 await form.getByRole('button',{name:'儲存生日資料',exact:true}).click();await expect(panel.getByRole('status').filter({hasText:'生日資料已儲存。'})).toHaveText('生日資料已儲存。');
 await expect(panel.getByRole('alert')).toContainText('目前無法確認會籍與生日資料');await expect(form).toHaveCount(0);expect(writes).toBe(2);
 malformed=false;await retry.click();await expect(form.getByRole('checkbox')).toBeChecked();
 await form.getByLabel('生日',{exact:true}).fill('');await expect(form.getByRole('checkbox')).not.toBeChecked();await expect(form.getByRole('checkbox')).toBeDisabled();
 await form.getByRole('button',{name:'儲存生日資料',exact:true}).click();await expect(panel.getByRole('status').filter({hasText:'生日資料已儲存。'})).toHaveText('生日資料已儲存。');
 await page.reload();await expect(form.getByLabel('生日',{exact:true})).toHaveValue('');await expect(form.getByRole('checkbox')).not.toBeChecked();
 expect(writes).toBe(3);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
