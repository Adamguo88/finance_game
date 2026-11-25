# PixiJS 持續世界（#18）

## 資料與呈現

`LifeWorld` 消費統一 Snapshot，Scene Mapper 決定自有住宅、工作、房貸及缺口四個視覺旗標。renderer 只換模型 texture/位置，不計算財務、不排程事件、不保存 Project。共同月份仍由原工作室控制；比較沒有獨立時鐘。角色外觀個人化仍待 #28，動畫/音效由 #19 接續。

SSR/靜態輸出先呈現同構 SVG；確認支援 WebGL 後才 dynamic import PixiJS 8.23.0。載入期間保留 SVG 與明確載入文字，完成才隱藏其視覺，原 role=img/快照描述與 HTML 區域按鈕保留。GPU 不可用、模型/模組載入失敗、context lost 時使用相同靜態替代，不阻擋規劃與月份操作。不對使用者顯示底層錯誤細節。

## 資產與座標

`model-catalog.ts` 固定 12 個原創 SVG 的 local viewBox。`node scripts/export-models.mjs` 直接編譯已知純 TSX 來源並 renderToStaticMarkup，不需 Playwright、網路或 production server。manifest 記錄可重現 bytes/SHA-256；合計 15,783 bytes。角色休息 texture 不包含長椅，避免重複合成；清償住宅獨立於有房貸住宅。

使用 Pixi 預設 SVG image texture loader（resolution=2），保留 SVG viewBox/group transform。不能改用目前無法完整解析這些 transform 的 SVG Graphics parser。texture anchor 由負 local origin/viewBox 尺寸換算，模型切換保持位置。資產 URL 帶 `NEXT_PUBLIC_BASE_PATH`，沒有外部圖片/服務。

## 生命週期與限制

- 每個世界一個 Application，最多同時 4 個（包括初始化中）；其他比較保持 SVG。20 方案不是 20 GPU contexts。
- effect 取得 idempotent lease；AbortController 處理 dynamic import/init/texture 等待時卸載。尚未開始 GPU init 的 dynamic import 可立刻取消/釋放名額；已開始 init 的 lease 在異步清理結束後釋放，避免瞬間超出上限。每輪 effect 只清理自己擁有的 controller，不能破壞新一輪；StrictMode 重啟先重設 SVG 狀態。ready renderer 卸載即 destroy；context lost 同樣 destroy/release。
- `autoStart:false`、`sharedTicker:false`。互動全由 HTML 負責，立即使用 Pixi 文件允許的 `events.setTargetElement(null)` 移除其 pointer tracking/system ticker；8.23 的宣告漏掉 nullable，原始實作明確支援。
- 固定素材由 teardown 回收，不需背景 GC，初始化完成後清理 renderer scheduler（同樣移除其 system ticker listener）；不停止全域 Ticker，以免影響其他世界。
- 四旗標改變才 `app.render()`，同狀態月份沒有多餘重繪；沒有每世界 RAF 或動畫佇列。renderer destroy 清理 stage/canvas/ticker/GPU context。
- 共用固定 12 個 CPU texture sources，跨世界/模式重用；destroy 不刪共用 source，每 renderer 的 GPU 資源由其 context 回收。失敗 promise 清除；沒有依月份/方案增長的 texture cache。頁面關閉由瀏覽器回收 sources。
- 不自動把新釋出的 GPU 名額搶回既有 SVG 世界，避免比較中抖動；下次重新掛載可取得名額。

## 驗證範圍

測試用 SwiftShader 執行真 WebGL pipeline，強制檢查 data-renderer=pixi、非相同畫布像素、月份旗標、context loss、20 方案反覆切換/上限與靜止 RAF 計數。這是 headless 軟體 GPU，不能代替真人硬體 FPS、長時間記憶體曲線、Firefox/Safari 驗收。既有財務、分支、匯出不變性 E2E 保留；#24 仍負責完整 PC 總驗收。

## 本地 production 傳輸估算

同樣以 HTML initial script URLs 去重後逐檔 gzip（mtime=0）計算：#17 為 257,794 bytes；本輪 258,303，增加 509 bytes。全部靜態 JS chunks 為 447,791 gzip bytes（含延遲 renderer 與框架/錯誤頁 chunks，不代表每頁全部下載）。Pixi 不是零成本：GPU 支援時才載入後續 chunks；初始 JS 沒有把完整渲染庫打入首頁。字型/CSS/HTTP Brotli 不含於此估算。
