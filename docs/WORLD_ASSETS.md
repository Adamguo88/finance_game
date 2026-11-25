# 角色與持續微縮世界資產規格

Issue #17，對齊原討論的療癒、低多邊形、微縮世界方向。用原創 2D 向量與等角面/色階構成 2.5D 感，沒有真 3D、遠端圖片或第三方模型。PixiJS renderer 由 #18 接入（生命週期見 PIXI_RENDERER.md）；不將本輪靜態資產稱為動畫/音效完成。

## 來源、編輯與本地交付

- 可修改來源：`src/scene/models.tsx`，worldPalette 定義草地、側面、牆面、屋頂、玻璃、服裝/膚色與琥珀提醒色。
- 持續世界組合與狀態：`src/scene/LifeWorld.tsx`。角色/住宅/職場/財務小屋/公園連在同一個島嶼，不在事件發生時換整張背景。
- 本地獨立 SVG：`public/art/models/*.svg`，12 個模型狀態/零件，由 `scripts/export-models.mjs` 從原始 TSX 匯出。manifest.json 包含穩定 ID、名稱、大小與 SHA-256，無日期/個資。
- 圖鑑 `/scene-gallery/` 展示所有狀態與色票，亦可作後續素材審查。SVG 可用一般向量編輯器開啟；應修改 TSX 來源後重新匯出以保持一致。
- 素材為本專案原創向量，沒有下載/重製原討論的參考圖片；隨 repository 的授權政策管理，未引入新的第三方素材授權。既有本地字型仍遵守原套件授權，不包含於模型 SVG。

匯出方式：`node scripts/export-models.mjs`。使用專案既有 Next SWC 編譯純模型，React server renderer 產生原生 local viewBox 的 SVG，不需瀏覽器或伺服器。重新 build 後包含於 out/。圖鑑保留 9 個主要展示，新增 tree/bench 零件及清償住宅亦獨立交付。

## 座標與層級

全世界 viewBox 1000×500，投影平面約 2:1。模型 local origin 位於基座/腳下，正 Y 向下，陰影→基座→牆面/軀幹→屋頂/頭髮→前景依序繪製。共用基座使租屋/購屋及工作/休息能換狀態而不跳動鏡頭。

| 資產 | local viewBox 建議 | 原點與狀態 |
|---|---|---|
| AvatarModel | -90 -145 180 180 | (0,0) 站立腳下；休息時下移 26，與長椅座面對齊 |
| HomeModel | -145 -205 290 280 | 基座中心；租屋公寓/自有住宅，獨立 mortgage plaque |
| OfficeModel | -140 -205 280 280 | 基座中心；正常/暫停色階，不把職涯暫停畫成災難 |
| FinanceModel | -120 -145 240 210 | 基座中心；平穩/琥珀缺口提醒，不展示不存在的理財功能 |
| TreeModel | 約 -40 -115 80 130 | (0,0) 樹根；只調 scale，不反映財富排名 |
| BenchModel | 約 -50 -45 100 80 | (0,0) 座面中心，腳延伸到 y≈31 |

世界層級：柔和背景/投影→草地與側面→道路→後景樹→職場與住宅→財務小屋→公園→角色→HTML 區域入口。原生 HTML buttons 保留鍵盤焦點與可讀名稱，不以只有 SVG 圖形的熱區取代操作。

## Snapshot 狀態契約

| 快照/Mapper | 模型結果 | 不可推論 |
|---|---|---|
| ownsHome=false/true | 公寓/住宅 | 不按房價自動升級豪宅 |
| employed=true/false | 辦公樓正常/暫停，角色工作/坐在公園 | 不猜測家庭、性別、疾病或退休 |
| hasMortgage（只看 mortgageBalance） | 屋旁房貸標記 | 其他負債不能誤當房貸 |
| gap=true | 財務小屋琥珀提醒，文字/明細照原快照 | 不自動借款、賣房或把整世界染紅 |

所有財務仍從 domain Snapshot 經 Scene Mapper 取得，模型不算利息、收入或淨資產。角色外觀選擇/生命階段與可保存 metadata 仍由 #28 處理，不能以共用預設角色宣告該差距完成。

## 區域操作

住宅/工作區先開目前月份的明細，明確選擇後才進對應類別事件庫；體驗模式可由此回編輯，月份保留。財務小屋可回初始資料，分支表單仍鎖定；公園只呈現休憩與選擇，不假造退休功能。檢視不寫歷史、不改財務；Escape/關閉回焦點，從明細切到事件庫不短暫解除背景保護。比較視窗保持靜態/文字替代與獨立 SVG IDs。

## #17 SVG 階段歷史預算與量測

- 兩個模型/world 原始模組 10,878 bytes（gzip source 4,221）；9 個可修改 SVG 合計 13,073 bytes，XML/大小/SHA-256 已驗證，低於 150 KiB 資產預算。
- production 首頁 initial script URLs 去重後逐檔 gzip（mtime=0）加總：#16 基準 b11a082 為 253,562 bytes；本階段 257,794，增加 4,232 bytes，低於 100 KiB 新增 JS 預算。這是 gzip JS 傳輸估算，不包含字型/CSS，亦不等於瀏覽器實際下載的 Brotli 大小。
- SVG renderer 沒有持續 RAF/ticker、WebGL 或動畫佇列；#18/#19 才驗證動畫幀率及 renderer memory/lifecycle。PC 合法上限/多瀏覽器壓測仍在 #24，未聲稱完整 FPS/互動延遲達標。

#18 原生座標資產為 12 個、15,783 bytes；PixiJS 的分離載入及資源上限見 [PIXI_RENDERER.md](PIXI_RENDERER.md)。
