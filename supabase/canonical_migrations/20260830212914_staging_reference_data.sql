-- Canonical export recovered read-only from Staging migration history.
-- Version: 20260830212914; name: staging_reference_data

-- Non-personal staging reference data only. No real members, beneficiaries, enterprises, IDs or finances.

insert into public.activities (code,name,category,status,public_summary)
values
 ('STG-MIDAUTUMN','中秋共享行動｜測試','care','draft','僅供 Staging 流程測試，不代表真實活動'),
 ('STG-CONNECT','1% 共享連結｜測試','connection','draft','僅供 Staging 流程測試')
on conflict (code) do nothing;

insert into public.enterprises (tax_id,legal_name,display_name,industry,region,public_description,status)
values
 ('STG000001','測試企業甲股份有限公司','測試企業甲','餐飲','台北','Staging 假資料，不代表真實企業','approved'),
 ('STG000002','測試企業乙有限公司','測試企業乙','專業服務','新北','Staging 假資料，不代表真實企業','approved')
on conflict (tax_id) do nothing;

insert into public.enterprise_shares (enterprise_id,share_type,title,description,status,public_result)
select id,'benefit','測試會員共享禮遇','僅供前台與權限流程測試','approved',true
from public.enterprises where tax_id='STG000001'
and not exists (select 1 from public.enterprise_shares es where es.enterprise_id=public.enterprises.id and es.title='測試會員共享禮遇');

insert into public.enterprise_shares (enterprise_id,share_type,title,description,status,public_result)
select id,'professional','測試專業共享','僅供 Network 流程測試','approved',true
from public.enterprises where tax_id='STG000002'
and not exists (select 1 from public.enterprise_shares es where es.enterprise_id=public.enterprises.id and es.title='測試專業共享');
