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
- [GitHub issue 待建立清單](docs/ISSUES.json)
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

目前 GitHub 整合可讀取倉庫，實際上傳檔案與建立 issue 均回傳 403 Resource not accessible by integration。尚未成功上傳本專案或建立 issues。Codex Cloud 是否能讀取此 repo，由使用者的 Cloud 設定決定；本對話沒有可直接提交 Cloud 任務的整合。

在已登入且有寫入權限的電腦，於完整專案資料夾執行：
```sh
git init -b main
git remote add origin https://github.com/Adamguo88/finance_game.git
git add .
git commit -m "Initialize Life Studio v0.1"
git push -u origin main
node scripts/create-issues.mjs
```
建立 issues 需要 GitHub CLI（gh）已登入。此腳本只對 Adamguo88/finance_game 建立，並跳過同標題項目。若遠端已出現其他內容，先整合其變更，不強制推送。

可直接將 [docs/CODEX_TASK.md](docs/CODEX_TASK.md) 的指令貼入綁定本倉庫的 Codex Cloud 任務。只有任務實際啟動後才能標記為已執行。

套件精確版本以 package-lock.json 為準；此專案不需要環境變數。
