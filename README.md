# Life Studio

人生，沒有唯一的劇本。自行安排事件、播放人生與同步比較分支，理解財務選擇如何影響未來。純前端 Next.js + TypeScript，資料保存在此瀏覽器的 IndexedDB，支援 JSON 備份。

## 啟動與檢查

使用 Node.js 24（`.nvmrc`），不需要環境變數或後端服務。

```sh
npm ci
npm test
npm run typecheck
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
npm run dev
```

開啟 http://localhost:3000 。`npm run build` 產生純靜態 `out/`。若使用系統 Chromium，可設定 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`；對靜態伺服器測試時設定 `PLAYWRIGHT_BASE_URL`。

## GitHub Pages

`.github/workflows/pages.yml` 在 main 更新時建置並部署 `out/`，使用 Node.js 24 與官方 Pages artifact/deploy actions。部署建置設定 `NEXT_PUBLIC_BASE_PATH=/finance_game`；本機不設定此變數時仍從根路徑啟動。Pages 的 Source 使用 GitHub Actions，第一次啟用如受權限限制，需倉庫管理者在 Settings → Pages 設定。部署狀態以 Actions 的 Deploy GitHub Pages 工作流程及 github-pages environment 為準。

本機測試子路徑可執行 `NEXT_PUBLIC_BASE_PATH=/finance_game npm run build`，將 out/ 掛載至靜態伺服器的 `/finance_game/`；不要直接以根路徑載入該建置。網站資料仍保存在各使用者瀏覽器，切換網址前請先匯出 JSON 備份。

## 基本操作

1. 在「編輯」填入年齡、現金、其他資產、既有負債、收入與支出，按「更新基礎資料」套用；加入購屋與失業事件。未套用的表單會提示先套用或「還原未套用資料」，以免切換操作遺失草稿。
2. 使用「體驗」播放、暫停、調速與逐月回溯，三種模式共用月份。
3. 從目前月建立分支；分支點以前的事件及初始資料鎖定，只能修改未來事件。
4. 在「平行人生」勾選方案，同月比較場景與財務結果，採最短期間作播放終點。
5. 按「儲存」保存；重新整理後按「讀取」。匯出 JSON 可備份或跨瀏覽器匯入。

## v0.2 財務模型（開發分支，待審查）

初始範例及舊存檔仍使用 V1 引擎，結果不會默默改算。按「升級財務模型」先看轉換預覽、下載原始 V1 備份，再確認轉換整個專案。取消或失敗不改工作；確認後仍須另外按「儲存」，不會自動覆寫 IndexedDB。

V2 可設定：

- **生活費與租金分列**：升級時原有支出不變、租金為 0；請自行拆分，不猜測舊支出中的租金。
- **購屋停止租金**：預設不停止，需勾選；購屋當月起生效。同月另有租金事件時，以該事件的新租金為準。
- **調整月租金／正常月薪**：指定月份起換成新金額，直到下一事件。失業期間用替代收入，結束後恢復當時正常月薪。
- **既有負債排程**：將既有負債的一部分分配到最多 20 筆還款排程，沒有新增借款。各筆獨立算息與取整、末期清償。第一付款月之前不累息；未分配部分維持固定。生活費勿再包含這些還款，避免重複扣款。

舊備份以 schema=1 / engine=1.0.0 計算；新格式 schema=2 可容納 engine=1.0.0 與 2.0.0 的不同根方案。同一分支樹須使用相同引擎。目前升級按鈕只轉換 schema=1 整個專案；不對 schema=2 的混合專案進行第二次轉換，也不支援降版。需回復時匯入原始備份。

## 財務邊界

金額為新臺幣分的整數，畫面保留到分。單一房屋、固定房價與利率；無稅費、通膨、投資報酬、出售房屋或提前還款。負現金顯示缺口，不自動借款或模擬違約。

V1 的既有負債不攤還、生活費固定、購屋不自動取消租金；這些舊語意完整保留。V2 不猜測任何缺少的財務條件，結果僅反映使用者設定。

## 規格與專案狀態

- [產品與 V1 驗收](docs/PRD.md)、[架構與公式](docs/ARCHITECTURE.md)
- [V2 財務契約](docs/V02_FINANCIAL_CONTRACT.md)、[開發路徑](docs/ROADMAP.md)
- [實際驗證結果](docs/VALIDATION.md)、[開發規範](AGENTS.md)
- [GitHub repository](https://github.com/Adamguo88/finance_game)、[issues](https://github.com/Adamguo88/finance_game/issues)

產品名稱為 Life Studio，repository 名稱為 finance_game，已授權公開。PR #8 已合併，issues #1–#5 已按證據結案；#6 仍待真人驗收。V2 的設計與實作在 PR 審查中，不代表正式發布。

程式與測試在本對話的 Codex 工作區執行，未另外啟動背景 Codex CLI 任務。GitHub 寫入授權已恢復，早期 403 紀錄保留於 VALIDATION 作歷史參考。
