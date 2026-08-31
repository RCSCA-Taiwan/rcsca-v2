-- Staging-only public sample data. Do NOT run in production with real identities.
insert into public.activities(code,name,category,status,public_summary)
values
('MID-2026','2026 中秋物資認購','care','active','育幼院、弱勢家庭與需要被接住的生活需求。'),
('CARE-SAMPLE','共享關懷行動示例','care','completed','用於 staging UI 測試。')
on conflict (code) do nothing;

insert into public.enterprises(tax_id,legal_name,display_name,industry,region,public_description,status)
values
('00000001','測試空間股份有限公司','測試空間','室內設計','新北','Staging 測試企業。','approved'),
('00000002','測試餐飲股份有限公司','測試餐飲','餐飲','台北','Staging 測試企業。','approved')
on conflict (tax_id) do nothing;
