import {test,expect} from '@playwright/test';

test('unopened public registration gives a clear participation route and preserves existing-account destination',async({page})=>{
 await page.goto('/register?type=enterprise');
 const notice=page.getByTestId('registration-unavailable');
 test.skip(await notice.count()===0,'Registration is enabled in this verified-email test environment.');
 await expect(notice).toContainText('線上註冊暫未開放');
 await expect(notice.getByRole('link',{name:'了解參與方式 →',exact:true})).toHaveAttribute('href','/guide');
 await expect(page.locator('form.authForm')).toHaveCount(0);
 const login=page.getByRole('link',{name:'登入 →',exact:true});
 await expect(login).toHaveAttribute('href','/login?next=%2F1percent-partner%2Fapply');
 await login.click();
 await expect(page).toHaveURL(/\/login\?next=%2F1percent-partner%2Fapply$/);
 await expect(page.getByLabel('密碼',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'寄送登入連結',exact:true})).toHaveCount(0);
 await page.getByRole('link',{name:'忘記密碼？重新設定 →',exact:true}).click();
 await expect(page.locator('form.authForm')).toHaveCount(0);
 await expect(page.getByText('Email 寄信服務準備中，目前請使用已設定的密碼登入。',{exact:true})).toBeVisible();
});
