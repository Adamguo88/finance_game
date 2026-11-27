# V3修改與分支管理（#43）

scenarios-v3提供以完整schema5專案為單位的原子操作；原V1／V2 helpers不改。UI讀取／保存界線見[ITEMIZED_WORKSPACE.md](ITEMIZED_WORKSPACE.md)，原始數值與版本契約見[ITEMIZED_FINANCIAL_CONTRACT.md](ITEMIZED_FINANCIAL_CONTRACT.md)。

## 共通協定

四個入口皆接收完整專案及 `{scenarioId,revision}`，先校驗原工作，再校驗候選的來源／映射、current／history與全期間計算。選中V1／V2時明確拒絕，不偷偷轉換；來源revision不同、未知目標、同月衝突、溢出、容量或關聯不完整都拒絕整個候選。函式回傳新專案，不改傳入資料或DB；UI還須讓使用者另按儲存。

revision是目前人生的樂觀版本檢查；UI若替換整個工作或關閉表單，必須重建預覽／表單，不能把相同ID及counter當成跨工作身份驗證。初始profile的id及version也必須與當前工作相同，版本由manager遞增，不接受表單任意改寫。

## 操作與不變量

- `forkV3Scenario(project,basis,id,name,month)`：複製完整初始項目、負債排程、全部事件及造型，設定parentId／forkMonth、revision=1、history=[]；原人生與其history留在專案。分支點是月末，0可用，90歲終點不可用；最多20人生。新點不得早於來源自身forkMonth，沿用既有危機入口不解鎖來源歷史的規則。要規劃更早月份，先選擇較早來源或原始人生。
- `changeV3State(project,basis,patch)`：在同一候選同時修改profile／事件／造型，用於移除或替換項目後重新指定全部受影響引用。只驗證最終狀態，成功只產生一個revision及前一版history，不保存中間無效或金額重複的狀態；child初始資料及鎖定事件規則仍生效。
- `changeV3Events(project,basis,events)`：子方案<=forkMonth的事件集合及全部payload（含month、sequence、dependsOn）不可改；未來事件亦不可移入鎖定區。有效變更保存完整前一版profile／events／presentation，scenario.revision+1，profile.version保持原值。只改陣列物理順序或完全相同參數不製造history；金融順序仍由既有階段／依賴／sequence決定。
- `changeV3Profile(project,basis,profile,presentation?)`：只允許根人生，子分支初始資料固定；原項目刪除若仍有事件引用，拒絕而非丟掉依賴。有效變更另profile.version+1並保存前一版，appearance缺省時保留原值。純造型變更不改任何財務結果。

父方案日後改profile／事件不向既有子方案傳播，子方案也不會讀取父方案當前金額。JSON保存每條人生自己的完整輸入，來源migration紀錄不被當成正在運算的第二份資產或收入。後續修改保留原V3 baseline於history，codec仍可重驗舊來源與映射；1000筆history或2 MB不足時拒絕，不為騰空間刪除舊版本。

## 本輪畫面與驗證

分項工作室增加命名分支入口、來源分支點說明、上限／更早來源提示。建立後選中來源與新方案比較，保持原月份，標示工作尚未儲存；沒有自動財務改善或寫DB。V3事件／profile的編輯介面仍由#44垂直流程接續，這裡不把domain命令當成已完成表單。

驗證覆蓋資料／排程／造型深拷貝、分支點快照不變、未來修改、父子隔離、完整history與counter、stale及未知來源拒絕、終點／容量、遷移原始紀錄與JSON還原。瀏覽器驗證分支建立、鎖定範圍、原資料／紀錄保留，以及未另存時重新讀取仍為原存檔。實際結果見[VALIDATION.md](VALIDATION.md)。
