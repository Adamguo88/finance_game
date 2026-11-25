# 下一階段 PC 開發與 GitHub issues

2026-11-25（Asia/Taipei），規劃基準 main `7c861c4`。PR #10、#11、#12 已合併，既有財務、存檔、事件庫/影響預覽與多軌重排沿用；PR #14 的 CI 觸發配置已同步至 [CI.md](CI.md)。本頁列的是已建立、尚待實作/驗收的任務，不代表功能完成。

## 執行順序與依賴

| 次序 | Issue | 優先 | 交付 | 依賴 |
|---|---|---|---|---|
| 1 | [#15](https://github.com/Adamguo88/finance_game/issues/15) | P0 | PC 全功能範圍與驗收矩陣 | 盤點既有 #6/#7 與已發布成果 |
| 2 | [#16](https://github.com/Adamguo88/finance_game/issues/16) | P0 | 桌面工作室 UI／UX 與完整流程 | #15 |
| 3 | [#17](https://github.com/Adamguo88/finance_game/issues/17) | P0 | 角色、住宅、職場 2D 建模及資產規格 | #15、#16 |
| 4 | [#18](https://github.com/Adamguo88/finance_game/issues/18) | P1 | PixiJS 場景與多人生同步 | #16、#17 |
| 5 | [#19](https://github.com/Adamguo88/finance_game/issues/19) | P1 | 播放動畫、轉場及可控音效 | #18 |
| 6 | [#20](https://github.com/Adamguo88/finance_game/issues/20) | P1 | 長期時間軸縮放、導覽與密集事件編輯 | #15、#16，可先於 #18/#19 完成 |
| 後續 PC | [#21](https://github.com/Adamguo88/finance_game/issues/21) | P2 | 使用者主導的現金缺口決策 | #15、#16 |
| 後續 PC | [#22](https://github.com/Adamguo88/finance_game/issues/22) | P2 | 可回溯人生回憶錄 | #19、#21 |
| 後續 PC | [#23](https://github.com/Adamguo88/finance_game/issues/23) | P2 | 財務/比較 CSV 及列印報表 | #15、#22 |
| PC 完成閘門 | [#24](https://github.com/Adamguo88/finance_game/issues/24) | P0 | 全功能、UI／UX、建模、效能與真人總驗收 | #15–#23 及既有 #6 真人驗收 |
| 延後 | [#25](https://github.com/Adamguo88/finance_game/issues/25) | 後續 | iPad／手機適配 | #24 完成後才可啟動 |

P0 的總驗收是必須完成的閘門，不代表可以跳過依賴提早結案。先執行 #15，再推進 #16/#17；本輪只安排任務，沒有啟動額外代理或實作新功能。

## 原討論差距與 PC 完成矩陣

目前生效的逐項範圍、P01–P10 對照、桌面瀏覽器/尺寸與完成證據見 [PC_SCOPE.md](PC_SCOPE.md)（#15）。核對原討論後補上 #27 完整財務事件庫契約、#28 角色造型/視覺資料還原、#29 多筆財務初始化；三項同樣是 #24 的前置，不能悄悄排除。

## 功能、建模與驗收界線

- PC 全部已納入規劃的功能、UI／UX 與建模完成並驗收後，才處理 iPad／手機；保留既有響應式程式與測試。
- 建模先以目前核准的 2D 角色/場景與可修改資產為範圍，包含工作、職涯暫停、租屋、購屋、房貸及缺口等狀態。3D、AI、後端仍不在範圍。
- 新財務事件不因規劃 issue 而視為已核准公式；先透過 #15 確定範圍，再訂數值契約、版本與遷移測試。#21 優先連結現有事件/分支，不自動借款或替使用者決策。
- #6 的真人驗收與 #7 的既有追蹤保留，不重建已完成事件庫/時間軸，也不自動關閉舊 issues。
- 各 issue 含範圍、依賴、可勾選驗收條件及 CI/交付要求。建立紀錄可由 [NEXT_ISSUES.json](NEXT_ISSUES.json) 核對；[ISSUES.json](ISSUES.json) 是初始 #1–#7 的歷史原稿，不應重新批次建立。

## 每項交付方式

先確認規格及依賴，以獨立可審查 PR 交付；更新 VALIDATION 的實測結果，核對最新 head 的 CI。指向 main 的 PR 會觸發驗證，功能分支單純 push 不觸發；依使用者授權合併後，main 才觸發 Pages 發布。自動測試、代理截圖、真人驗收與正式部署分開記錄，未執行的項目不得填成通過。

## 本次執行授權

使用者已明確要求「按照優先順序開始執行 Issue，測試成功後自動 merge」。先 #15 範圍矩陣（已以 PR #30 合併），再 #16 PC 旅程/桌面工作室、#17 角色/場景資產；每階段核對最新 head CI 後自動合併並另外確認 Pages。真人驗收不得代填，行動端仍延後。
