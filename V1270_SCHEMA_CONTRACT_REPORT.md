# V1270 Schema Contract 報告

日期：2026-09-02  
環境：RCSCA V2 Staging

## 目的

版本庫早期 migration 不完整，目前仍不能從空白資料庫重建 Staging。Schema Contract 先建立目前已驗證狀態的結構與權限指紋，用來偵測未被 migration 記錄的遠端變更。

## 基準

| 類別 | 數量 | MD5 |
| --- | ---: | --- |
| Tables | 37 | 728833be8d60f094afd61a4b3fe64beb |
| Columns | 457 | e703ebc2fe09566aaa43f44c973b46ae |
| Constraints | 127 | b29ed30988d93204ae939ca5c3598ae8 |
| Indexes | 135 | 6aa888751d4b7a7a46bafea650e3abcf |
| Views | 13 | 3707a5d14af8de509fed729d662d89b9 |
| Policies | 61 | db909e6583efaa4edeef06a41a086b3a |
| Functions | 72 | b859baea8305bebbd7511362e102a95f |
| Triggers | 6 | c57eddc54c26ae57263b09a4341c454c |
| Relation grants | 1038 | c0c4839a93bb52abb07c0883d3769f5a |
| Routine grants | 118 | 461323210a9366dbd15377f596902bc9 |

## 驗證方式

執行 supabase/tests/v1270_schema_contract.sql。10 個欄位均為 true 才代表與 V1270 基準一致。

## 限制

Schema Contract 是 drift detector，不是 schema dump，無法用來重建資料庫。完整 baseline 仍需 Supabase CLI、Docker 與 linked database credentials 執行 db pull，再以 db reset replay 驗證。
