# 歷史會員有效年資計算規格（2026 年底名冊匯入）

狀態：已確認業務規則；資料表、匯入與認領流程尚待實作及測試。

## 已確認：B 方案
- 一般會員的「累積有效會員年資」只計算實際完成繳費且經協會核實的會籍年度，每個年度最多計入一次。
- 未繳費或無法確認繳費的年度不計入；中斷後續會，已核實的歷年有效年數保留，不重置。
- 原始入會日期獨立保存，不作為自動計算有效年資的依據。
- 永久會員不應被要求逐年繳費。其有效年資依永久會員生效日及協會既定永久會籍效期計算，須另確認永久會籍的計年口徑。
- 歷史資料若只有姓名、入會日期、身分別，而無年度繳費證明，不得推算一般會員有效年資。

## 建議資料模型
- members: id, original_joined_at, membership_type, permanent_effective_at, legacy_import_batch_id, claim_status
- membership_years: member_id, membership_year, payment_status, verified_at, verified_by, source_reference；(member_id, membership_year) 唯一
- membership_claims: member_id, auth_user_id, status, verified_method, reviewed_by, reviewed_at；避免一會員重複認領
- 以 verified 的 membership_years COUNT(DISTINCT membership_year) 計算一般會員有效年資；未核實不得計入。
- 不公開身分證號或完整聯絡資料，認領需驗證與審核；匯入名冊只供授權管理員存取。

## 待驗收
1. 匯入 2018、2019、2020、2024、2025 年繳費資料，年資應為 5 年。
2. 同一年重複匯入不可重複計年。
3. 無繳費證據不得自動推算。
4. 會員註冊認領後須顯示正確年資且不能自行改動。
5. 永久會員計年口徑須在正式實作前與協會確認。
