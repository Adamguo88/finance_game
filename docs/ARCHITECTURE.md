# 版本路由與 v0.2 實作

V1 契約保留於下方；V2 詳見 [V02_FINANCIAL_CONTRACT.md](V02_FINANCIAL_CONTRACT.md)。schema=1 與 engine=1.0.0 不自動改版。schema=2 移除全域 engineVersion，各 Scenario 依 1.0.0 / 2.0.0 分派計算；同一分支樹不得混用版本。

- `model-v1.ts` / `engine-v1.ts` 保留舊模型與計算，`engine.ts` 提供版本分派與只供畫面使用的統一快照轉接。
- `model.ts` 定義 V2 strict schemas 與版本聯集，`engine-v2.ts` 實作租金、基礎薪資與既有負債排程，貸款月付公式沿用 V1 payment。
- `migration.ts` 顯式轉換 schema=1 全專案，含 current/history，並核對各方案所有月份通用快照相同；結果超限或不一致一律拒絕。
- IndexedDB 的 stores 結構未改（DB version=1）；儲存資料是經 parseProject 驗證的版本聯集。轉換本身不寫 DB，仍須按儲存。JSON 字節上限與匯出格式保持一致。
- 畫面從 simulateForDisplay 消費財務明細；Scene Mapper 以 mortgageBalance 判斷房貸，避免把固定舊債當作未清房貸。

以下是 engine=1.0.0 的既有規格，V2 不覆寫它的計算語意。

---

# 架構與財務契約
## 資料流
表單/卡牌 → Scenario Manager → versioned Scenario → Finance Engine → 月度 Snapshot → Scene Mapper → React/SVG。
Zustand 只管理共同播放月份、播放/暫停、速度；React 管理專案與畫面。Dexie/IndexedDB 保存 Project，JSON 支援可攜備份。

## 模組
- src/domain/model.ts：Zod runtime schemas、TypeScript 型別、版本與範例。
- src/domain/engine.ts：不依賴框架的決定性純函式。
- src/domain/scenarios.ts：分支、修改歷史、資料還原與比較。
- src/scene/mapper.ts：快照轉成視覺狀態。
- src/storage/project.ts：IndexedDB、匯入/匯出；所有載入經 runtime 驗證。
- src/app：互動模式、表單、SVG、共用時間控制；不自行計算財務結果。

## 時間與金額
所有金額儲存為新臺幣「分」的 safe integer，輸入/顯示才換算成元。月 0 是初始狀態，不入帳收支；月 1 是第一個月結束。每月順序：
1. 月初依 month、id 排序執行購屋等一次性事件。
2. 判斷失業有效區間 [start, start+duration)，套用當月收入。
3. 計算月初房貸餘額利息，四捨五入到分。
4. 收入 - 固定生活支出 - 當期房貸本息入帳。
5. 記錄月末 Snapshot。購屋月即付第一期。
利息與期付款四捨五入到分；負現金不截為零，不自動借款。現金變化含自備款，不能視為經常性可儲蓄收入。

## 房貸
貸款本金 P = price - downPayment；月利率 r = annualRate / 12。
r = 0：月付款 round(P/n)。
r > 0：round(P*r/(1-(1+r)^(-n)))，實作用 log1p/expm1 避免微小利率消去誤差。
每期利息 round(balance*r)；付款不超過 balance+interest，最後一期以實際剩餘本息清償。本金不為負，清償後不再付款。
淨資產 = cash + assets - debt。無費用購屋是資產結構轉換，瞬間淨資產不變；月末淨資產另受當月收支及利息影響。
既有負債維持初始餘額；其他資產與房價固定。支出不自動移除租金，避免隱含假設。

## 分支語意
forkScenario 深拷貝初始資料與全部未來排程；forkMonth 表示來源該月結束後。<= forkMonth 的事件完全鎖定，包含跨越分支點的失業事件；其餘事件可改。
每個分支持有自己的資料與版本。來源日後修改會形成新版，既有分支仍沿用建立當時的資料，不向來源重新讀取。
每次事件/初始條件修改，history 追加前一版 profile/events/revision，scenario.revision 增加。初始資料修改另增加 profile.version。子分支不允許改初始資料。
Snapshot 可重算、不視為唯一真相；UI 無法改寫引擎輸入。

## 存檔與版本
Project schemaVersion=1、engineVersion=1.0.0；事件參數 version=1。匯入最大 2 MB，最多 20 方案、每方案 100 事件。拒絕未知版本、重複 ID、無效金額、重疊失業、缺失父方案或循環關係。
引擎版本變更需寫明 migration 或明確拒絕。v0.1 不提供舊版本自動遷移。IndexedDB version=1 不等同 engineVersion。
儲存/載入按鈕明確操作，無自動覆蓋。載入失敗保留目前資料。匯出含輸入、歷史與分支，不含瀏覽器執行狀態或快照快取。

## 驗證策略
先測基準現金流、房貸首末期、零利率、失業起訖、缺口與純函式不變性；再測分支深拷貝、歷史鎖定、父子隔離與 round trip。Playwright 驗證卡牌→播放→分支→比較→存讀檔與錯誤匯入。CI 在 Node 24 執行相同檢查。

## 擴充
後續新增事件採 discriminated union + domain handler + fixture 數值例；渲染層可換 PixiJS，無須改變財務公式。完整重算約 864 月 x 100 事件 x 20 方案，在 v0.1 先保持簡單；測量後才加快取或 Web Worker。
