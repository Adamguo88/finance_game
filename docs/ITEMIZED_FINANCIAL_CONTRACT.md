# 分項財務實體、版本與遷移契約（#42）

更新：2026-11-26；基準main `83f5c0e`。承接[PC_EVENT_CONTRACT](PC_EVENT_CONTRACT.md)的C01–C21。本文定義分項模型；**schema5／engine3、讀取保存、修改分支與完整遷移已由#43交付**。#44指定項目的四類事件操作候選見[ITEMIZED_EVENTS.md](ITEMIZED_EVENTS.md)，初始分項表單及關聯修改仍待後續整合。V1/V2及schema1–4的解析、重播及原始匯出不變。

## 版本與唯一資料來源

- 新容器 `schemaVersion:5`，Scenario以 `engineVersion:'3.0.0'` 路由；每個profile保留正整數version，事件保留自己的version，修改另加scenario.revision。未知欄位／型別／版本一律strict拒絕；未註冊的新事件不因同屬C01–C21而自動接受。
- schema5可同時容納原有V1/V2和V3的獨立根人生；同一分支樹必須同引擎。舊Scenario仍由原schema的對應validator與原引擎處理；不把V3欄位混入舊profile。
- V3 profile為 `{id,version,age,cash,incomes,expenses,assets,liabilities}`，四個陣列是原始分項資料，不另保存可修改的彙總income／expenses／assets／debt。摘要由同一資料加總；只改摘要時，介面須先明示將取代哪些分項，不能保留互相矛盾的兩份金額。
- V3不將initialDetails作第二份可執行財務輸入。原始initialDetails、profile、presentation、事件及history逐字義保留在遷移來源中。未遷移的舊Scenario仍照原格式保留它們；V3外觀仍用既有presentation version1。
- schema5沿用20方案、100事件／方案、1000筆history／方案、UTF-8 JSON 2,000,000 bytes上限。四類初始實體各最多20筆，排程每負債至多一個，事件建立的實體各類總數最多120；總量限制與JSON限制同時檢查，不自動丟歷史騰空間。

## 識別碼、生命週期與金額

ID為非空1–160字元字串，不含控制字元；名稱trim後1–80字。ID是opaque key，不用名稱、陣列索引或金額當關聯。每個current／history版本各自驗證，各revision可沿用同一穩定ID。各Scenario單一版本內所有財務實體共用唯一ID集合（跨類亦不可重複）；event ID另有唯一集合。分支深拷貝後同名ID指向分支自己的資料，跨Scenario不可直接引用。初始實體ID一旦被引用不可改名式重建；顯示名稱可改。

每筆實體有 `{id,name,startMonth,endMonth}`，初始實體startMonth=0；事件建立者startMonth=建立事件month且只有一個定義，不預先再放進初始陣列。有效期 `[startMonth,endMonth)`，null end表示至人生終點；end必須大於start且至多horizon+1。收入／支出在有效月才入帳；月0只記期初餘額。終止收入／支出不產生清償；資產與負債不能靠endMonth消失，須用C09／C11／C12明確處分／清償，餘額歸零後才結束。初始資產／負債的endMonth必須為null。

金額為0至1,000,000,000,000整數分；初始各類合計亦不得超過此限。現金初始非負，運算後可為負。衍生總額與中間運算使用整數／有理數，輸出必須safe integer，溢出整個候選拒絕，不截斷。每個正數分量half-up取分後合計，資產先取重估後價值再求增減，沿用#27參考算例。

新率欄位使用整數parts-per-million：`annualRatePpm` 0–300000（年0–30%），月息精確為本金×annualRatePpm／12000000；`monthlyRatePpm`下限−1000000，上限1000000000（明示的每月假設最大100000%，仍受溢出限制），`sharePpm` 0–1000000。精度為比率0.000001，即百分率0.0001個百分點。這是新輸入格式，舊number利率不直接Math.round換算；無法精確表示的來源必須停留舊版，或由使用者另建明示新假設。reference fixtures的basis-points×100可無損換成ppm。

## 四類實體與排程

| 集合 | 欄位（另含共同ID／名稱／期間） | 唯一入帳與關聯 |
|---|---|---|
| incomes | `amount`；`kind:salary/side/pension/other` | 每來源每月一次；C02更新基準，C03只覆蓋目標當月有效額；其他來源不變 |
| expenses | `amount`；`kind:living/rent/holding/dependent/education/premium/other` | 租金是kind=rent的指定支出，不再有第二個profile.rent；房貸本金／投資本金不可列expense |
| assets | `openingValue`；`kind:other/property/vehicle/investment` | 現金不列asset陣列；每資產一份帳面值，重估與賣出只能指向同一穩定ID |
| liabilities | `openingBalance`；`kind:static/amortizing`；`securedAssetId:null或assetId`；`schedule:null或下述物件` | 債務本金只記一次；排程是該負債的還法，不再增加一份負債 |

static負債schedule=null，沒有自動利息／月付（只表明來源沒有還款假設，UI須標示）；可由後續明確清償事件還本。amortizing要求正本金及schedule `{annualRatePpm,rateMode:'fixed'|'variable',firstPaymentMonth,termMonths}`，firstPaymentMonth為1..horizon，termMonths為1..480。月0不扣款，到firstPaymentMonth才算第一個完整月利息；更早不累息。名目年率／12，月付沿#27本息攤還、各期利息取分、最後一期實際結清。不得用一個schedule同時覆蓋兩個liability；可由使用者拆成兩筆明確負債。

買房／買車建立assetId及可選liabilityId（自付等於價款時不建立零元貸款），價款−自付為明示本金；持有費用另建expenseId。購買本金／自付不列生活費，費用列一次消費。securedAssetId必須指向同方案資產；出售時列出全部有效擔保負債並明確結清。資產餘值或負債餘額不因刪除顯示卡片而改變。

## 事件封套、目標與新增／終止

V3事件共同封套 `{id,version,type,month,sequence,dependsOn}`：month為1..horizon，sequence為0..9999整數且同月全事件唯一；dependsOn為不重複eventId陣列、至多100個，不含自身且只能引用同月或更早事件。同月依賴先於被依賴者，跨月不可倒置；循環拒絕。sequence是可見的同月排序，不是財務階段覆蓋開關。依#27的階段0–5執行，不能以拖曳把理賠移到損失之前或使新購資產當月售出。

#43／#44首批註冊四類事件：

| type／version | 除共同欄位之外的payload | 檢查與語意 |
|---|---|---|
| incomeChange／2 | incomeId, amount | 只更新有效收入基準，C02 |
| unemployment／2 | incomeId, duration, replacementIncome | duration 1–120；有效[start,start+duration)，終點可晚於horizon但不在終點外入帳；同來源覆蓋期間不可重疊，C03 |
| rentChange／2 | expenseId, amount | 目標kind=rent且有效；替換金額，C04；一般支出變更稍後另註冊 |
| buyHouse／3 | assetId, name, price, downPayment, fee, loan:null或{liabilityId,name,annualRatePpm,rateMode,firstPaymentMonth,termMonths}, holdingExpense:null或{expenseId,name,amount}, stopExpenseIds | price正、自付不超價款；有貸款時本金由價款−自付求得，firstPaymentMonth>=購買月。stopExpenseIds為有效kind=rent目標且不得重複；空陣列明示不停租。費用及持有費用需明示，null表示使用者選擇無持有費用。住宅暫保留每人生至多一筆購屋，#46新增可處分／多資產規則時另版本化 |

duration結束超過horizon是合法截斷的「期間覆蓋」，不是實體endMonth越界；首次購買／借款在終點內，排程可在90歲後仍有剩餘債務，終點如實顯示餘額，不提前結清。新事件建立的實體ID也要參與全方案唯一檢查。零額收入／支出可保留，零額不代表終止。

C05／C06由具用途的建立／終止型別承接；C07/C08需memberId；C09–C12需assetId／liabilityId；C13需incomeId／expenseId集合；C14需policyId及保費expenseId；C15/C16需lossId／policyId與核定來源；C17/C18需investment assetId；C19需expenseIds；C20需variable liabilityId；C21需assetId。後續Epic在同一封套及#27語意下訂各strict payload並增加註冊版本，不接受任意`data`物件或自由文字效果。未來member／policy／loss與財務實體的ID也使用同一命名空間，保存建立來源，新增欄位不可靜默忽略。

## 關聯驗證與原子操作

解析／預覽前先建實體定義表、建立來源與引用表，再依時間及階段驗證。目標不存在、類型不合、尚未建立／已終止、重複ID／sequence、未滿足依賴、同月同屬性互斥、提前還本模式缺少、出現未註冊事件均拒絕候選。引用未來建立的資產不可因它出現在完整事件陣列就通過。C03的覆蓋與C02的基準更新可同月，C04的明確金額優先於C19當月因子，其餘同屬性重複設定拒絕。

刪除回傳依賴清單（事件ID、目標ID、原因），不直接丟棄引用。使用者移除或重新指定全部受影響項後，一次validate並提交完整候選；失敗保留原工作、revision與DB。終止與刪除不同：終止保留原始實體／歷史供追溯；刪除定義若仍被引用則拒絕。root可改初始資料；child禁止初始資料修改且<=forkMonth事件不可新增／移除／改payload／sequence／dependsOn。複製／重新排序不能繞過鎖定。V3新建子分支的操作不得早於來源自身forkMonth；更早規劃先選更早來源，沿用既有危機入口規則，不自動改寫舊分支點。完整候選可由changeV3State一次替換項目並重新指定其事件引用，見[ITEMIZED_MUTATIONS.md](ITEMIZED_MUTATIONS.md)。

每次套用保存前一版完整profile、events及presentation到history，revision+1；profile改動另profile.version+1。單純預覽、取消、拖曳草稿不改history。history每筆亦需完整校驗與可重播，不只校驗current。舊版history不能塞入V3型別；遷移來源另存原始revision映射。

## 快照與來源

V3 Snapshot除共同month／cash／assets／debt／netWorth／income／expenses／payment／interest／cashFlow／gap，增加`items`（四類ID對應月末值／當月流量／活動狀態）、`flows`、`effects`。assets不含cash，debt只加每項剩餘本金；income只真實收入，expenses為經常支出與一次消費，不含還本或投資轉換。payment含實際支付的貸款本息，interest是其中利息，不再從現金扣第二次。`cashFlow=cash[m]-cash[m-1]`，月0為0；不同收支與本金項以flows核對，不以income−expenses猜測全部現金變化。

每個flow有 `{sourceId,sourceKind:'entity'|'event',entityId,category,amount}`；amount是帶正負的現金變化，category為income／expense／interest／principalDraw／principalRepay／assetPurchase／assetSale／investmentTransfer／fee／claim。常規本息拆利息與本金，不能再加一筆整體payment flow；保費expense只一次，理賠不列工作收入。非現金重估列effects而非flows。月0flows空；每月sum(flows.amount)=cashFlow，netWorth=cash+assets−debt。

場景／比較／報表透過同版快照適配，不能自行重算。employed來自有效salary來源是否有正收入；沒有salary但有side不假裝失業事件發生，UI需顯示收入來源而非由單一布林推論職涯。ownsHome來自有效property。退休、成員、保障等狀態只在相應已註冊事件／資料存在時輸出；未知不當false或預設人生經歷。

## 顯式遷移與保留原始資料

不在parse／載入／儲存時自動遷移。流程：先下載原始JSON → 選整個同引擎分支樹 → 補齊映射／明示假設 → 預覽全期間差異及阻擋項 → 明確套用 → 另外儲存。未選樹留原引擎；選中樹全部節點含history一起轉換，父子ID／forkMonth不變，不產生混版本分支。已有V3不再次遷移；混合專案只轉尚未升級的完整樹。

schema5的`migration`保存舊migration原物件（legacy）、及`itemized`紀錄陣列；每次紀錄 `{version:1,sourceSchema,sourceScenarioIds,sourceScenarios,sourceEnvelope,mappings}`，sourceScenarios為來源樹完整原Scenario（含profile、events、initialDetails、presentation、history）。不只存hash，也不覆寫舊參數；sourceScenarios僅含尚未升級的V1/V2資料，不在其中嵌入Project或遷移紀錄。sourceSchema可為1–5；schema5混合專案再轉其他舊樹時，既有itemized紀錄沿用，禁止把它整份再嵌入新紀錄。sourceEnvelope保存來源容器的schemaVersion、可選全域engineVersion與既有migration紀錄索引；legacy保存最初舊migration原物件，既有紀錄以索引引用，供重建來源語意而不遞迴複製。來源與新輸出同算2MB，超過則拒絕，讓使用者保留舊版／另建專案，不刪history。這是版本備份，不是第二份正在運算的實體。

每個Scenario current及每筆history各有mapping entry（scenarioId,revision,context），不是只配對目前畫面：

1. 原明細ID以類別前綴保留為穩定新ID，碰撞時要求顯式映射；無明細時建立一筆「原有彙總」，不拆猜薪資／家庭用途。所有映射紀錄原ID與新ID；名稱／金額原樣留來源。資料本身無法判斷的income.kind需使用者選擇，否則kind=other並明示尚未分類。
2. V2租金獨立建立expense kind=rent；生活費明細不含它。V1沒有獨立租金，不從expenses猜拆，轉成living總額且不暗填租金；如要停租須使用者明示拆分，改變假設須列在差異預覽。
3. 既有資產明細轉kind=other。已知住宅事件的資產從事件建立，不再加初始資產。既有debtSchedules與debt明細沒有共同關聯ID：禁止按名稱、排序或相似金額配對。使用者為每個schedule指定明細分配金額，必要時拆一筆明細成多筆負債；每排程配置額必須等於openingBalance，每明細配置額不超原amount，未配置餘額轉static。總額保持逐分相等，無有效配置則阻擋。
4. 舊incomeChange／unemployment作用所有原彙總收入，不能偷偷改成只影響一筆。多來源時要求明示目標及新金額／替代收入分配；各來源之和對應原彙總，全部目標需存在。為保留舊效果可展開成多個V3事件，總事件數仍<=100；事件ID映射完整保存。使用者改成只停薪資時是明示新假設，預覽需顯示與舊版差異。
5. 舊事件按原引擎month／id的有效順序配置sequence（擴展事件保持來源連續），不按新UUID重排。舊買房未記費用／持有成本時，使用者明確確認「沿用舊模型的零成本假設」才輸出0／null；V2 stopRent=true停全部對應rent，V1沒有租金欄不推測。未達新精度的年利率列出原值、禁止自動取整，可保留舊版或另建新假設。
6. 舊history的明細／排程可能不同，不能盲套current配對。mapping針對各revision校驗，有一筆缺少就拒絕整樹；presentation與歷次revision不遺失。新V3 history保存轉換後可重播參數，來源history保留於migration紀錄供原引擎重播。

預覽顯示每方案每月共同數字（現金／資產／負債／淨資產／收入／支出／本息／利息）及首次差異、合計差異、差異原因；不能只比目前月。V3採新取整／分項語意，可能與舊引擎相差分位，**不宣稱無損財務等價**。套用要求使用者確認完整差異與改動假設；若標示「保留結果」模式，任何一分差異都拒絕，沒有容差。舊結果依原sourceScenarios路由仍可重播；取消不改專案或IndexedDB。migration來源紀錄、未知格式與來源樹關聯也須strict驗證，不將任意JSON當可信備份。

## schema5續遷移的實際封套

sourceSchema=5時，sourceEnvelope為 `{schemaVersion:5,migration:{legacy,itemizedRecordIndexes}}`。indexes是紀錄建立前已存在的itemized紀錄完整前綴 `[0,…,n−1]`；不重複嵌套原紀錄，只在本紀錄sourceScenarios保存此次選中舊樹。解析同時重驗所有前序來源與baseline，拒絕缺漏／重排／前向引用。紀錄與來源備份仍計入同一2 MB上限，已V3者不可再次遷移。續遷移domain能力已交付；讀取／保存入口見[ITEMIZED_WORKSPACE.md](ITEMIZED_WORKSPACE.md)，完整映射／確認介面已由PR #67交付，見[ITEMIZED_MIGRATION_UI.md](ITEMIZED_MIGRATION_UI.md)。

## 可重用數值與驗收閘門

[26個#27 reference fixtures](fixtures/pc-event-contract.json)保留原格式：新引擎adapter只換輸入表示，不修改expected以配合程式。指定薪資／兼職月收入例為1000000、1000000、6500000分；兩筆零息債務在月1／月2付款10000／20000分、餘額350000／330000分；租金1000000與生活費2000000分分離，不含本金。fixture中basis-points×100為新ppm。

#43必須加真實引擎adapter及數值／不變量測試，涵蓋目標不存在／失效、跨類重複ID、兩來源只停一筆、兩負債獨立、期初／首付／末期、half-cent、overflow、關聯刪除、same-month衝突、history／分支、舊版全月份回歸。#44交付表單→預覽→套用→定位／分支→JSON／IndexedDB還原。後續C05–C21由對應Epic逐組註冊、版本化並接同一reference fixtures；#43不能宣稱未註冊事件已可執行。

#42交付時僅文件／接口設計；生產schema5及新公式已由#43按版本交付，不改舊引擎公式。工作量按交付切片：#43模型／驗證、核心計算、版本路由／顯式遷移各一組審查；#44四事件表單及完整垂直驗收；中期每Epic再按#27待拆清單細分。數值／遷移為最高風險，準確工作日待#43首個切片量測後更新；不以虛構日期承諾掩蓋依賴。
