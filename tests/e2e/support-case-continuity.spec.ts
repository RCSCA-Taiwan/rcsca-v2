import {expect,test,type Page} from '@playwright/test';
const id='17700000-0000-4000-8000-000000006301',path='/account/requests/support/'+id;
const record={id,title:'合成關懷需求',public_summary:'合成需求摘要',status:'needs_info',created_at:'2026-10-20T01:00:00Z',updated_at:'2026-10-20T01:00:00Z'};
const event={id:'17700000-0000-4000-8000-000000006302',case_id:id,event_type:'needs_info',status:'needs_info',note:'請補充合成資料',created_at:'2026-10-20T01:00:00Z'};
async function login(page:Page){
 await page.goto('/login?next='+encodeURIComponent(path));await page.getByRole('button',{name:'Email＋密碼',exact:true}).click();
 await page.locator('input[type="email"]').fill(process.env.RCSCA_E2E_EMAIL!);await page.locator('input[type="password"]').fill(process.env.RCSCA_E2E_PASSWORD!);
 await page.getByRole('button',{name:'登入',exact:true}).click();await expect(page).toHaveURL(new RegExp(path+'$'));
}
test.beforeEach(()=>{test.skip(!process.env.RCSCA_E2E_EMAIL||!process.env.RCSCA_E2E_PASSWORD,'Disposable member required');});
test('support history failure preserves readable case and draft, and reply success remains visible after readback fails',async({page})=>{
 test.setTimeout(60000);let historyFailed=true,caseFailed=false,sent=false,calls=0,release=()=>{};
 await page.route('**/rest/v1/support_cases?**',r=>{const url=new URL(r.request().url());expect(url.searchParams.get('id')).toBe('eq.'+id);expect(url.searchParams.get('owner_user_id')).toMatch(/^eq\.[0-9a-f-]{36}$/i);return r.fulfill({status:caseFailed?403:200,contentType:'application/json',body:JSON.stringify(caseFailed?{message:'Synthetic rejection'}:{...record,status:sent?'submitted':'needs_info'})});});
 await page.route('**/rest/v1/support_case_events?**',r=>{const url=new URL(r.request().url());expect(url.searchParams.get('case_id')).toBe('eq.'+id);expect(url.searchParams.get('visible_to_owner')).toBe('eq.true');return r.fulfill({status:historyFailed?403:200,contentType:'application/json',body:JSON.stringify(historyFailed?{message:'Synthetic rejection'}:sent?[event,{...event,id:'17700000-0000-4000-8000-000000006303',event_type:'owner_reply',note:'合成補件回覆'}]:[event])});});
 await page.route('**/rest/v1/rpc/owner_reply_support_case',async r=>{calls++;expect(r.request().postDataJSON()).toEqual({p_case_id:id,p_message:'合成補件回覆'});if(calls===1){await new Promise<void>(resolve=>{release=resolve;});await r.fulfill({status:400,contentType:'application/json',body:JSON.stringify({message:'Synthetic rejection'})});}else{caseFailed=true;sent=true;await r.fulfill({contentType:'application/json',body:JSON.stringify(event.id)});}});
 await login(page);const panel=page.locator('.caseDetail'),retry=panel.getByRole('button',{name:'重新讀取案件與歷程',exact:true});
 await expect(panel.getByRole('heading',{name:record.title,exact:true})).toBeVisible();await expect(panel.getByRole('alert')).toContainText('這不代表沒有紀錄');await expect(panel.getByText('案件歷程建立中。',{exact:true})).toHaveCount(0);
 const reply=panel.getByRole('textbox',{name:'補充資料／回覆',exact:true});await reply.fill('合成補件回覆');historyFailed=false;await retry.click();await expect(reply).toHaveValue('合成補件回覆');await expect(panel.getByText(event.note,{exact:true})).toBeVisible();
 await panel.getByRole('button',{name:'送出補充／回覆',exact:true}).click();
 try{await expect.poll(()=>calls).toBe(1);await expect(reply).toBeDisabled();await expect(retry).toBeDisabled();await panel.getByRole('button',{name:'正在送出…',exact:true}).dispatchEvent('click');expect(calls).toBe(1);}finally{release();}
 await expect(panel.getByRole('alert')).toContainText('未能確認送出結果');await expect(reply).toHaveValue('合成補件回覆');
 await retry.click();await expect(reply).toHaveValue('合成補件回覆');await panel.getByRole('button',{name:'送出補充／回覆',exact:true}).click();
 await expect(panel.getByRole('status').filter({hasText:'補充資料已送出。'})).toBeVisible();await expect(panel.getByRole('alert')).toContainText('目前無法讀取案件');await expect(reply).toHaveCount(0);expect(calls).toBe(2);
 caseFailed=false;await retry.click();await expect(reply).toHaveValue('');await expect(panel.getByText('合成補件回覆',{exact:true})).toBeVisible();await expect(panel.getByText('已送出',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
test('unreadable or mismatched case cannot be replied to, and a refreshed closed case is read only',async({page})=>{
 let mode:'unreadable'|'mismatch'|'open'|'closed'='unreadable',calls=0;
 await page.route('**/rest/v1/support_cases?**',r=>r.fulfill({contentType:'application/json',body:JSON.stringify(mode==='unreadable'?{...record,title:{invalid:true}}:mode==='mismatch'?{...record,id:event.id}:{...record,status:mode==='closed'?'completed':'needs_info'})}));
 await page.route('**/rest/v1/support_case_events?**',r=>r.fulfill({contentType:'application/json',body:JSON.stringify([event])}));
 await page.route('**/rest/v1/rpc/owner_reply_support_case',r=>{calls++;return r.abort();});
 await login(page);const panel=page.locator('.caseDetail'),retry=panel.getByRole('button',{name:'重新讀取案件與歷程',exact:true});
 await expect(panel.getByRole('alert')).toContainText('目前無法讀取案件');await expect(panel.getByRole('textbox')).toHaveCount(0);
 mode='mismatch';await retry.click();await expect(panel.getByRole('alert')).toBeVisible();await expect(panel.getByRole('textbox')).toHaveCount(0);
 mode='open';await retry.click();await panel.getByRole('textbox',{name:'補充資料／回覆',exact:true}).fill('未送出的草稿');
 mode='closed';await retry.click();await expect(panel.getByText('案件已結束，目前不能再補充或回覆。',{exact:true})).toBeVisible();await expect(panel.getByRole('textbox')).toHaveCount(0);await expect(panel.getByRole('button',{name:'送出補充／回覆',exact:true})).toHaveCount(0);expect(calls).toBe(0);
 await page.reload();await expect(panel.getByText('已完成',{exact:true})).toBeVisible();
 await expect(panel.getByRole('link',{name:'我的通知 →',exact:true})).toHaveAttribute('href','/account/notifications');await panel.getByRole('link',{name:'回到我的進度 →',exact:true}).click();await expect(page).toHaveURL(/\/account\/requests$/);
});
