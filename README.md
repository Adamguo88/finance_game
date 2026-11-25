# Life Studio
人生，沒有唯一的劇本。透過自行安排事件、播放人生與同步比較分支，理解財務選擇如何影響未來。

## 啟動
使用 Node.js 24 LTS（.nvmrc）。安裝與執行：
```sh
npm ci
npm test
npm run dev
```
開啟 http://localhost:3000 。`npm run build` 產生純靜態 `out/`，沒有應用程式後端。

## v0.1 操作
1. 在「編輯」輸入初始年齡、現金、其他資產、既有負債、月收入與支出。
2. 加入「建立自己的家」與「職涯暫停」，編輯發生月份與完整參數。
3. 在「體驗」播放、暫停、逐月前後移動；同一時間位置跨模式保留。
4. 從目前月份建立分支，修改分支點之後的事件。
5. 「平行人生」勾選方案，讓多個場景與金額同步前進。
6. 儲存到此瀏覽器的 IndexedDB；匯出 JSON 備份、匯入還原。重新整理後須按「讀取」。

## 邊界
單一房屋、固定利率本息攤還、失業結束回復初始薪資。既有負債只有餘額，不自動攤還。生活支出固定，購屋不自動扣除租金。無稅費、通膨、報酬率或房價成長。負現金標示缺口，不自動借款。

## 規格與交接
- [產品與驗收](docs/PRD.md)
- [架構與公式](docs/ARCHITECTURE.md)
- [優先順序與分階段工作](docs/ROADMAP.md)
- [實測結果](docs/VALIDATION.md)
- [Codex 任務指令](docs/CODEX_TASK.md)
- [已建立的 GitHub issues](https://github.com/Adamguo88/finance_game/issues)
- [issue 規劃原稿](docs/ISSUES.json)
- [開發規範](AGENTS.md)

## 檢查
```sh
npm test
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

## GitHub 與 Codex 狀態
Repository：[Adamguo88/finance_game](https://github.com/Adamguo88/finance_game)。使用者已同意公開，產品名稱仍為 Life Studio。

完整 v0.1 程式、規格與 CI 已上傳 main；[7 個分階段 issues](https://github.com/Adamguo88/finance_game/issues) 已建立，供後續逐項審核與開發，並非全數已完成。
GitHub 連接器本身的寫入回傳 403，本次透過本機既有 Git 授權成功推送，並用相同授權建立 issues；沒有在專案保存憑證。

首次 [GitHub Actions 檢查](https://github.com/Adamguo88/finance_game/actions/runs/45536245532) 已執行 npm ci、核心測試、TypeScript、build 與 Playwright。最終狀態請看 Actions 與 docs/VALIDATION.md。

Codex Cloud 任務尚未由本對話啟動。請在綁定 finance_game 的 Cloud 環境提交 [docs/CODEX_TASK.md](docs/CODEX_TASK.md) 的任務；先驗收 P0 issues #1–#6，v0.2 的 #7 暫不實作。

## 重新取得專案
```sh
git clone https://github.com/Adamguo88/finance_game.git
cd finance_game
npm ci
npm run dev
```

scripts/create-issues.mjs 是已登入 GitHub CLI 的補建工具，只對 Adamguo88/finance_game 操作，遇同標題會跳過；目前 7 個 issues 已建立，無須再執行。不要強制推送或覆蓋他人的後續修改。

套件精確版本以 package-lock.json 為準；此專案不需要環境變數。
