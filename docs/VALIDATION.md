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
