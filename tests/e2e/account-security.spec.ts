import {expect,test,type Page} from '@playwright/test';

async function login(page:Page){
  await page.goto('/login?next=%2Faccount%2Fsecurity');
  await page.getByRole('button',{name:'Email＋密碼',exact:true}).click();
  await page.locator('input[type="email"]').fill(process.env.RCSCA_E2E_EMAIL!);
  await page.locator('input[type="password"]').fill(process.env.RCSCA_E2E_PASSWORD!);
  await page.getByRole('button',{name:'登入',exact:true}).click();
  await expect(page).toHaveURL(/\/account\/security$/);
  await expect(page.getByRole('form',{name:'更新密碼',exact:true})).toBeVisible();
}

for(const kind of ['email','password'] as const){
  test(`account ${kind} update prevents overlapping changes and permits retry after rejection`,async({page})=>{
    test.skip(!process.env.RCSCA_E2E_EMAIL||!process.env.RCSCA_E2E_PASSWORD,'Disposable member credentials required');
    await login(page);
    const emailForm=page.getByRole('form',{name:'變更 Email',exact:true});
    const passwordForm=page.getByRole('form',{name:'更新密碼',exact:true});
    const activeForm=kind==='email'?emailForm:passwordForm;
    let requests=0,release=()=>{};
    const gate=new Promise<void>(resolve=>{release=resolve;});
    await page.route('**/auth/v1/user**',async route=>{
      if(route.request().method()!=='PUT'){await route.continue();return;}
      requests++;
      if(kind==='email'){
        const redirect=new URL(route.request().url()).searchParams.get('redirect_to');
        expect(redirect).toBe(new URL('/auth/callback?next=%2Faccount%2Fsecurity',page.url()).href);
      }
      if(requests===1)await gate;
      await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({code:'validation_failed',msg:'Synthetic update rejection'})});
    });
    try{
      if(kind==='email'&&await page.getByTestId('email-change-unavailable').count()){
        await expect(emailForm.locator('input[type="email"]')).toBeDisabled();
        await expect(emailForm.getByRole('button')).toBeDisabled();
        await emailForm.dispatchEvent('submit');
        expect(requests).toBe(0);
        await expect(passwordForm.getByRole('button')).toBeEnabled();
        return;
      }
      if(kind==='email')await emailForm.locator('input[type="email"]').fill('security-change@example.test');
      await passwordForm.getByLabel('新密碼',{exact:true}).fill('Synthetic retry password 123!');
      await passwordForm.getByLabel('再次輸入',{exact:true}).fill('Synthetic retry password 123!');
      await activeForm.getByRole('button').click();
      await expect.poll(()=>requests).toBe(1);
      await expect(emailForm.getByRole('button')).toBeDisabled();
      await expect(passwordForm.getByRole('button')).toBeDisabled();
      await expect(passwordForm.getByLabel('新密碼',{exact:true})).toBeDisabled();
      await emailForm.dispatchEvent('submit');
      await passwordForm.dispatchEvent('submit');
      expect(requests).toBe(1);
      release();
      const error=kind==='email'?'Email 更新申請未完成':'密碼更新未完成';
      await expect(page.locator('.workflowNotice[role="status"]')).toContainText(error);
      await expect(activeForm.getByRole('button')).toBeEnabled();
      await expect(passwordForm.getByLabel('新密碼',{exact:true})).toHaveValue('Synthetic retry password 123!');
      await activeForm.getByRole('button').click();
      await expect.poll(()=>requests).toBe(2);
      await expect(page.locator('.workflowNotice[role="status"]')).toContainText(error);
      await expect(activeForm.getByRole('button')).toBeEnabled();
    }finally{release();}
  });
}
