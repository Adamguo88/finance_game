# 驗證現況與證據

更新：2026-11-27（Asia/Taipei）。當前推進#43分項存檔／遷移與產品入口；下方各段保留當時基準，舊「待實作」文字不代表目前狀態。正式合併／CI／Pages證據由對應PR回讀核對。

| 類別 | 最新已確認證據 | 界線 |
|---|---|---|
| 財務與應用回歸 | #28：91單元、typecheck、根路徑／Pages build；61 E2E；最後補強後3項重跑 | 詳見下方本輪紀錄與PR最新head CI |
| #29正式交付 | PR #40；head CI 45744994208、main CI 45763083370 success | main 5a28284；獨立於真人簽核 |
| #29正式發布 | Pages run 45763083300 success | 不表示 PC 全功能完成 |
| #28子路徑 | schema4明細／造型／history匯出還原、65歲階段正確，pageerror/requestfailed=0 | main 7a2519c：CI 45764983216／Pages 45764983221 success |
| 真人／多瀏覽器／實機效能 | #6／#24 尚待驗收 | 軟體 GPU 不能證明硬體 60fps；未測不填通過 |
| 待開發 | #42–#44短期 → #45–#55中期 → #23報表 | #27契約已交付；#25行動端等#24完成 |

## #43 第七切片：產品版本分派與分項讀取／保存（候選）

新增workspace.parseStoredProject分派schema1–4／schema5，IndexedDB沿用原DB version1與current key；原ProjectSchema／V1/V2公式不改。UI根節點按容器選擇原工作室或分項工作室，新資料不交給舊表單覆寫。分項檢視、逐月資金來源、混合版本比較、首頁／取消建立、JSON往返及IndexedDB另存已接線，完整邊界見ITEMIZED_WORKSPACE。

補上current／history全期間的數值重播：格式合法但未來累計超出safe integer的資料，在匯入／保存前拒絕並保留工作，避免到畫面render才拋錯。比較標示各人生年齡與共同經過月份；事件清單共用原引擎階段／依賴排序。大額顯示以整數分格式化至安全整數極限，不經Number/100丟失分位。

本地npm test 284/284、typecheck、root build通過；完整root E2E 66/66（4.0分鐘），最後顯示補強後Pages build及 `/finance_game/` 子路徑5/5通過（11.8秒）；root新入口亦曾5/5通過。新增5個瀏覽器案例涵蓋來源／history與JSON完整保留、指定收入逐月結果、IndexedDB儲存／讀取、混合版本／跨年齡比較與舊格式切回、首頁／取消、損壞本機資料與未來溢出拒絕。首次瀏覽器啟動遇環境重啟導致server失連，改在同一程序管理服務後重跑通過，不算產品失敗。

root初始gzip JS 280,198 bytes、全部chunks469,490 bytes，依HTML script URLs去重逐檔gzip(mtime=0)，較#28基準各增10,103 bytes；沒有新依賴、後端或外部資料服務。已檢視1440×900 synthetic資料截圖，桌面1280×800／1440×900／1920×1080無水平溢出由新增案例檢查；不冒稱真人、多瀏覽器、合法最大資料延遲或硬體效能已完成。

本輪不交付V3參數／事件編輯、分支變更或完整遷移映射／確認介面；#43尚待這些整合前置與保存流程驗收，#44及中期維持原順序，不結案。PR #64合併main `45c552e`，head CI 45777843600、main CI 45948676840、Pages 45948676904均success。

## #43 第六切片：schema5混合來源續遷移（PR #64已交付）

記憶體session可對schema5中尚未升級的完整舊樹建立下一批候選，既有V3人生與itemized紀錄維持原值，不再轉換。新紀錄sourceSchema=5，sourceEnvelope只以itemizedRecordIndexes引用先前完整紀錄前綴，不嵌套複製整份遷移紀錄；選中舊樹的來源參數與history仍完整保留。解析拒絕前向／重複／遺漏索引或移除／重排舊紀錄，合計2 MB上限不變。

續遷移先驗完整schema5，再將全部尚未升級舊樹交給來源映射檢查，因此不能藉由省略子方案繞過完整樹規則。預覽保留完整schema5來源；已升級人生的合法更名等變動也會使既有預覽stale，不覆蓋工作。備份匯出請求、取消、差異確認及另外保存的界線沿用前批。

本地npm test 274/274（新增13項）、typecheck及diff檢查通過；涵蓋二／三次續遷移、原紀錄不變、無重複嵌套、完整子樹、索引損壞、未選人生變動、舊紀錄損壞、空紀錄容器與取消。完整build／E2E交PR CI。生產ProjectSchema／UI／storage仍未開放schema5；#43尚待產品入口與保存整合，不結案。

## #43 第五切片：schema5獨立封裝與確認（PR #63已合併）

新增project-v5獨立strict codec，保存混合版本的獨立根人生、legacy遷移資料、選中來源樹、來源容器與每revision映射。解析時重驗來源、映射與當初的V3 baseline；後續合法編輯從history找回原revision，遺失baseline、循環／跨版本分支、重複遷移或未知資料皆拒絕。來源備份與映射同算2 MB，沒有靠丟history通過上限。

migration-v3-session封裝純記憶體協定：匯出原始JSON請求→預覽→確認。確認前重驗候選及目前工作是否仍與原來源一致，取消後不可套用；有一分差異也須明確接受，保留結果模式拒絕差異。預覽深拷貝不會改到封存候選，確認只回傳新專案，不改工作、不寫DB。匯出方法僅產生備份JSON並記錄請求，真正下載及其錯誤處理須由後續UI完成，不宣稱已在使用者裝置保存檔案。

本地npm test 261/261（新增18項）、typecheck及diff檢查通過；涵蓋封裝還原、來源／映射破壞、缺父／循環／跨版樹、stale／取消／一次確認、1分差異、原始metadata、後續history baseline、深拷貝及合計大小上限。完整build／E2E交PR CI。

本切片當時只對schema1–4來源建立新schema5容器，尚未支援schema5混合專案的其餘舊樹續遷移；生產ProjectSchema／storage／UI仍未開放schema5，既有匯入持續明確拒絕。這些整合及真人流程仍待完成，#43保持open。PR #63 head CI 45777212743 success，已合併main `13ef1d9`，main CI 45777703469／Pages 45777703399均success。

## #43 第四切片：顯式來源映射（PR #62已合併）

新增migration-v3-mappings，逐筆驗證使用者提供的明細→分項、排程→負債及來源事件→新事件映射。保留現金及各來源明細金額，V2租金與生活費分開；一筆負債明細可明確拆成多筆獨立排程，餘額須為static。彙總收入／失業／租金事件要明確分配全部目標，原金額、期間、同月有效順序不默默改變。購屋只有在確認沿用舊模型零成本假設後才接受0費用／無持有費；原始參數仍保留。

同一來源跨current／history及同樹分支的目標ID保持穩定，每個revision均要有完整映射。未知來源、重複分配、改變利率／排程／分類／期間、未對應新實體或事件均拒絕。這個保留原始輸入的映射模式不代填市場或個人假設；新的財務選擇由後續明確編輯交付。驗證後才調用全月份比較，尚未建schema5容器或提供套用／DB寫入。

本地npm test 243/243（新增35項）、typecheck、git diff --check通過；涵蓋多來源、負債拆分／未配置餘額、V1摘要不猜租金、完整分支／history穩定ID、26組拒絕邊界、購屋零成本確認與原始輸入不變性。PR #62 head CI 45776355224 success，已合併main `a6264ca`，main CI 45777076236／Pages 45777076218均success。#43仍待存檔版本路由、完整來源紀錄、預覽／備份／確認／取消／另外保存的整合，保持open。

## #43 第三切片：遷移差異比較基礎（PR #61已合併）

新增migration-v3-preview純比較工具，接收既有專案及明確提供的V3候選，校驗完整選中分支樹、current／history身份與角色保留，逐月比較9個財務欄位。舊V2本息先加總房貸與既有排程，對齊V3總本息；delta以整數字串保留精度。摘要保留首次差異、異動月份數及每欄最大／終點差異，完整月表按方案／revision另外取用，不同時長留所有history快照。

來源完整專案與候選均深拷貝，預覽沒有轉換映射、套用或DB寫入能力；不能把「候選有效／無數值差異」當作已完成遷移。current明細／角色不繼承到缺少該欄位的歷史版本。舊利率按JSON十進位表示精確換ppm，不可表示的精度拒絕，不Math.round取整。

本地npm test 208/208（新增26項比較／精度檢查）、typecheck通過；包含未來月份差異、各history差異、完整樹、角色／明細保留、兩種本息對齊、未知／過大來源、無效候選與不改輸入。#43仍待具來源對應的完整轉換、schema5／路由、備份／預覽／確認／取消與另外保存的使用者流程；本切片未向產品入口註冊新格式。PR #61 head CI 45775451203 success，合併main `8efc920`，main CI 45776215535／Pages 45776215517均success。

## #43 第二切片：V3月度運算（PR #60已合併）

新增獨立engine-v3，使用BigInt有理數計算名目年率／12月付與half-up利息；依分項及有效期間、指定收入中斷／基準調整、指定租金、購屋／停租／持有費用及獨立負債排程產生月末快照。flow區分收入、費用、借還本金與資產購買，effects及items保留來源；借款不冒充收入，費用／本金不重複扣款。舊V1／V2及production版本路由不變。

本地npm test 182/182、typecheck通過；新增15項引擎測試，其中4個直接對照#27既有golden expected（兩個指定收入、一個獨立債務、一個住宅購買），沒有修改reference期望。另驗證租金獨立、有效期間、首付前不計息／末期實額、微額取整、延後首付、現金購屋、逐月flow／分項／淨資產不變量、輸入與快照隔離、opaque ID及累積溢出拒絕。其餘#27算例所屬C05–C21尚未註冊，不能稱完整事件引擎完成。

model-v3切片PR #59已合併main `e269bf8`，head CI 45774019460 success；其main CI 45774568560、Pages 45774568779均success。本切片PR #60 head CI 45774651665 success，已合併main `367a030`；其main CI 45775398539、Pages 45775398537均success。V3尚未開放匯入、顯式遷移／schema5／UI仍待交付，#43保持open。

## #43 第一切片：V3模型與關聯驗證（PR #59已合併）

新增獨立model-v3，依#42定義四類實體、排程、四類事件strict payload及current／history驗證；跨類ID、期間、同月sequence、依賴循環／未來依賴、停租衝突與無效目標明確拒絕。沒有向production ProjectSchema註冊schema5，既有存檔入口仍拒絕未完成版本，V1／V2計算與UI不變。

本地npm test 167/167（新增48項）、npm run typecheck通過。涵蓋有效多來源／獨立排程與不變性、40組拒絕條件、未知型別／欄位／版本，以及schema5未開放的匯入邊界。這是模型與關聯驗證，尚無V3月度快照、版本路由、遷移或新UI；#43必須保持open。完整build與E2E交由本切片PR CI，未冒稱本地重跑。

## #42 分項契約（PR #58已交付）

ITEMIZED_FINANCIAL_CONTRACT明訂schema5／engine3、四類實體與排程、ID／期間／sequence、首批四事件payload、現金流與來源，以及current／history／整樹遷移。原始profile／明細／外觀／history保留；多來源事件與無關聯ID的債務必須顯式映射，舊利率不默默取整，轉換全月份差異需預覽確認。尚未改生產parser、公式或UI，#43／#44仍未完成。

PR #58 head CI 45773218715、合併main `7a2a035` CI 45773618970及Pages 45773618935均success。本批60個Markdown相對連結有效、git diff --check通過；src／tests／依賴／workflow無變更，本地未重跑產品測試，完整回歸由候選PR最新head CI執行，不把#27的119／61項結果冒稱新引擎驗證。

## #27 事件範圍與數值契約（PR #57已交付）

PC_EVENT_CONTRACT列出原討論來源D1–D5、C01–C21、同月階段、期間、關聯刪除、資金分類與明示假設；PC_SCOPE逐列補上來源。26個整數分參考fixtures以獨立BigInt有理數驗證，包含指定收入、獨立負債、買賣／清償、家庭／退休、保障額度、延後理賠、投資／通膨／利率與取整邊界。

本地npm test：119/119；npm run typecheck通過。新增28項為契約參考與拒絕條件，不是V3生產引擎測試；既有91項回歸保留。src、現有引擎版本／公式、schema1–4與workflow沒有修改。PR #57最新head `7139b83`的完整CI 45772121540 success；合併main `83f5c0e` CI 45772426844、Pages 45772426835均success。完整CI含build與61項E2E；真人與新事件UI仍未驗收。

## 短／中／長期路線落地（2026-11-26）

依原始討論與使用者核准計畫，更新ROADMAP為總路線、NEXT_PHASE為當前佇列、PC_SCOPE為F01–F20責任／驗收矩陣，並同步AGENTS／README／PRD／ARCHITECTURE入口。下一項改#27，#23移至完整模型／事件／體驗之後。

已去重建立#42–#44短期3項及#45–#55中期11個Epic，包含各自依賴、範圍、數值／流程邊界及實作完成閘門。#27／#23／#24／#25同步新路線；#28／#29與其他已交付issues不重開，#6真人驗收保持未完成。中期先定契約再拆子實作；長期待決策僅寫入ROADMAP，沒有建立3D／後端／AI任務。

本次沒有產品程式、型別、公式、存檔版本、依賴或workflow變更，也沒有開始#27產品實作。本輪檢查：49個Markdown相對連結有效，git diff --check通過；14個新issue去重、依序前置與未勾選驗收條件檢查通過。18個新增／調整issue正文逐項回讀一致、均維持open；共有19個未結案issue，僅#27為stage:next。src、tests、public、scripts、依賴及.github/workflows均無差異；既有91單元／61 E2E是已交付版本證據，不冒稱本地重跑。完整檢查由本文件PR的既有CI執行。

## PR #39 文件與 issues 整理（歷史）

移除初始任務、一次性建單 JSON 與舊建單腳本；有效財務、建模及呈現契約與 fixtures 保留。現況入口與矩陣同步完成證據，歷史由 Git／PR 及下方實測紀錄追溯。本輪沒有產品程式、公式、存檔版本或 workflow 變更，沒有啟動背景開發；本輪檢查：37 個 Markdown 相對連結全部存在；過時任務／建單檔案的有效入口引用已清除（下方歷史原文保留）；git diff --check 通過；src、tests、依賴與 .github/workflows 均無變更。GitHub 8 項議題已逐項回讀，正文與預期一致，#7 closed，其餘 7 項 open，階段標籤正確。本輪本地未重跑產品測試；完整驗證交由本整理 PR 的既有 CI 執行。GitHub 目前工具不提供建立 milestone，階段以 stage:next 標籤及正文分組，不冒稱已建立原生 milestone。

## #28 角色／生命階段與聯合驗收（2026-11-26）

- 先提交 AVATAR_PRESENTATION.md 契約，再實作schema4的presentation與history；schema1/2/3不自動插入預設欄位。修改外觀不改V1/V2公式／engineVersion。純V1的schema3/4仍可走原始備份→預覽→明確確認的財務升級，保留明細、造型、history與真實來源版本；混合／已V2不再次轉換。
- npm test 91/91、typecheck、根路徑build通過。新增5項單元涵蓋V1/V2全月份結果不變、history／明細／造型、父子隔離與鎖定、未知版本／選項拒絕、36模型與39/40/64/65歲邊界，以及V1先設定角色再顯式升級。
- 完整靜態E2E 61/61通過（3.6分鐘），包含所有既有手機／財務／事件／時間軸／回憶錄／GPU／音效案例。末次補強顯式升級的歷史資料保留後，重新通過91單元、typecheck、build與3項聯合流程／V1升級／自訂角色GPU E2E（18秒）；最新PR CI再跑完整套件。
- 新增2項PC E2E：新建多筆明細→選外觀→播放／回溯39/40/65歲→分支→父改造型→同月比較→保存／重載→JSON還原→未知格式拒絕且不覆蓋；另驗證舊V1預設角色、草稿保護／還原、SVG備援與保留造型的顯式財務升級。
- 新增1項真WebGL（軟體GPU）E2E：長髮海洋藍在64→65歲及職涯暫停時更換正確texture，context lost後SVG同一造型／階段／姿勢。既有最多4個contexts、靜止無持續RAF與20方案生命週期回歸通過；未宣稱硬體60fps或真人驗收。
- 模型匯出48份SVG共67,923 bytes，新增36個角色變體，低於150 KiB預算。模型圖鑑45格，manifest／獨立SVG皆驗證可載入。已檢視建立頁、平行比較與GPU／SVG截圖；建立頁角色設定壓成雙欄，1440×900可見下一步。
- 初始gzip JS 270,095 bytes，全部chunks 459,387 bytes（#22為266,530／456,179）；包含#29及#28，沒有新依賴／外部服務。採HTML script URLs去重後逐檔gzip(mtime=0)，不包含字型／CSS／HTTP Brotli。
- `NEXT_PUBLIC_BASE_PATH=/finance_game npm run build`通過。3121真子路徑新建2筆收入、選長髮陶土紅、套用短髮、schema4匯出／還原，history保留長髮，跳到65歲顯示正確熟齡造型，pageerror/requestfailed=0。
- git diff --check、文件相對連結與資產清單檢查通過；CI配置／依賴未改。#23尚未啟動，#6／#24真人／多瀏覽器／實機效能仍待後續。

## #29 多筆財務初始化（2026-11-26）

- 契約先以獨立提交建立 INITIAL_DETAILS.md，再實作 schema3、initialDetails／history 驗證、舊格式保留與引擎轉接；沒有修改 V1/V2 公式或 engineVersion，沒有新增依賴／改 CI。
- npm ci 首次因預設快取 /home/agent/.npm 不可寫失敗，改用 `npm ci --cache /tmp/finance-npm-cache --no-audit --no-fund` 成功。之後 npm test 86/86、typecheck、根路徑 build 通過。
- 完整靜態 E2E：`PLAYWRIGHT_BASE_URL=http://127.0.0.1:3120 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e -- --workers=1`，58/58 通過（3.0分鐘），保留既有手機、GPU／動畫及全部財務回歸。
- 新增4項單元涵蓋全月份逐分一致、明細與租金／負債／還款不重複、歷史明細、父子深拷貝／鎖定、未知版本／重複ID／金額不一致及舊存檔不改寫。
- 新增2項PC E2E涵蓋明細增刪改、摘要同步、草稿還原與匯出不套用、格式升級、本機重載、分支明細與鎖定、未知格式匯入不覆蓋。首輪測試誤找重載後的首頁按鈕，改為既有工作室讀取並等待保存成功，沒有放寬timeout。
- 已檢視1440×900明細截圖，調整側欄為單欄避免擁擠。`NEXT_PUBLIC_BASE_PATH=/finance_game npm run build` 通過；3121真子路徑實測新建2筆收入、schema3匯出／還原，pageerror／requestfailed=0。
- git diff --check 與文件相對連結檢查通過。#28 尚待後續實作；真人、多瀏覽器與實機效能留 #6／#24，不以本輪代理測試代填。

## 歷次實測證據（保留原始紀錄）

# #22 確定性人生回憶錄（2026-11-26）

- `npm test` 82/82、typecheck、根路徑 build 通過。`PLAYWRIGHT_BASE_URL=http://127.0.0.1:3110 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e -- --workers=1`：56/56 通過，2.9分鐘；保留所有財務/分支/存檔/事件/缺口/時間軸/動畫/renderer/既有手機回歸。
- 新增4項單元：固定資料決定性/排序/來源不變、無事件/負現金及V1/V2購屋租金語意、分支月結束順序/承接鎖定/父子隔離、未來事件重建不更改history及短人生截止。沒有時鐘、AI、隨機故事、成功評分或新增事件。
- 新增4項桌面E2E：空排程與未來終點、同方案同月跳轉/焦點、混合V1/V2與鎖定/負現金、回顧跳轉不被舊比較的短期間截斷、未來事件編輯後摘要更新與history保留、20方案各100事件的20筆分頁/Enter跳轉及完整JSON不變。
- 首輪精確label選單定位超時；補上明確aria-label後4/4通過（13.1秒），未略過測試或放寬timeout。跳轉先切換到對應單人生體驗，再設定共同月份，避免比較期間靜默截短。
- 已檢視PC回憶錄截圖：明示目前版本/引擎/資料來源、未來模擬排程及同月快照不代表單一事件貢獻。沒有把history參數修訂冒充實際發生的人生。
- `NEXT_PUBLIC_BASE_PATH=/finance_game npm run build` 通過；3112真子目錄回憶錄篩選→跳至同方案第768月，完整JSON內容不變、pageerror/requestfailed=0。
- root initial gzip JS 266,530 bytes，全部chunks 456,179（較#21增加2,370）；沒有新增依賴/素材、domain公式/版本/遷移或Project欄位。詳見 [LIFE_MEMOIR.md](LIFE_MEMOIR.md)。真人/多瀏覽器/實機效能及完整PC驗收仍待#24，#27–#29仍未完成。

# #21 使用者主導的現金缺口決策（2026-11-26）

- `npm test` 78/78、typecheck、根路徑 build 通過。完整靜態 E2E：`PLAYWRIGHT_BASE_URL=http://127.0.0.1:3110 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e -- --workers=1` 52/52 通過（2.6 分鐘）。預覽定位/表單呈現微調後，4 項新缺口 E2E 再次全數通過；加入圖層覆蓋斷言後再次4/4通過（13.0秒）。
- 新增單元驗證候選與來源不變、負現金/零負債保留、全部未來排程深拷貝、V1 不升級、無缺口/空名/非法點/來源鎖定/20方案上限拒絕。所有數值仍由既有引擎/fork/parse 提供，沒有改 domain、公式、版本、遷移或 Project schema。
- 桌面 E2E 涵蓋快照金額/連續缺口起點、預覽取消/回溯/焦點、確認後才新增分支、事件預覽取消不寫入、事件一次 history、原人生逐項不變、同月比較與 IndexedDB 不自動覆寫、切回父人生只變檢視、V1 支援限制、滿20方案停用 fieldset 的 Tab/Shift+Tab/Escape。
- 預覽截圖捕捉到 #20 的 sticky 刻度 z-index 穿過 modal；以 trackScroll isolation 建立局部堆疊層級，讓所有事件/缺口視窗遮住背景刻度，並以 elementFromPoint 驗證可見背景刻度由 dialog 覆蓋。
- 共用 modal focus trap 補上 :disabled，排除 inherited disabled fieldset 的子控制；原事件/轉換/場景 modal 回歸保留。檢視真截圖後讓預覽生成時自動捲動/聚焦結果，並覆寫通用 editor form 的巢狀尺寸，避免結果藏在視窗下方。
- `NEXT_PUBLIC_BASE_PATH=/finance_game npm run build` 通過；3112 真子目錄掛載，模擬缺口→預覽→預覽區焦點→取消，完整 JSON 內容不變，pageerror/requestfailed=0。已檢視預覽截圖。
- root initial gzip JS 264,160 bytes，全部 chunks 453,809（#20 initial 261,997，增量 2,163）；未新增依賴、模型、音檔或網路服務。沒有加入保險、投資、出售或新借款規則，後續先由 #27 訂契約。詳見 [CASH_GAP_CHOICES.md](CASH_GAP_CHOICES.md)。真人多瀏覽器/實機效能及 PC 總驗收仍待 #24，#27–#29 尚待完成。

# #20 PC 時間軸縮放與密集事件導覽（2026-11-26）

- Node 24.22.3 / Chromium 156.0.8078.79。`npm test`：74/74，`npm run typecheck`、根路徑 `npm run build` 通過。
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3110 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e -- --workers=1`：最終 48/48 通過，2.6 分鐘。既有財務、分支、事件編輯、歷史、保存/還原、動畫與 renderer 生命週期測試保留；沒有刪既有手機回歸測試或更改 CI 觸發。
- 新增 5 項導覽 E2E：月/年/全人生縮放不改時間或 JSON、跳至 0/360/864 月及分數/超界拒絕、20 方案各 100 事件/864 月、卡片無重疊/鍵盤首末/切方案、改比例後衝突/鎖定/一次拖曳提交/Escape 取消、跨相鄰卡片改期焦點保留與一次歷史、長短人生共同比較上限拒絕。全部與既有 4 項 timeline 測試相容。
- 合法 20×100 上限資料匯入到第一張完整時間軸約 1.6–2.0 秒（最近一次 1,573ms），包含首頁、驗證、模擬及瀏覽器自動化，不是 100ms 純 UI 延遲證據。100 個事件全為原生可聚焦按鈕；上限資料導覽不等於同時以 20 個 GPU renderers 壓測，GPU 仍最多 4。
- 檢視 PC 概覽截圖後修正 70/72 年末端刻度重疊；補單元測試保留終點與標籤間隔。增加重排後焦點回復及比較 seekLimit，避免卡片 DOM 重排丟焦點或把超過短人生的輸入靜默截短。
- `NEXT_PUBLIC_BASE_PATH=/finance_game npm run build` 通過；3112 真實子目錄掛載測月份/概覽切換、跳至第 700 月、超界拒絕與游標定位，pageerror/requestfailed=0。
- 首次新 E2E 的 alert 定位撞到 Next route announcer；改為時間軸區域內的 alert，沒有移除錯誤顯示或略過驗證。錯誤欄位加上 aria-invalid/aria-describedby。
- 根路徑 initial gzip JS 261,997 bytes，全部 chunks 451,646；相較 #19 紀錄新增約 1.6KB。未新增依賴/素材，未修改 domain、財務計算/版本、Project/JSON 格式或 history 契約。詳見 [TIMELINE_NAVIGATION.md](TIMELINE_NAVIGATION.md)。真人硬體/多瀏覽器/長時間記憶體與 PC 全功能總驗收仍待 #24；這不表示 #27–#29 已完成。

# #19 有限動畫與可控音效實測（2026-11-25）

- `npm test`：72/72；`npm run typecheck`、`npm run build` 靜態根路徑輸出通過。沒有新增依賴、財務 domain/公式/版本/Project schema 變更。
- 根路徑 out/ 由 Python 3110 提供；`PLAYWRIGHT_BASE_URL=http://127.0.0.1:3110 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e -- --workers=1`：43/43 通過，2.6 分鐘。新增 3 項 WebGL/Web Audio E2E，包含暫停/背景/系統減少動態、比較共用時間與 1×/4×/12×、事件音效去重/主動啟用/獨立偏好重載/匯出完整 JSON 內容不變。
- 早期雙 worker 完整測試 41/43，20 方案與比較轉場因軟體 GPU 爭用超時；找到 idle cue 多餘 state 更新與靜止 canvas 雙重繪製並移除。修正後同樣雙 worker 的全部 8 項 motion/renderer 測試通過（59.4 秒），再跑完整單 worker 43 項通過。未放寬 timeout、未刪測試、未改使用者 CI 觸發；遠端預設 workers 的完整結果另核對。
- `NEXT_PUBLIC_BASE_PATH=/finance_game npm run build` 通過；3112 真實子目錄掛載驗證體驗設定/減少動態/播放/暫停，pageerror/requestfailed 均 0。
- 首個動畫測試用一般斷言 polling 會錯過 220ms 短轉場；改用 RAF 觀察轉場中狀態，仍強制要求真 Pixi 畫布，沒有 skip 或只驗 SVG。
- 已檢視體驗設定與 PC 場景截圖。首屏 gzip JS 260,408 bytes，相較 #18 258,303 增加 2,105；所有 chunks 450,057。沿用 12 個 SVG/15,783 bytes，音效以正弦波原創合成，沒有音檔或額外網路素材。
- 1440×900 / Chromium 156 / SwiftShader 的月 1–3 RAF 短測：11 timestamp、8 個轉場內間隔，中位 33.3ms、P95 250.1ms，3 個 >33.4ms。此軟體 GPU 含慢幀，不能宣稱真實硬體 60 FPS 已達標；絕對時間轉場逾時直接落定，無補播佇列。詳細控制/生命週期見 [PRESENTATION.md](PRESENTATION.md)。
- PR #34 最新 head 的 CI 45596191596 通過後已合併；合併後 Pages 45596600670 的 unit 階段捕捉到測試使用真 performance.now 的浮點消去誤差（0.49999999999999983 與 0.5），阻止發布。修正為固定 1000ms 測試時鐘與手動 RAF timestamp，保留嚴格的半途進度/取消/過期斷言，沒有改產品動畫或財務精度，也不靠重新執行賭通過。
- 真 AudioContext 測試記錄 oscillator 啟動：初次載入/偏好還原皆不建立 context，使用者解除靜音/播放才啟用；事件一次雙音，回溯再播放不重複，偏好不寫入財務 JSON。CI 不具真人揚聲器聽感驗收，硬體 FPS/長時間記憶體、多瀏覽器及真人體驗仍由 #24 處理。

# #18 PixiJS 持續世界實測（2026-11-25）

- Node 24.22.3，`npm ci --cache /tmp/life-studio-npm-cache` 乾淨安裝通過；`npm test` 70/70；`npm run typecheck` 通過。
- `node scripts/export-models.mjs` 可直接重新產生 12 個原生座標 SVG（15,783 bytes）。Next SWC 編譯模型，不依賴瀏覽器。更新後 `git diff --check` 通過。
- `npm run build` 根路徑靜態輸出通過。Python server 3110 提供 out/，`PLAYWRIGHT_BASE_URL=http://127.0.0.1:3110 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e -- --workers=2`：40/40 通過，2.3 分鐘。
- 新增 5 項 renderer E2E 強制使用 SwiftShader 真 WebGL：畫布像素切月更新、GPU context loss 退回 SVG、GPU 不可用/素材失敗可操作、20 人生共用月份/不同工作狀態與最多 4 GPU、3 輪模式切換可重新建立；靜止 500ms 期間 RAF 呼叫不超過 2（無持續迴圈）。20 人生測試約 10.8 秒，包含上傳、逐項勾選、逐月與模式切換，不是純 GPU FPS/延遲基準。
- 已檢視真 Pixi 畫布截圖：微縮島嶼、工作/住宅/財務小屋、長椅與角色，HTML 按鈕保持可用；讀屏文字沿用同月 SVG 描述。
- 首輪完整 E2E 暴露新增載入 role=status 與既有存檔提示定位衝突、Pixi autoDensity 的 inline 固定尺寸造成溢出；修正為普通載入文字及 100% canvas CSS 尺寸，重跑全數通過。另明確移除 pointer tracking 與 GC scheduler 的 system ticker，idle RAF 測試通過。
- `NEXT_PUBLIC_BASE_PATH=/finance_game npm run build` 通過；另用 3112 的實際子目錄掛載、headless Chromium 真 WebGL 驗證首頁→範例人生→下一月，12 素材 manifest 正常，pageerror/requestfailed 均 0。此為本地 Pages 同形輸出驗證，遠端正式部署另核對 Actions。
- 首次遠端 CI 45592199935 為 39/40：React dev StrictMode 重啟 effect 時保留 loading、尚未開始 GPU init 的取消 import 仍佔名額，20 方案測試捕捉到 17 個卡住的 loading。修正為每輪重設 SVG、尚無 GPU 時即時釋放 lease，controller 所有權限於本輪 effect；不得以靜態測試成功代替 dev/CI 檢查。
- StrictMode 生命週期修正後，使用預設 `next dev` 的 5 項真 WebGL renderer E2E 全部通過（51.1 秒），再次 production build 通過。
- 沒有修改財務 domain、公式、版本/遷移、CI 觸發、Pages workflow。硬體 FPS/長時間記憶體、多桌面瀏覽器與真人總驗收仍屬 #24；角色個人化 #28、完整事件 #27、多筆初始化 #29 尚待完成。

# Issue #17：角色/住宅/職場原創向量與微縮世界

以原研究討論的溫暖低多邊形/2.5D 微縮世界為方向，替換原示意 SVG，提供角色工作/休息、租屋/自有住宅、職場正常/暫停、房貸標記、財務平穩/缺口及公園。首頁、五步建立、單人生與比較共用資產。住宅/工作/財務/休憩原生按鈕可先看同月明細，再明確進規劃；焦點、月份、分支鎖定及財務結果維持。另提供 9 狀態圖鑑、可修改 SVG/manifest 及匯出腳本，詳見 WORLD_ASSETS.md。

本地 typecheck、69 單元、靜態 build、完整 35 E2E 通過（約 1.1 分鐘）。新增 3 個 PC E2E 核對狀態/區域入口/焦點、缺口不誤當房貸、比較獨立 SVG IDs、圖鑑；匯出 SVG 後另核對 XML、大小、SHA-256，重建後 3 項 world E2E 再次通過（7.0 秒），含 9 個 SVG 的實際 HTTP 下載。已檢視 1440px 工作室、首頁與模型圖鑑；檢視抓到 stroke-only path 預設黑色填充及坐姿高度問題，修正後重建/回歸。

資產 source 10,878 bytes、獨立 SVG 13,073 bytes，低於150 KiB；以獨立 worktree 的 #16 b11a082 production baseline 比較首頁 initial JS gzip：253,562→257,794，增4,232 bytes，低於100 KiB預算。基準初次 symlink node_modules 被 Turbopack root 限制拒絕，改獨立 npm ci 後 build 成功再比較；不是應用建置失敗。沒有持續 SVG RAF/ticker，未聲稱動畫 FPS 或最重資料/跨瀏覽器皆驗證完成。

#16 的首次遠端 E2E 曾有 hydration 前入口判斷的測試競態，已改等待實際 welcome/studio screen；最新 b11a082 CI 45587468312 全通過後，PR #31 已自動合併。本階段保留該修正。財務 schema/引擎與 CI 未改，#18 PixiJS/#19動態、#28造型/生命階段及#29明細仍待後續；#6/#24真人不代填。

---

# Issue #16：PC 首頁、五步建立與桌面工作室

已實作首頁新建/讀取/JSON 匯入/範例/返回目前工作，五步 V2 初始化（可返回、確認前不寫入）、純 domain 新建工廠，以及工作室草稿/未儲存/已儲存三態。PC HUD 在場景上方，旁欄獨立捲動，體驗模式收起編輯工具。sessionStorage 只記畫面，不冒稱保存財務資料。契約見 PC_UX.md。

本地 npm ci（67 packages）、69 單元測試、typecheck、靜態 build 通過。完整 E2E 32/32 通過（約 1.1 分鐘）；最後桌面排版調整後重建並再核對 3 項 journey PC 流程（7.6 秒），1280×800、1440×900 均無整頁水平溢出，已檢視 PC 截圖。原有測試改為明確從首頁按「探索範例人生」，沒有繞過產品流程。

第一輪本機舊 HTTP 3101 只回空回應，已停止該輪、用新 HTTP 3110 確認 200 後重跑；這是測試伺服器失效，不當作應用失敗。其後 30/31 的一項失敗為標題換行的 accessible name 空白，測試改為容許正常空白後完整通過。未宣稱真人或跨瀏覽器通過。

財務引擎、schema/事件版本、已有保存/分支規則與 CI 配置未變。角色/場景仍等 #17 替換，造型/多筆明細仍是 #28/#29，不能因此關閉 #24。

---

# Issue #15：原討論對齊與 PC 範圍矩陣

已實際讀取原研究討論，將 P01–P10、持續微縮世界、五步初始化、卡牌/三模式、2.5D 視覺與角色差距對應 PC_SCOPE.md。新增 #27–#29 追蹤完整事件庫、造型還原與多筆初始化，回填 #24 前置；#6 真人驗收仍保留。矩陣明列已實作、待開發、待驗收與非目標，並訂 PC 尺寸、瀏覽器及初始資產/效能預算。

此提交為文件盤點，未改引擎/應用/CI，未在本地重跑程式測試；核對文件連結、issue 依賴及 diff check。CI 另行執行，不能把範圍文件結案當 PC 全功能通過。使用者已授權每階段測試成功後自動合併。

---

# 下一階段 issues 與 CI 規格同步（2026-11-25，Asia/Taipei）

基準 main 7c861c4（使用者 PR #14：chore: optimize CI workflow triggers）。已實際比對 .github/workflows/ci.yml：由所有分支 push/pull_request 改為只驗證指向 main 的 PR、push main 及 workflow_dispatch；Node 24 與 npm ci/test/typecheck/build、Playwright 安裝/E2E 未減少。Pages workflow 仍為 main push/手動、獨立 build→deploy，未被本輪修改。

已讀取 repository 全部 issues 去重，建立 #15–#25 共 11 項，含優先順序、依賴與可勾選驗收條件。NEXT_PHASE.md 提供索引與排程，NEXT_ISSUES.json 保存實際 GitHub IDs/URLs/內容。PRD、ROADMAP、AGENTS、CODEX_TASK、README、ARCHITECTURE 同步目前 PC 範圍及 CI 行為；既有 #6 真人驗收與 #7 追蹤保持開啟，行動端改由 #25 等待 PC 總驗收 #24。這是規劃與文件更新，不代表新增功能、建模或驗收已完成。

本輪只做文件/issue 內容與依賴、JSON 解析、連結及 git diff --check 檢查；未重跑程式單元/E2E 或修改應用、依賴與 workflow。PR 的 CI 依目前配置執行，其結果另記於 PR，不能冒稱本地重跑。下方既有輪次保留為歷史紀錄。

---

# PC 事件庫與影響預覽（2026-11-25，Asia/Taipei）

依 PC 優先指示，延續 codex/multitrack-timeline / PR #12 的桌面編輯流程。新增現有四類事件的搜尋、住宅/職涯分類、參數與效果說明、版本/購屋/數量限制；快速新增入口共用草稿工廠。事件編輯採輸入與財務預覽並列，顯示事件當月及 90 歲終點的現金/負債/淨資產與差額。預覽 150ms 更新，無效參數立即隱藏舊結果，修正輸入清除舊錯誤。預覽及取消不更新 project/history/revision/IndexedDB；儲存沿用原流程。契約見 EVENT_WORKFLOW.md。

## 本輪實際驗證
- npm test：67/67；新增 7 項預覽數值、原資料/歷史不變、ID 替換與碰撞、版本/分支/重疊、終點去重及模板上限測試。
- npm run typecheck、npm run build：通過，純靜態輸出。首次 typecheck 發現測試的聯集 spread 未縮窄，改用明確事件參數後通過。
- 使用系統 Chromium 對 out/ 靜態網站執行完整 E2E：29/29（56.4 秒）。新增 4 項 1440×1000 PC 操作：搜尋/分類/V1 限制及焦點返回；預覽/取消不寫入、保存後數字一致；編輯只替換一次與無效輸入不留舊結果；衝突、草稿與分支界線保護。
- 已檢視 PC 預覽截圖，事件設定與比較表並列，10,000 元薪資調整的當月現金與終點差額符合數值例。這是代理截圖驗證，非真人驗收。
- 既有手機測試只作原套件回歸，未新增 iPad／手機適配工作。未重跑套件安裝（依賴/lockfile 未改，沿用前輪 npm ci 的環境）；遠端 CI 將核對乾淨安裝。
- git diff --check：通過。

## 交付範圍
仍在 PR #12 開發分支，不自動合併或發布，不宣稱 PC 全功能、角色/場景建模已完成。財務引擎、schema 與事件版本未改。事件庫僅收錄目前支援四類，退休/保險/投資等新規則仍須另訂數值契約。#6 真人驗收、獨立 review、讀屏與跨瀏覽器驗證仍保留。

---

# PC 優先開發指令更新（2026-11-25，Asia/Taipei）

依使用者明確指示，PRD、ROADMAP、AGENTS、CODEX_TASK 與 README 已同步：先完成 PC 全部規劃功能、UI／UX 與建模並驗收，再處理 iPad／手機。ROADMAP 增列 PC 全功能驗收後的裝置適配階段，S5 與 PRD 的行動端要求改為後續驗收；既有響應式程式、測試與下方歷史紀錄保留。本次只修改文件，未改應用或測試，也不宣稱 PC 全功能已完成。

驗證：實際核對上述文件中的新順序與衝突文字，執行 git diff --check；未重跑程式測試。

---

# 多軌時間軸開發（2026-11-25，Asia/Taipei）

基準為已部署 main 78aa082，在 codex/multitrack-timeline 開發，契約見 TIMELINE_CONTRACT.md。本輪現有事件四軌投影、整月拖曳、左右鍵/Shift 左右鍵、Escape 取消、模式唯讀、分支點鎖定、相鄰卡片分行與區塊內水平捲動。月份變動只走 changeEvents，放開才提交一次，保留 revision/history；不新增財務類別、不改公式/schema/engineVersion，也不改既有負債排程。初始草稿未套用時阻止重排。

## 已實際執行
- npm ci --cache /tmp/life-studio-npm-cache：通過，67 packages。
- npm test：60/60，含 55 項原測試及 5 項重排因果、原始資料/history、V1 購屋、V2 薪資、父子隔離、邊界、重疊與鎖定測試。
- npm run typecheck、npm run build：通過，純靜態輸出。
- 第一輪 E2E：24 通過/1 失敗，新增時間軸卡片與原租金新增卡的 accessible name 前綴相同，讓原測試無法唯一選取。已將時間軸卡片明標「時間軸：…」，保留原操作測試；修正後完整 25/25 通過（43.8 秒），對 out/ 靜態網站使用系統 Chromium 測試。
- 新增四個 E2E 已實際通過：鍵盤重排與財務/存檔還原；滑鼠拖曳只提交一次及 Escape 取消；同月衝突/鎖定拒絕；未套用草稿、體驗唯讀與 390px 區塊內捲動。
- git diff --check：通過。實作提交 8d40faf 的遠端 [CI run 45554003702](https://github.com/Adamguo88/finance_game/actions/runs/45554003702) completed/success，npm ci、60 單元測試、typecheck、build、Playwright 安裝與 25 E2E 均成功。
- 已檢視手機全頁截圖：四軌、目前月紅線、薪資卡及定位按鈕可見，整頁無水平溢出。這是代理截圖驗證，非真人驗收。

## 範圍與交付
本輪交付 [draft PR #12](https://github.com/Adamguo88/finance_game/pull/12)，未自動合併/發布，#6 真人驗收仍開啟。長跨度需水平捲動，手機可沿空白軌道捲動；遠距調月亦可在原事件視窗輸入。既有負債排程只在初始表單設定；未做新事件庫、縮放、區段長度拖曳、跨軌改類型、多人同步或 PixiJS。Safari/Firefox、原生觸控裝置及讀屏尚未測試。

---

# GitHub Pages 部署設定（2026-11-25，Asia/Taipei）

依使用者明確要求部署，從已合併 PR #10 的 main 建立部署分支。新增 main push / workflow_dispatch 的官方 Actions 靜態部署，部署工作只取得 pages:write / id-token:write，建置工作只讀取程式。Next.js 依 NEXT_PUBLIC_BASE_PATH 在部署建置使用 /finance_game，保留本地根路徑，啟用 trailingSlash。沒有改動財務引擎與資料格式。

本輪已執行 npm test 55/55、typecheck，以及子路徑靜態 build，皆通過。系統 Chromium 對實際 /finance_game/ 靜態 HTTP 網站核對 hydration、JS/CSS/字型請求、月份前進及 V2 備份/確認轉換，無 pageerror 或 HTTP >=400。一般根路徑 build 與完整 21 項 E2E 亦通過（35.1 秒），git diff --check 通過；線上部署是否完成以 GitHub Actions 實際結果為準，不能以本地成功宣稱已發布。

---

# v0.2 財務切片實作（2026-11-25，Asia/Taipei）

依使用者核准的計畫在 `codex/v02-financial-slice` 開發，基準為 main 2acea22 與設計提交 99eb0c9。目標截止為台北時間 13:00。這是未合併的開發成果，不代表 #6 真人驗收或正式發布已完成。

## 實際變更
- V1 model/engine 複製為獨立模組；已以逐字比較確認 V1 引擎除 import 路徑外相同。公開路由依 engineVersion 分派，schema=2 可保存不同版本的根方案，跨版本父子關係拒絕。
- V2 生活費/租金分列、購屋 opt-in 停租、租金與薪資事件、最多 20 筆既有負債排程；未分配負債固定，第一付款月前不累息，本金不重複扣入生活費。快照拆開房貸與其他負債明細。
- 顯式轉換 schema=1 全專案與 history，保留 IDs、revision/profile.version 與分支關係；對所有方案的全部月份逐分核對通用輸出。不一致或轉換超過 2 MB 拒絕。預覽需先下載原始備份，再確認；轉換不寫 IndexedDB。
- 介面新增排程、事件與比較明細、原始備份/取消/確認轉換。匯入或載入成功後重設表單草稿，失敗保留工作。事件驗證錯誤顯示於視窗內，視窗外內容 inert。
- 修正比較頁的年齡表意：頂部顯示共同經過月份，各卡顯示自己的年齡與引擎，避免未勾選的短方案顯示超過 90 歲。
- JSON 以緊湊格式輸出，UTF-8 字節限制與匯入一致，接近 2 MB 的有效存檔仍能 round trip。錯誤訊息不暴露 Zod schema 內部 JSON。

## 實際執行結果（截至本次提交）
- `npm ci --cache /tmp/life-studio-npm-cache`：通過，67 packages。
- `npm test`：55/55 通過，包含 19 項既有測試、8 組 V2 fixtures、貸款利率/期數邊界、取整、缺口、遷移所有月份一致、history、分支隔離、超限拒絕、UTF-8 與備份 round trip。
- `npm run typecheck`、`npm run build`：通過，輸出仍為純靜態網站。
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`：21/21 通過，對本輪 out/ 靜態網站驗證。
- `git diff --check`：通過。

## CI 暴露與修正
初次 PR CI run 45546884837 的 npm ci、55 項單元測試、typecheck、build、Chromium 安裝均成功，但 E2E 14 通過/1 失敗：Chrome 159 中 Escape 關閉事件視窗後焦點未回觸發按鈕。本地系統 Chromium 156 原先未暴露此差異。

已改為開窗前記住觸發控制，關窗後待 inert 移除再恢復焦點，避免抓到已被 inert 清除的 activeElement；加入 V2 升級/事件視窗的鍵盤回歸。並在 save/load/import 期間暫停操作，避免非同步載入與編輯相互覆蓋；以 IndexedDB 阻塞情境確認等待時不能前進月份、完成後互動恢復。焦點修正提交 b883fbd 的遠端 CI run 45547402707 已 completed/success；後續表單與精度修正提交 dc3c883 的 [CI run 45548770421](https://github.com/Adamguo88/finance_game/actions/runs/45548770421) 亦 completed/success，npm ci、55 單元測試、typecheck、build、Playwright Chromium 安裝與 21 E2E 均成功。最新本地靜態 E2E 21/21 通過。

## 後續邊界修正
- 基礎資料表單未套用時，切模式、換方案、建分支、開事件、儲存/讀取/匯入與模型升級均保留草稿並提示先套用或還原。匯出明示只包含已套用資料。取消草稿不增加歷史。
- 儲存等待期間內容 inert，結束後回復原控制焦點；IndexedDB 被版本連線阻塞的 E2E 已核對此行為。
- 編輯其他欄位時保留原始利率浮點參數，避免百分比往返造成 0.000011 → 0.000011000000000000001 的漂移；購屋與負債排程均有回歸。
- 80 字元無空白方案名稱曾在 390px 手機比較頁溢出，已加入斷行並驗證單方案/比較模式。精度與溢出測試均先重現失敗後通過。

## 代理實際 UI 檢視
共享 Chrome 已操作取消升級、下載原始備份、確認轉換、生活費/租金/負債表單與有息排程。12 萬、年利率 12%、12 期的首期明細為付款 10,661.85 元、利息 1,200 元、餘額 110,538.15 元、現金 809,338.15 元。第 6 月建立分支，兩方案數字一致；子方案第 13 月改薪資 7 萬，只該方案現金增加 2 萬，兩方案貸款都已清償。已保存此合成測試資料，並保留比較頁供檢視。

已檢視 390px E2E 全頁截圖：購屋停租顯示月租金 0、現金 959,777.78 元、房貸付款 22,222.22 元；中文、明細、表單與事件卡沒有水平溢出。這是代理視覺驗證，未冒稱真人測試。共享瀏覽器的 Statsig/extension 錯誤不當作應用錯誤；應用無 pageerror/console error 的證據以隔離 E2E 流程為準。

## PR 交付
實作已推送 [draft PR #10](https://github.com/Adamguo88/finance_game/pull/10)，包含 PR #9 設計。V1 model 與 main 逐字相同、V1 engine 除 model import 路徑外逐字相同，已再次實際比對。工作成果未合併或部署。審查先核對本契約與利息取整/停租順序，再用原始備份操作取消、確認、保存與還原，最後進行真人驗收；#6 與 #7 保持開啟。

## 限制與後續
- #6 真人驗收仍開啟，本輪不自動合併、不關閉 #7。獨立 Code review、Safari/Firefox、讀屏與正式使用者測試尚未執行。
- 升級只接受 schema=1 全專案；schema=2 混合專案可讀寫/比較，不支援再次升級或降版；回復靠原始 V1 備份。初始範例仍沿用 V1，需明確升級後使用新功能。
- 第一付款月前不累息是明示簡化；沒有新借款、提前還款、違約、稅費、通膨、投資、保險或房產出售。
- 事件庫擴張、多軌拖曳與 PixiJS/動畫未納入本輪，沿用原討論後續順序。

---

# Issue #7：v0.2 設計提案（2026-11-25，Asia/Taipei）

基準 main 2acea22。依使用者「繼續」指示先準備設計，不將 #6 真人驗收視為完成，也不在本輪啟用 v0.2 財務功能。

## 本輪變更
- 新增 docs/V02_FINANCIAL_CONTRACT.md：生活費/租金拆分、購屋停止租金 opt-in、既有負債分配與排程、rentChange/incomeChange、月度順序、快照語意、分支歷史、schema=2 / engine=2.0.0 目標與顯式遷移。
- 新增 docs/fixtures/v02-financial-contract.json：8 組設計預期值，金額單位為分，明標 proposed-not-implemented。
- 更新 ROADMAP 的設計進度。生產程式、現用 schemaVersion=1 / engineVersion=1.0.0 未改。

## 實際執行
- Python 標準庫 json 解析 fixtures，Decimal + ROUND_HALF_UP 獨立參考計算：8 組、78 個預期欄位全相符。例：12 萬本金/12%/12 期，月付 10,661.85 元、首期利息 1,200 元、末期 10,661.91 元。此檢查只核對提案數值，**不是 V2 引擎測試**。
- `npm ci --cache /tmp/life-studio-npm-cache`：通過，67 packages。
- `npm test`：19/19 通過（現有 V1 引擎）。
- `npm run typecheck`、`npm run build`：通過，靜態輸出。
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`：9/9 通過（14.5 秒），既有靜態 HTTP server 提供本輪 out/。
- `git diff --check`：通過。

## 待完成
設計待審；V2 strict schema、版本路由、遷移、引擎與 UI/E2E 實作尚未進行。#6 真人操作清單仍開啟，#7 不結案；本設計分支開 draft PR 供審查，不自動合併。轉換前備份、延後付款不累息、同月租金事件優先等產品語意已寫明供審查，不能宣稱已上線。

---

# PR #8 合併前審查（2026-11-25，Asia/Taipei）

審查基準：d294e776f3af6899d7e9de05254375ba4fd8b519。GitHub PR #8 為 open/mergeable，無 review submissions，沒有冒稱取得獨立審核者核准。GitHub Actions [run 45540307064](https://github.com/Adamguo88/finance_game/actions/runs/45540307064) completed/success。

## 本輪代理實際 UI 操作（共享 Chrome、靜態 out/）
- 第 12 月：現金 1,040,000 元、淨資產 1,240,000 元。
- 更新現金 300 萬、收入支出零；第 1 月零利率購屋：現金 977,777.78 元、資產 10,200,000 元、負債 7,977,777.78 元、淨資產 3,200,000 元、付款 22,222.22 元。
- 改為 2.5%：首期 31,609.67 元、利息 16,666.67 元。第 360 月負債零、末期付款 31,610.66 元；第 361 月付款與利息皆零，切換體驗模式仍為第 361 月。末期按剩餘本息調整，符合 ARCHITECTURE.md。
- 失業第 2、3 月替代收入 1 萬，第 4 月恢復 5 萬；工作場景同步。
- 第 6 月建立分支：初始資料與已發生事件的編輯/刪除控制 disabled；加入第 13 月失業，兩方案第 6 月數字一致，第 13 月才分歧。12× 播放時兩方案月份一致，負現金顯示缺口。
- 儲存成功 → 重新整理 → 讀取成功，恢復兩方案、購屋與失業事件。實際下載 JSON，再由檔案選擇器匯入成功；還原後第 13 月分歧仍正確。
- 已檢視比較畫面、鍵盤焦點與場景。手機 390px、錯誤匯入、容量失敗、最短終點停止依本 PR 既有 E2E 與成功 CI 證據；本輪沒有冒稱再次手動執行這些項目。
- 共享瀏覽器工具有 Statsig 網路錯誤，瀏覽器 extension metadata console 錯誤來源為 chrome-extension://；與應用程式錯誤分開。應用無 console/pageerror 的證據以隔離 E2E 成功結果為準。

## 逐項處置
#1–#5 的規格、數值與使用者行為驗收已有測試、CI 及上述代理 UI 證據，PR 合併後可逐項記錄結案。#6 的「人工完成 PRD 驗收」仍保留給真人使用者：代理操作不替代真人驗收，因此 #6 保持開啟，v0.1 尚未宣告發布完成。Safari/Firefox、讀屏及正式使用者可用性評估仍未執行。#7 依賴 v0.1 驗收，不在本輪實作。

# GitHub 交付更新（2026-11-25，Asia/Taipei）

使用者更新 GitHub App 倉庫授權後，已確認 Adamguo88/finance_game 列入授權清單且 push=true。`git push -u origin codex/acceptance-issues-1-6` 成功，包含 5cf56a2 與 3bef203 的開發與驗收成果。下方各輪 403 記錄為當時的歷史狀態，已解除；遠端 CI 與人工發布審查仍須分別確認。未自動合併或關閉 issues。

---

# 規格逐項開發續作（2026-11-25，Asia/Taipei）

延續本地提交 5cf56a2，依 v0.1 的 S3 → S4 → S5 補完顯示與驗證缺口。沒有新增 v0.2 事件或變更財務公式、engineVersion。

## 實作
- 所有財務金額最多顯示兩位小數，保留分的精度；整數金額維持簡潔。零利率購屋算例畫面現在顯示付款 22,222.22 元、現金 977,777.78 元、房貸 7,977,777.78 元。
- 單人生與比較卡新增「其他／房屋資產」，直接消費 Snapshot.assets，與可動用現金分列。

## 新增行為驗證
- 透過表單設定 PRD 零利率購屋算例，核對現金、資產、房貸、淨資產與本息；刪除事件後回復基準與租屋場景。
- 畸形 JSON、循環分支、重複方案 ID、超過 2 MB 的檔案匯入失敗後，原月份、財務數字與先前 IndexedDB 存檔維持不變。
- 以瀏覽器測試注入 QuotaExceededError，確認錯誤訊息、保留工作、解除 busy 狀態；直接寫入損壞的 IndexedDB 資料，載入拒絕且不取代現況。
- 失業第 2–3 月收入 1 萬、第 4 月回復 5 萬；回溯與重播場景一致。修改期間後立刻重算；下載 JSON 確認 revision 與修改前/後的完整事件參數。

## 本次實際命令
- `npm ci --cache /tmp/life-studio-npm-cache`：成功，67 packages。
- `npm test`：19/19 通過。
- `npm run typecheck`、`npm run build`：通過，純靜態輸出。
- 靜態 out/ 由既有獨立 HTTP server（3100）提供。`PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`：9/9 通過（15.6 秒）。
- `git diff --check`：通過。

## 仍待審查
完整人工 PRD 逐步操作、Safari/Firefox、讀屏審查未執行。GitHub 403 的既有交付阻礙仍未解除，本輪未再次嘗試推送、未建立 PR、未關閉 issues；本地成果不等同發布完成。

---

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
