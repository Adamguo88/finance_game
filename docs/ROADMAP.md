# Life Studio 短、中、長期開發路線

更新：2026-11-26（Asia/Taipei）。規劃基準 main `7a2519c`；來源為[最初產品討論](chatgpt-conversation://6b063fbc-f5d0-83e8-b687-2758ae736e2a)、後續使用者的PC優先指示及現有交付證據。本頁維護產品方向、先後及完成閘門；[NEXT_PHASE.md](NEXT_PHASE.md) 維護執行佇列，[PC_SCOPE.md](PC_SCOPE.md) 維護需求責任與驗收，GitHub issues 維護即時任務狀態，[VALIDATION.md](VALIDATION.md)／合併PR記錄真實證據。

## 共同目標與既有基準

使用者自行安排人生事件，體驗財務後果，再建立與比較不同人生；不以資產排名定義成功。PC的全部納入功能、UI／UX與角色／場景建模驗收後，才啟動iPad／手機。現階段維持純前端、2D向量構成2.5D、非隨機事件與本機資料／JSON備份，保留既有響應式及手機回歸。

#1–#5、#7、#15–#22、#28／#29已交付底座：月度運算、三模式、分支隔離、存檔、四類事件、時間軸、Pixi／SVG、有限動畫／音效、缺口分支、回顧、初始化明細與角色。#28／#29的結案只代表其交付範圍；多筆明細仍加總進現有引擎，角色熟齡外觀不等於退休運算，事件紀錄不等於完整故事書。擴充另有責任issue，不重建或重開已完成任務。

## 短期：分項財務底座與可執行契約

按以下順序交付，完成前不先做#23報表。

| 次序 | Issue | 交付與閘門 |
|---|---|---|
| S1 | [#27](https://github.com/Adamguo88/finance_game/issues/27) | 已由PR #57交付：原始需求／完整PC事件清單、納入理由、數值／期間／同月順序／關聯契約；不代表新事件已實作 |
| S2／已交付 | [#42](https://github.com/Adamguo88/finance_game/issues/42) | 收入、支出、資產、負債的穩定ID與生命週期，事件目標／排程映射，版本／遷移設計及數值例 |
| S3／已交付 | [#43](https://github.com/Adamguo88/finance_game/issues/43) | 分項引擎、可追溯快照、新版本與顯式遷移，保留舊版本結果、明細／造型／history／分支 |
| S4／進行中 | [#44](https://github.com/Adamguo88/finance_game/issues/44) | 既有購屋／失業／租金／薪資事件適配指定項目，完成設定→預覽→套用→分支→備份還原 |

短期完成必須證明：薪資5萬＋兼職1萬能只中斷指定來源；調薪只影響目標；兩筆負債按對應排程還款；現金、租金、生活費與本金不重複計算。原有V1/V2與schema1–4按原語意重播，新公式不假裝與舊公式相同。新型別、引擎／schema編號、期間與遷移規則由#42契約及#43落定，本輪不引入新API或公式。

## 中期：完整PC人生財務沙盒

短期完成後，依M1→M12推進。下列為功能群追蹤，每群先落定契約再拆去重的子實作issues；文件、卡牌張數、素材數量或建立子issues都不能代替實作驗收。

| 批次 | Issue | 目標 |
|---|---|---|
| M1 | [#45](https://github.com/Adamguo88/finance_game/issues/45) | 家庭／生養／教育：一次與持續費用、成員與期間 |
| M2 | [#46](https://github.com/Adamguo88/finance_game/issues/46) | 交通、持有成本、資產處分、對應負債與必要清償規則 |
| M3 | [#47](https://github.com/Adamguo88/finance_game/issues/47) | 可設定退休時間、退休收入與生活預算，不依年齡自動退休 |
| M4 | [#48](https://github.com/Adamguo88/finance_game/issues/48) | 使用者安排醫療／意外、保費與保障／理賠條件 |
| M5 | [#49](https://github.com/Adamguo88/finance_game/issues/49) | 投資、通膨、利率及價格等明確假設，不接行情或隨機市場 |
| M6 | [#50](https://github.com/Adamguo88/finance_game/issues/50) | 真正可執行的危機應對：調整未來支出、延後計畫、出售及契約納入的資金來源 |
| M7 | [#51](https://github.com/Adamguo88/finance_game/issues/51) | 事件停頓／卡牌／場景／資金轉換演出；家庭、交通、教育、醫療等互動區域；拖入新卡與週期／長約時間軸 |
| M8 | [#52](https://github.com/Adamguo88/finance_game/issues/52) | 分支樹、修改過去時的原方案／新分支選擇、長期走勢與差異解釋 |
| M9 | [#53](https://github.com/Adamguo88/finance_game/issues/53) | 自訂目標／成就，以及有明確定義的現金支撐、退休／保障等指標 |
| M10 | [#54](https://github.com/Adamguo88/finance_game/issues/54) | 圖像化故事書、事件章節、目標成果與財務回顧，不推測未設定的人生經歷 |
| M11 | [#55](https://github.com/Adamguo88/finance_game/issues/55) | 多專案本機存檔槽、另存／覆寫／刪除與容量、草稿保護 |
| M12 | [#23](https://github.com/Adamguo88/finance_game/issues/23) | 同版本快照衍生的CSV、列印與比較摘要，明示單位、假設及模型限制 |

每個新增事件均交付數值例、邊界／關聯驗證、表單、預覽、場景、時間軸、回顧及分支／保存測試。原討論「約12種事件」是盤點線索，不以湊數當完整；精確清單由#27落定，已納入PC的責任不可悄悄推到長期。

中期完成閘門為[#24](https://github.com/Adamguo88/finance_game/issues/24)，包含[#6](https://github.com/Adamguo88/finance_game/issues/6)真人清單及所有已納入子實作。按PC_SCOPE的桌面尺寸、瀏覽器、鍵鼠、合法上限資料、視覺品質與實機效能驗收；自動化、代理檢視、真人與硬體結果分列。所有主要流程走通並核對最終CI／Pages，才可宣告PC完成。

## 長期：PC完成後的裝置與產品擴充

1. #24完成後才啟動[#25](https://github.com/Adamguo88/finance_game/issues/25)：iPad／手機版面、觸控、效能、相容性與各裝置驗收，財務與備份語意保留。
2. 其後才評估真正3D、跨裝置同步／顧問共享與AI輔助。這些只有待決策方向，須另訂用途、範圍、資料／架構與驗收後才建立實作任務；不屬於目前PC或#25的自動執行範圍。

## 持續執行與變更規則

- 短／中／長期以交付閘門劃分，未完成估算前不承諾日期；#27／#42盤點後補各批工作量與風險。
- 每次開發先讀本頁、NEXT_PHASE與PC_SCOPE，回讀GitHub狀態及前置；只執行依賴已完成、契約完備的任務。範圍與已確認使用者方向衝突時先釐清，不能用舊簡化規格排除中期承諾。
- 每項可審查PR交付，更新數值／流程證據、核對最新head CI；依既有授權通過後合併並另查main CI／Pages。未完成或未測項保留，驗收規則見[CI.md](CI.md)。
- docs記產品方向／契約／依賴，issues記即時工作狀態與子任務，PR／VALIDATION記證據。三者變更需同步；依需求完成度而非closed比例衡量進度。
- 已依後續開發指令啟動#27；[PC事件契約](PC_EVENT_CONTRACT.md)定義C01–C21、來源與參考算例，合併後依序執行#42及後續任務。契約不是新功能完成證據。

#43已由PR #59–#67交付；main `8207fbc` 的CI 45957655449及Pages 45957655517均success。#44接指定項目四事件表單／預覽，再完成初始分項表單與關聯修改；即時進度見NEXT_PHASE及issue。
