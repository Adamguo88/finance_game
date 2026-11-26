# v0.2 事件與負債模型設計

狀態：PR #9 契約與 PR #10 實作已合併，#7 已按交付證據結案；更新 2026-11-26（Asia/Taipei）。本契約仍是 V2 財務行為與遷移的依據，V1 結果保留。#6 真人驗收與 #24 總驗收仍待完成。

## 1. 範圍與交付順序

1. 先落定本契約與數值案例。
2. 實作 schema=2 的驗證、版本路由與顯式轉換，先有相容性與拒絕測試。
3. 實作初始負債排程與快照明細，再實作租金與收入變更；每項先寫測試。
4. 接表單、事件編輯、歷史與分支，最後接比較、存檔及 E2E。

仍為 Next.js 靜態前端；不加入後端、登入、隨機事件、AI、投資、出售房屋、提前還款、違約處理或自動借貸。多軌拖曳與擴大事件庫另拆任務，不由財務契約暗中擴張。

## 2. 金額、利率與期間

所有金額仍是新臺幣分的 safe integer；輸入非負且各欄 <= 1,000,000,000,000 分，計算後每個數值都必須是 safe integer，溢出明確拒絕。利率仍為小數年率 [0, 0.3]，不是百分比字串。月利率 annualRate/12，利息、月付款四捨五入至分，末期按剩餘本息清償。沿用 v1 的 log1p/expm1 與最低償還一分規則，不新增另一套取整方式。

月 0 是初始餘額；第一期可在第 1 月或指定的較晚月份。事件 month 在 [1, horizon]；排程可延續到 horizon 外，畫面不再模擬超出 90 歲的部分，不為了期間截止而強制清償。termMonths 1–480；失業 duration 1–120。月 0 快照無收入/支出/付款/利息，已有初始債務餘額。

## 3. 資料模型（已實作於開發分支）

Project.schemaVersion=2；每個 Scenario 自帶 engineVersion，允許同一專案比較 1.0.0 與 2.0.0。schema=2 不代表所有方案都改用新公式。schema=2 envelope 為 `{schemaVersion:2, scenarios:Array<ScenarioV1|ScenarioV2>, migration:MigrationRecord|null}`；移除原本全專案單一 engineVersion，改在 scenario 與 migration 記錄來源版本。MigrationRecord 為 `{fromSchema:1, fromEngine:"1.0.0", sourceScenarioIds:string[]}`，IDs 依原序保存；轉換不帶現在時間、隨機 ID 或衍生快照，保持決定性。

```ts
// 型別摘要；src/domain/model.ts 提供 strict runtime schema。
type ProfileV2 = ProfileV1 & {
  rent: number; // 初始月租金；expenses 明確表示不含 rent 的生活費
  debtSchedules: {
    id: string;
    openingBalance: number;
    annualRate: number;
    firstPaymentMonth: number;
    termMonths: number;
  }[];
};
type BuyHouseV2 = Omit<BuyHouseV1, 'version'> & {
  version: 2;
  stopRent: boolean; // 該購屋月起將當期租金設為 0
};
type RentChange = {
  id: string; version: 1; type: 'rentChange'; month: number; amount: number;
};
type IncomeChange = {
  id: string; version: 1; type: 'incomeChange'; month: number; amount: number;
};
```

engine=1.0.0 的 profile/events/history 仍完全符合原 schema；engine=2.0.0 的 current/history 都使用 V2 型別。所有層級不允許未知欄位。UnemploymentV1 的參數形狀不變，但 engine=2.0.0 的結束恢復「當時基礎薪資」，不是無條件初始薪資。

profile.version、scenario.revision 仍是修改次數；事件 version 是參數格式版本，不能用增加 event.version 表示一次普通內容編輯。舊參數由 history 保存。

## 4. 租金與購屋

- profile.expenses 為非住房生活費，profile.rent 為住房租金；每月實際生活支出 = expenses + 當期租金。
- buyHouse(version=2).stopRent 必填，預設 false。UI 明示是否從購屋月停止租金；false 完整保留租金。
- stopRent=true 的購屋月起將租金設為 0；不是減少 profile.expenses，也不是以收入補貼抵銷租金。
- rentChange.amount 是「新的每月租金」，永久生效直到另一租金事件；不是差額，也不是一次性費用。amount=0 允許。
- 購屋後仍可安排 rentChange，例如保留另一住所的租金；必須是使用者安排，無自動搬家或出租收入。
- 同月購屋與租金變更，先購屋處理 stopRent，再套用 rentChange；顯式租金事件最後決定該月租金。此順序由事件階段定義，不依 ID 碰運氣。
- 同月最多一個 rentChange；同月最多一個 incomeChange。不同類別同月可並存；同類別同月重複拒絕，禁止偷偷取最後一筆。

## 5. 既有負債排程

profile.debt 是所有既有負債的月 0 總額。最多 20 筆 debtSchedules，每筆 openingBalance > 0、ID 唯一，sum(openingBalance) <= profile.debt。

未排程負債 = profile.debt - sum(openingBalance)，保持固定、不生息也不付款。這使舊債務在缺少利率/期限資料時不會被猜測。排程是在分配已有負債，不是新增負債；購屋房貸另列，不能再放入 debtSchedules。

- 月 0 不付款、不增加現金，不能把 initial loan 誤當新借款。
- firstPaymentMonth 之前餘額固定，不收取或累積利息；這是本版的簡化延後開始語意，UI 必須明示。要模擬寬限期/累息需另訂模型。
- 第一付款月起，按月初餘額算利息並同月支付本息；termMonths 是付款期數，不是從月 0 起算的經過月份。
- 每筆各自按月四捨五入，再加總，不能先合併本金或利息再取整；末期對該筆實際剩餘本息清償。
- 現金負值仍照既定規則付款，顯示缺口，不產生新債、不資本化未繳款。這是情境模擬而非真實違約系統。
- 快照 debt = 未排程負債 + 各既有排程餘額 + 房貸餘額。償還本金同時降低現金及負債，不能再列入生活支出扣第二次。
- 新增、刪除或修改初始排程屬 changeProfile，增加 profile.version/revision 並保存全部舊參數；子分支初始資料不能修改。暫不支援中途重整貸款。

## 6. 基礎薪資與失業

incomeChange.amount 是新的正常月薪，事件當月起生效。當月先更新正常薪資，再判斷失業 [start, start+duration)。失業期間實際收入仍為 replacementIncome；期間薪資變更保存為新的基礎薪資，失業結束後恢復該基礎薪資。相接失業允許，重疊仍拒絕。

此新語意只用於 engine=2.0.0；v1 沒有 incomeChange，仍照舊回復 profile.income。失業不是與收入變更相加的補貼。

## 7. 每月明確執行順序

1. 記錄月初現金與各債務餘額。
2. 執行購屋（最多一間），扣自備款、增加房屋資產與房貸本金；依 stopRent 決定租金歸零。
3. 套用 rentChange、incomeChange，同類同月重複在驗證階段拒絕。
4. 決定失業覆蓋後的實際收入；計算生活費與租金。
5. 對已開始的每筆既有債務與房貸分別算息、付款及月末餘額。
6. 現金 += 實際收入 - 生活費 - 租金 - 房貸付款 - 既有排程付款。
7. 產生月末快照與場景；cashFlow 包含自備款，不等於日常結餘。

同階段需要排序時用 month、id（固定 en 排序）；跨類別優先遵守以上階段。房屋是固定資產，無升值或費用；工作/缺口由快照映射。

## 8. 快照與 UI

保留舊的通用欄位供比較，V2 另加：baseIncome、livingExpenses、rent、mortgagePayment、mortgageInterest、scheduledDebtPayment、scheduledDebtInterest、scheduledDebtBalance、unallocatedDebt、mortgageBalance。

| 通用欄位 | V2 語意 |
|---|---|
| income | 失業覆蓋後實際收入 |
| expenses | livingExpenses + rent，不含任何貸款付款 |
| payment | mortgagePayment，維持既有 UI 的「房貸本息」語意 |
| interest | mortgageInterest，維持既有房貸標籤 |
| debt | unallocatedDebt + scheduledDebtBalance + mortgageBalance |
| assets | 其他資產 + 房屋資產，不含 cash |
| netWorth | cash + assets - debt |

UI 新增既有債務付款與利息欄位，不能把兩類貸款總額顯示為房貸。所有數值由 domain 產生。Scene Mapper 的 hasMortgage 改以 mortgageBalance 判定；v1 由 domain adapter 以 Snapshot.debt - profile.debt 得到房貸餘額相容處理（不交由 UI 計算），不能因未清償的其他負債誤畫房貸。

## 9. 版本路由與顯式轉換

- 第一階段先提供 schema=1/engine=1 的原樣讀取與計算；不因匯入新版應用就套用新公式。
- schema=2 是 project envelope；可裝 engine=1 的原樣方案，也可裝 engine=2 方案。未知 schema/engine/event version 一律拒絕，保留目前工作。同一 parent-child 分支樹必須使用相同引擎版本；混合引擎比較先限不同根方案，匯入跨版本父子關係拒絕，不能默認分支前快照仍相等。
- UI 顯示各方案引擎版本。既有方案唯讀預覽後，使用者可明確選擇「將整個專案轉為新版模型」。不對單一子分支獨自改版，以免失去分支前相等的解釋。
- 轉換是純函式，先完整驗證原檔及結果，保留所有 scenario/profile/event ID、parentId、forkMonth、revision、profile.version 與每筆 history；不能只轉 current。
- 每個 V1 profile（含 history）：expenses 原值不動、rent=0、debtSchedules=[]；debt 原值作未排程負債。這保留舊模型的固定支出與固定既有債務，**不從 expenses 猜租金**。
- 每個 buyHouse（含 history）version=1 → version=2、stopRent=false；失業參數保持。project 轉 schema=2，所有 scenario 引擎設 2.0.0。Envelope migration metadata 保存 fromSchema/fromEngine 與既有來源識別，不修改 revision/history 假裝一次使用者編輯。
- 在未增加 V2 事件/設定前，所有方案 0..horizon 的通用快照必須逐分相等，包括現金、資產、負債、收支、本息、缺口與工作/住房狀態。新 V2 明細則依原值拆解。
- 轉換前提供原始 JSON 備份；結果先展示，使用者確認後才替換目前工作。取消或任一步驗證失敗皆不寫 IndexedDB。儲存仍須另外按儲存，避免轉換自動覆蓋既有存檔。
- 撤回方式是匯入原始備份；不支援把含 V2 參數的方案降回 schema=1，不能丟掉租金/排程硬湊舊格式。
- 沿用最大 2 MB、20 方案、100 事件/方案、1000 歷史/方案；轉換增加欄位後超限，明確拒絕，原專案不動。保存/匯入的 current 與所有 history 都驗證。

## 10. 分支與歷史不變量

既有分支語意維持：深拷貝 profile/debtSchedules/所有事件與版本，<= forkMonth 的買房、租金、收入與失業事件完全鎖定；跨過分支點的失業不能縮短。子方案不能改租金初始值或既有債務排程。父方案後續修改不傳播。

第 6 月分支的第 13 月 rentChange/incomeChange 可改；0–6 月全部快照一致。刪除/移動未來事件仍存 history；將未來事件改至 <= forkMonth 必須拒絕。序列化還原不得重新向目前 parent 讀值。

## 11. 數值 fixtures 與測試閘門

`docs/fixtures/v02-financial-contract.json` 是數值基準；`tests/v02.test.ts` 已將八組案例接至真正 V2 引擎測試。金額皆為分；fixture 的「無房貸」不能默認為「無既有負債」。

| ID | 數值與必驗邊界 |
|---|---|
| rent-split | 生活費 1.8 萬 + 租金 1.2 萬，12 月結果與舊 3 萬支出一致 |
| buy-stop-rent | 第 2 月購屋停止租金，購屋當月即省租金，付款仍從當月開始 |
| rent-change | 第 2 月租金改 1.5 萬；不是增加 1.5 萬。0 元、同月購屋優先序、同類重複拒絕 |
| debt-zero | 12 萬初始負債、0%、12 期；月 0 不增現金，末期清償，13 月不再扣款 |
| debt-interest | 12 萬、12%、12 期，每期 10,661.85 元，末期 10,661.91 元 |
| debt-delayed | firstPaymentMonth=3，前兩月餘額不動/無息，第 3 月才第一期 |
| salary-unemployment | 失業第 2–3 月、月 3 加薪至 6 萬，第 4 月恢復 6 萬 |
| debt-residual | 18 萬舊債只排 12 萬，另 6 萬固定；不能重複算成 30 萬 |

實作與回歸測試需涵蓋：零/微小/30% 利率、一分餘額、期數 1/480、同月多筆各別取整、現金不足不借新債、horizon 外尚未清償、重複排程 ID、排程合計超額、非整數/非有限/不安全金額、初始債務與房貸同月付款、順序置換決定性。

遷移/分支測試須驗證原物件逐位元不變、各版本路由、current/history 完整、混合引擎比較同月、0–forkMonth 快照一致、損壞/未知版/循環/超大結果拒絕且不覆蓋。E2E 最後再驗證租金拆分、原檔備份、取消轉換、確認轉換、reload/load 與所有錯誤保護。

## 12. 契約變更規則

以上為現行契約；租金停止與晚起息語意必須在產品說明明示。未來若改成購屋月仍收租、延後付款期間累息、收入事件有結束日或新借款/提前還款，需先更新本契約與 fixtures，再寫引擎。後續擴充由 #27 及衍生實作追蹤；#7 結案不代表 #6 真人驗收完成。

## 13. 實作限制與相容性補充

目前顯式轉換入口只接受 schema=1；schema=2 的混合版本專案可讀寫及比較，但不提供再次轉換或降版。轉換函式會檢查每個方案所有月份的 V1 通用快照逐分相等，任一不一致即拒絕。備份以緊湊 JSON 輸出，與 2 MB UTF-8 限制一致，避免美化排版導致合法存檔無法重新匯入。
