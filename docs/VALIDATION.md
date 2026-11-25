# v0.2 財務切片實作（2026-11-25，Asia/Taipei）

依使用者核准的計畫在 `codex/v02-financial-slice` 開發，基準為 main 2acea22 與設計提交 99eb0c9。目標截止為台北時間 13:00。這是未合併的開發成果，不代表 #6 真人驗收或正式發布已完成。

## 實際變更
- V1 model/engine 複製為獨立模組；已以逐字比較確認 V1 引擎除 import 路徑外相同。公開路由依 engineVersion 分派，schema=2 可保存不同版本的根方案，跨版本父子關係拒絕。
- V2 生活費/租金分列、購屋 opt-in 停租、租金與薪資事件、最多 20 筆既有負債排程；未分配負債固定，第一付款月前不累息，本金不重複扣入生活費。快照拆開房貸與其他負債明細。
- 顯式轉換 schema=1 全專案與 history，保留 IDs、revision/profile.version 與分支關係；對所有方案的全部月份逐分核對通用輸出。不一致或轉換超過 2 MB 拒絕。預覽需先下載原始備份，再確認；轉換不寫 IndexedDB。
- 介面新增排程、事件與比較明細、原始備份/取消/確認轉換。匯入或載入成功後重設表單草稿，失敗保留工作。事件驗證錯誤顯示於視窗內，視窗外內容 inert。
- 修正比較頁的年齡表意：頂部顯示共同經過月份，各卡顯示自己的年齡與引擎，避免未勾選的短方案顯示超過 90 歲。
- JSON 以緊湊格式輸出，UTF-8 字節限制與匯入一致，接近 2 MB 的有效存檔仍能 round trip。錯誤訊息不暴露 Zod schema 內部 JSON。

## 實際執行結果（截至本次提交）
- `npm ci --cache /tmp/life-studio-npm-cache`：通過，67 packages。
- `npm test`：55/55 通過，包含 19 項既有測試、8 組 V2 fixtures、貸款利率/期數邊界、取整、缺口、遷移所有月份一致、history、分支隔離、超限拒絕、UTF-8 與備份 round trip。
- `npm run typecheck`、`npm run build`：通過，輸出仍為純靜態網站。
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`：15/15 通過（26.2 秒），對本輪 out/ 靜態網站驗證。
- `git diff --check`：通過。

## 代理實際 UI 檢視
共享 Chrome 已操作取消升級、下載原始備份、確認轉換、生活費/租金/負債表單與有息排程。12 萬、年利率 12%、12 期的首期明細為付款 10,661.85 元、利息 1,200 元、餘額 110,538.15 元、現金 809,338.15 元。第 6 月建立分支，兩方案數字一致；子方案第 13 月改薪資 7 萬，只該方案現金增加 2 萬，兩方案貸款都已清償。已保存此合成測試資料，並保留比較頁供檢視。

已檢視 390px E2E 全頁截圖：購屋停租顯示月租金 0、現金 959,777.78 元、房貸付款 22,222.22 元；中文、明細、表單與事件卡沒有水平溢出。這是代理視覺驗證，未冒稱真人測試。共享瀏覽器的 Statsig/extension 錯誤不當作應用錯誤；應用無 pageerror/console error 的證據以隔離 E2E 流程為準。

## 限制與後續
- #6 真人驗收仍開啟，本輪不自動合併、不關閉 #7。獨立 Code review、Safari/Firefox、讀屏與正式使用者測試尚未執行。
- 升級只接受 schema=1 全專案；schema=2 混合專案可讀寫/比較，不支援再次升級或降版；回復靠原始 V1 備份。初始範例仍沿用 V1，需明確升級後使用新功能。
- 第一付款月前不累息是明示簡化；沒有新借款、提前還款、違約、稅費、通膨、投資、保險或房產出售。
- 事件庫擴張、多軌拖曳與 PixiJS/動畫未納入本輪，沿用原討論後續順序。

---

# Issue #7：v0.2 設計提案（2026-11-25，Asia/Taipei）

基準 main 2acea22。依使用者「繼續」指示先準備設計，不將 #6 真人驗收視為完成，也不在本輪啟用 v0.2 財務功能。

## 本輪變更
- 新增 docs/V02_FINANCIAL_CONTRACT.md：生活費/租金拆分、購屋停止租金 opt-in、既有負債分配與排程、rentChange/incomeChange、月度順序、快照語意、分支歷史、schema=2 / engine=2.0.0 目標與顯式遷移。
- 新增 docs/fixtures/v02-financial-contract.json：8 組設計預期值，金額單位為分，明標 proposed-not-implemented。
- 更新 ROADMAP 的設計進度。生產程式、現用 schemaVersion=1 / engineVersion=1.0.0 未改。

## 實際執行
- Python 標準庫 json 解析 fixtures，Decimal + ROUND_HALF_UP 獨立參考計算：8 組、78 個預期欄位全相符。例：12 萬本金/12%/12 期，月付 10,661.85 元、首期利息 1,200 元、末期 10,661.91 元。此檢查只核對提案數值，**不是 V2 引擎測試**。
- `npm ci --cache /tmp/life-studio-npm-cache`：通過，67 packages。
- `npm test`：19/19 通過（現有 V1 引擎）。
- `npm run typecheck`、`npm run build`：通過，靜態輸出。
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`：9/9 通過（14.5 秒），既有靜態 HTTP server 提供本輪 out/。
- `git diff --check`：通過。

## 待完成
設計待審；V2 strict schema、版本路由、遷移、引擎與 UI/E2E 實作尚未進行。#6 真人操作清單仍開啟，#7 不結案；本設計分支開 draft PR 供審查，不自動合併。轉換前備份、延後付款不累息、同月租金事件優先等產品語意已寫明供審查，不能宣稱已上線。

---

# PR #8 合併前審查（2026-11-25，Asia/Taipei）

審查基準：d294e776f3af6899d7e9de05254375ba4fd8b519。GitHub PR #8 為 open/mergeable，無 review submissions，沒有冒稱取得獨立審核者核准。GitHub Actions [run 45540307064](https://github.com/Adamguo88/finance_game/actions/runs/45540307064) completed/success。

## 本輪代理實際 UI 操作（共享 Chrome、靜態 out/）
- 第 12 月：現金 1,040,000 元、淨資產 1,240,000 元。
- 更新現金 300 萬、收入支出零；第 1 月零利率購屋：現金 977,777.78 元、資產 10,200,000 元、負債 7,977,777.78 元、淨資產 3,200,000 元、付款 22,222.22 元。
- 改為 2.5%：首期 31,609.67 元、利息 16,666.67 元。第 360 月負債零、末期付款 31,610.66 元；第 361 月付款與利息皆零，切換體驗模式仍為第 361 月。末期按剩餘本息調整，符合 ARCHITECTURE.md。
- 失業第 2、3 月替代收入 1 萬，第 4 月恢復 5 萬；工作場景同步。
- 第 6 月建立分支：初始資料與已發生事件的編輯/刪除控制 disabled；加入第 13 月失業，兩方案第 6 月數字一致，第 13 月才分歧。12× 播放時兩方案月份一致，負現金顯示缺口。
- 儲存成功 → 重新整理 → 讀取成功，恢復兩方案、購屋與失業事件。實際下載 JSON，再由檔案選擇器匯入成功；還原後第 13 月分歧仍正確。
- 已檢視比較畫面、鍵盤焦點與場景。手機 390px、錯誤匯入、容量失敗、最短終點停止依本 PR 既有 E2E 與成功 CI 證據；本輪沒有冒稱再次手動執行這些項目。
- 共享瀏覽器工具有 Statsig 網路錯誤，瀏覽器 extension metadata console 錯誤來源為 chrome-extension://；與應用程式錯誤分開。應用無 console/pageerror 的證據以隔離 E2E 成功結果為準。

## 逐項處置
#1–#5 的規格、數值與使用者行為驗收已有測試、CI 及上述代理 UI 證據，PR 合併後可逐項記錄結案。#6 的「人工完成 PRD 驗收」仍保留給真人使用者：代理操作不替代真人驗收，因此 #6 保持開啟，v0.1 尚未宣告發布完成。Safari/Firefox、讀屏及正式使用者可用性評估仍未執行。#7 依賴 v0.1 驗收，不在本輪實作。

# GitHub 交付更新（2026-11-25，Asia/Taipei）

使用者更新 GitHub App 倉庫授權後，已確認 Adamguo88/finance_game 列入授權清單且 push=true。`git push -u origin codex/acceptance-issues-1-6` 成功，包含 5cf56a2 與 3bef203 的開發與驗收成果。下方各輪 403 記錄為當時的歷史狀態，已解除；遠端 CI 與人工發布審查仍須分別確認。未自動合併或關閉 issues。

---

# 規格逐項開發續作（2026-11-25，Asia/Taipei）

延續本地提交 5cf56a2，依 v0.1 的 S3 → S4 → S5 補完顯示與驗證缺口。沒有新增 v0.2 事件或變更財務公式、engineVersion。

## 實作
- 所有財務金額最多顯示兩位小數，保留分的精度；整數金額維持簡潔。零利率購屋算例畫面現在顯示付款 22,222.22 元、現金 977,777.78 元、房貸 7,977,777.78 元。
- 單人生與比較卡新增「其他／房屋資產」，直接消費 Snapshot.assets，與可動用現金分列。

## 新增行為驗證
- 透過表單設定 PRD 零利率購屋算例，核對現金、資產、房貸、淨資產與本息；刪除事件後回復基準與租屋場景。
- 畸形 JSON、循環分支、重複方案 ID、超過 2 MB 的檔案匯入失敗後，原月份、財務數字與先前 IndexedDB 存檔維持不變。
- 以瀏覽器測試注入 QuotaExceededError，確認錯誤訊息、保留工作、解除 busy 狀態；直接寫入損壞的 IndexedDB 資料，載入拒絕且不取代現況。
- 失業第 2–3 月收入 1 萬、第 4 月回復 5 萬；回溯與重播場景一致。修改期間後立刻重算；下載 JSON 確認 revision 與修改前/後的完整事件參數。

## 本次實際命令
- `npm ci --cache /tmp/life-studio-npm-cache`：成功，67 packages。
- `npm test`：19/19 通過。
- `npm run typecheck`、`npm run build`：通過，純靜態輸出。
- 靜態 out/ 由既有獨立 HTTP server（3100）提供。`PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`：9/9 通過（15.6 秒）。
- `git diff --check`：通過。

## 仍待審查
完整人工 PRD 逐步操作、Safari/Firefox、讀屏審查未執行。GitHub 403 的既有交付阻礙仍未解除，本輪未再次嘗試推送、未建立 PR、未關閉 issues；本地成果不等同發布完成。

---

# 本次 issues #1–#6 驗收（2026-11-25，Asia/Taipei）

在本次 Codex 工作區 `/workspace/finance_game` 執行 docs/CODEX_TASK.md，基準 aae8d73；未啟動另一個背景 Cloud/CLI 任務。以下是本次重跑結果；後方保留的「初始交付紀錄」不代表本次執行。

| Issue | 本次證據 | 審查狀態 |
|---|---|---|
| #1 / S0 | npm ci、TypeScript、Next.js 靜態輸出成功；規格文件齊全 | 技術檢查通過，待 PR 審查 |
| #2 / S1 | 基準現金流、購屋淨資產、零/2.5% 利率首末期、失業起訖、缺口、決定性與極小利率/一分本金測試 | 單元測試通過，財務公式未變 |
| #3 / S2 | 分支深拷貝、歷史鎖定、跨月失業、父子隔離、版本參數與 JSON round trip | 單元測試通過；補驗歷史內事件語意 |
| #4 / S3 | 買房/失業新增、未來事件修改、SVG 狀態、播放/暫停、模式時間保留、鍵盤視窗循環與 Escape | 自動流程通過；完整人工 PRD 情境仍待審查 |
| #5 / S4 | 同月比較、最短終點停止、存檔/reload/load、JSON 備份與未知版本拒絕後仍保留方案 | 自動流程通過；修正未勾選短方案限制比較月份 |
| #6 / S5 | Chromium 5/5 E2E、390px 無溢出、完整流程 console error/pageerror 為零；桌面與手機完整截圖已檢視，中文字正常 | 未完成發布審查：PR 受 GitHub 403 阻擋；未宣告 issues 完成 |

## 本次命令與結果
- `npm ci` 首次失敗：預設 `/home/agent/.npm` 快取無法建立；`npm ci --cache /tmp/life-studio-npm-cache` 成功，安裝 67 packages。
- Node `v24.22.3`；`npm test`：19/19 通過。
- `npm run typecheck`：通過；`npm run build`：通過，輸出 `out/`（主頁、404 與靜態 icon.svg）。
- `npx playwright install --with-deps chromium`：失敗，系統依賴安裝需要 root，su 驗證失敗。
- 一般瀏覽器安裝先遇到快取目錄錯誤；改 `PLAYWRIGHT_BROWSERS_PATH=/tmp/life-studio-browsers npx playwright install chromium` 後 CDN 回覆 403 Domain forbidden。
- 未安裝 Playwright 專用瀏覽器的 E2E 啟動失敗；改用 `/usr/bin/chromium`（156.0.8078.79）。曾因兩次測試伺服器生命週期重疊導致 connection refused，之後改用獨立靜態伺服器。
- `python -m http.server 3100 --directory out --bind 0.0.0.0` 後執行 `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`：最終 5/5 通過（11.8 秒）。第一次靜態測試發現 favicon 404，補入 icon.svg 後 console 檢查通過。
- `git diff --check`：通過。

## 修復與規格假設
1. 匯入的 history 也必須符合事件語意（自備款、重複 ID、重疊失業等）；保持 schemaVersion/engineVersion，因為財務公式未變。
2. 比較共同終點僅由勾選方案決定；未勾選的目前人生不限制比較。比較月索引與單一人生快照取值分開，避免短方案截斷畫面。
3. 事件視窗自動取得焦點、Tab/Shift+Tab 留在視窗、Escape 關閉並返回觸發按鈕。
4. E2E 可選擇系統 Chromium 路徑；未設定時維持 Playwright 預設瀏覽器。

## 尚待完成與交付阻礙
- `git push --dry-run`：403 permission denied；GitHub 整合 `create_branch`：403 Resource not accessible by integration。因此無遠端分支、PR URL 或遠端 CI 執行結果。本地分支 `codex/acceptance-issues-1-6` 保存變更；沒有自動合併或關閉 issues，#7 未實作。
- PRD 的完整人工逐步驗收、Safari/Firefox、讀屏與完整無障礙審查仍未執行；本次截圖只檢視初始桌面/手機版。
- IndexedDB quota/寫入失敗及所有畸形匯入的瀏覽器互動尚未逐一模擬；目前涵蓋未知版本保留工作、正常存讀檔與 domain 歷史語意拒絕。

---

# 初始交付紀錄（以下為既有歷史，非本次重跑）

# 實際驗證與整合狀態
日期：2026-11-25（Asia/Taipei）。

## 已執行：核心計算與分支不變性
Node.js 24、Vitest 5.1.1，npm test：17/17 通過。
覆蓋：12 月基準收支、購屋資產轉換、零利率、2.5% 房貸首末期、失業起訖、負現金缺口、重播決定性、輸入不變、重疊事件拒絕、深拷貝、歷史鎖定、父子隔離、版本歷史、跨分支點失業、同月事件排序、18 歲至 90 歲邊界、未知版本與無效分支拒絕。
先完成核心測試，再接 UI；新增版本歷史與播放邊界後重新驗證。

## 已執行：依賴、型別與建置
- npm ci：通過，安裝 69 個套件；安裝時 npm audit 回報 0 個已知漏洞，這不是安全審計。
- npm run typecheck：通過。
- npm run build：通過；Next.js 16.4.6 靜態輸出至 out/，沒有應用程式 API/backend。
- node --check scripts/create-issues.mjs：通過（僅語法檢查，未執行 GitHub 寫入）。
- package.json 與 package-lock.json 固定精確版本，Node 24 寫入 .nvmrc。
遠端環境原本為 Node 25，不符合 Vitest 要求；後續所有測試與建置都使用隔離安裝的 Node 24。

## 已執行：瀏覽器流程
Playwright Chromium，先在開發伺服器驗證，再直接對 build 產生的 out/ 靜態網站測試。最後結果：3/3 通過。
1. 買房、失業、分支前事件鎖定、編輯未來失業、同月場景比較、播放暫停、IndexedDB save/reload/load、JSON 匯出/匯入、錯誤版本拒絕。流程監聽 pageerror，沒有未處理頁面錯誤。
2. 390 x 844 手機 viewport 無水平溢出。
3. 不同期間方案採最短共同終點，終點暫停，跨模式月份保留。

第一次瀏覽器測試暴露初次 hydration 前按鈕互動可能遺失，已讓互動介面在準備完成後呈現。測試定位另排除 Next.js 開發工具 SVG，不把工具圖示當人生場景。比較終點控制已加入回歸測試。

## 已執行：畫面檢視
檢視靜態網站完整頁面。遠端初次缺中文字型造成方框，改用 @fontsource/noto-sans-tc 自帶字型，再次檢視正常。沒有線上字型要求。
主畫面、財務卡、時間軸及側欄已檢視；瀏覽器測試驗證比較與編輯操作。未宣稱全瀏覽器、WCAG 或完整效能審查。

## 已完成：GitHub repository、推送與 issues
實際 repository：https://github.com/Adamguo88/finance_game ，公開，使用者明確同意使用。
GitHub 整合 metadata 可讀，但 create_file/create_issue 回傳 403 Resource not accessible by integration。之後改用本機既有 Git 登入，push dry-run 與實際 push 成功；本機相同授權透過 GitHub REST 建立 7 個分階段 issues #1–#7，包含驗收、優先級與依賴連結。
初始程式提交：b86dd13492be30bc580964f8e3af23b56f1a4abc 。未覆蓋原有程式，遠端原先為空倉庫，沒有強制推送。
沒有建立額外 GitHub Projects 看板，分階段工作以 issues 管理；所有 issues 保持開啟等待後續審核。
憑證僅在 Git/API 請求期間使用，沒有輸出或存入專案。

## 已執行：GitHub Actions
首次執行：https://github.com/Adamguo88/finance_game/actions/runs/45536245532
npm ci、npm test、npm run typecheck、npm run build、npx playwright install --with-deps chromium、npm run test:e2e 各步驟已成功。
最終 workflow 狀態：completed；結論：success。
本次新增的專案更新僅調整 repository/交接文件與 issue 工具目標，沒有修改已驗證的引擎與 UI。

## 未完成：Codex Cloud
遠端容器可使用 shell，且有 codex CLI，但 codex login status 回報 Not logged in。沒有可用的已登入 Codex Cloud 任務提交整合，沒有背景 Codex agent 在執行。
本次程式編寫、測試與建置由本對話透過遠端 shell 完成；不能稱為 Codex Cloud 任務已啟動。docs/CODEX_TASK.md 提供可直接貼入 Codex 的任務。

## 已知產品限制
- 金額為新臺幣分；固定薪資、房價、支出、利率。
- 無交易稅費、通膨、投資報酬、租金自動替換、原始負債攤還或出售資產。
- 一個方案最多一間房、100 事件；專案最多 20 方案、每方案 1000 筆修改歷史，整體資料上限 2 MB。
- 分支保留建立時的初始資料與已發生事件，不能修改分支初始資料。
- 匯入僅支援 schemaVersion=1 / engineVersion=1.0.0；不提供 migration。
- 本地存檔限此瀏覽器，無跨裝置同步。重新整理後需按「讀取」，匯出檔為備份。
- 尚未進行使用者可用性評估、Safari/Firefox 測試或完整鍵盤焦點/讀屏審查。
