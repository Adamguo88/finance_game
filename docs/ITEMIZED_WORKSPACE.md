# 分項存檔的讀取、檢視與保存（#43切片）

本輪接入workspace版本邊界；不代表#43全部完成，也不取代#44事件編輯或#51完整生活世界。財務／遷移規則見[ITEMIZED_FINANCIAL_CONTRACT.md](ITEMIZED_FINANCIAL_CONTRACT.md)，完整產品責任見[PC_SCOPE.md](PC_SCOPE.md)。

## 版本與操作邊界

| 容器 | 解析／運算 | 畫面與保存 |
|---|---|---|
| schema1–4 | 原parseProject、V1／V2原引擎 | 原工作室、原表單／預覽／分支及舊升級入口維持原行為 |
| schema5 | parseProjectV5驗原始來源／映射／baseline；Scenario按自身engineVersion重播 | 分項工作室提供月度檢視、資金來源、混合版本比較、命名分支、JSON匯入／匯出及IndexedDB另存 |

workspace.parseStoredProject分派容器，不把engine3資料交給舊ProfileForm或changeProfile。原ProjectSchema仍只接受schema1–4，是舊型別的明確邊界；產品storage改走workspace邊界。schema5中的V1／V2根人生仍由原引擎運算，但留在同一完整容器中檢視，不抽出來交給舊表單覆寫來源紀錄。V3命名分支與修改管理見[ITEMIZED_MUTATIONS.md](ITEMIZED_MUTATIONS.md)；參數／事件編輯表單仍待#44。

共用財務總覽顯示實際總貸款本息：舊版房貸與其他排程相加，V3使用自己的total payment／interest。原simulateForDisplay及舊Ledger不改，避免把畫面欄位正規化誤稱公式變更。分項／flow直接消費V3快照，不在React計息、推測職涯、家庭或額外費用。

## 匯入、本機與還原

- IndexedDB沿用DB version1、projects的current key；存放版本聯集，不新增store或無聲轉換舊資料。
- 匯入先檢查UTF-8 2 MB及完整版本／來源／分支／history，再替換目前工作；不自動寫DB。失敗保留目前工作與月份。
- 儲存先完整校驗，再寫入current；讀取先校驗再替換工作。損壞本機資料不替換目前工作，也不偷偷清除資料庫。
- 匯出保留整個容器、來源、映射及history，不能只匯出畫面上的快照或選中方案。來源備份與映射同算2 MB。解析schema5時重播每個current／history的全期間，後續累積超出安全整數也拒絕，不能只驗目前月。
- 首頁摘要以目前人生實際快照月份／年齡顯示，即使比較已超過該人生終點亦不冒稱較晚月份的餘額。首頁／取消建立保留分項工作與月份；明確匯入或確認建立另一人生才更換工作。新舊容器切換按版本重新掛載適合的工作室，不沿用不相容的表單草稿。
- 比較共用經過月份，以選中方案最短期間為上限，標示每個人生的年齡與財務模型；不為了比較自動重算舊版。播放／捲動／選擇只改檢視，不增加revision或history。

大額金額以BigInt分拆整數元／分顯示，避免safe integer分除以100後的浮點格式誤差；不改財務公式。事件清單共用引擎既有階段／依賴排序，不以單純sequence列表冒充執行順序。

## 驗證與未完成項

本輪新增5項PC瀏覽器案例：完整來源／history的schema5匯入、指定收入逐月值、IndexedDB儲存／重新讀取及JSON往返；混合版本比較及切回舊格式；首頁／取消建立保留目前工作；損壞IndexedDB拒絕並保留工作；格式合法但未來溢出的資料拒絕。具體執行結果記於[VALIDATION.md](VALIDATION.md)，未執行的步驟不標通過。

根路徑production build初始gzip JS為280,198 bytes、全部chunks469,490 bytes；按HTML script URLs去重逐檔gzip(mtime=0)，較#28基準分別增加10,103 bytes。這不是合法上限資料的互動延遲、真人瀏覽器或硬體60fps證據。

仍待：讓使用者在畫面完成原始備份下載、每revision顯式來源映射、差異確認／取消與工作套用的完整遷移流程；V3編輯表單與#44指定事件設定；完整演出／世界、報表及PC總驗收按既定順序執行。不能因讀取／保存已接通就關閉#43或#24。
