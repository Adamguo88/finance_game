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

## 更新：GitHub repository 與 issues
實際 repository：https://github.com/Adamguo88/finance_game ，公開，使用者明確同意使用。
GitHub 整合可讀取 metadata；倉庫目前為空，沒有分支或 issues。metadata 顯示帳號具 admin/push，但實際 create_file 與 create_issue 均回傳 403 Resource not accessible by integration，整合寫入授權尚未成立。
因此尚未成功上傳 commit、建立 issues 或執行 GitHub Actions。已備妥 7 個分階段 issue title/body、驗收與依賴。
本機 Git 可 clone 公開空倉庫；這只證明匿名讀取可用，不代表 push 成功。
本次只修改交接文件與 issue 腳本目標，不修改已測試的財務引擎及介面。前述 17 核心測試與 3 瀏覽器測試是先前遠端實測結果，非本次 GitHub Actions 結果。

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
