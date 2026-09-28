# 路痴卡皮

一隻沒有方向感的卡皮巴拉，依照你每月填寫的偏好、當下時間、天氣與歷史回饋，推薦附近真實存在的地點。

分成 **食、衣、住、行、育、樂** 六類，每類最多 5 筆；沒有合適的就回空清單，不硬推。卡皮只負責推薦與報距離，**不帶路**，導航交給地圖 App。

## 架構

| 層 | 用什麼 |
|---|---|
| 前端 | 單一 `index.html`，部署在 GitHub Pages |
| 後端 | Google Apps Script 網頁應用程式（`gas/`） |
| 資料庫 | Google Sheet（Prefs／Feedback／Cache／Log 四個分頁） |
| 天氣 | Open-Meteo |
| 地點 | OpenStreetMap Overpass |
| 推薦與文案 | Google Gemini |

所有金鑰都放在 Apps Script 的 Script Properties，**不會進入這個 repo**。

## 檔案結構

```
index.html              前端（含樣式、腳本、內嵌角色圖）
gas/
  appsscript.json       Apps Script 設定（時區、網頁應用程式權限）
  Main.js               doPost 入口、token 驗證、動作分派
  Config.js             讀取 Script Properties
  Sheet.js              Google Sheet 讀寫與快取
  Weather.js            Open-Meteo 天氣查詢
  Places.js             Overpass 查詢、候選地點整理
  Categorize.js         OSM 標籤 → 六大分類的對應表
  Distance.js           haversine 距離、步行分鐘換算
  Time.js               時段判斷
  Validate.js           允許依據白名單、AI 輸出的程式端驗證
  Gemini.js             prompt 組裝、JSON Schema、Gemini 呼叫
test/                   可用 node 直接執行的單元測試
```

---

## 首次部署

### 1. 建立 Google Sheet

開一個空白 Google Sheet，從網址列複製 ID：

```
https://docs.google.com/spreadsheets/d/<這一段就是 SHEET_ID>/edit
```

分頁不用手動建立，程式第一次寫入時會自動建好並補上標題列。

### 2. 建立 Apps Script 專案

到 [script.google.com](https://script.google.com) → 新增專案，然後把 `gas/` 裡的每個 `.js` 檔案建立成同名的指令碼檔案（檔名不用加副檔名），把內容整份貼上。

`appsscript.json` 需要先在「專案設定」勾選 **Show "appsscript.json" manifest file in editor** 才會出現在編輯器裡，再把內容換成 `gas/appsscript.json`。

> 多個檔案共用同一個全域作用域，不需要 import；但也因此**不要讓兩個檔案出現同名函式**，否則會互相覆蓋。

### 3. 申請 Gemini API Key

到 [aistudio.google.com/apikey](https://aistudio.google.com/apikey) 建立 API key（免費，不需綁信用卡）。

### 4. 設定 Script Properties

「專案設定」→ 指令碼屬性，新增這三筆：

| 屬性名稱 | 內容 |
|---|---|
| `GEMINI_API_KEY` | 上一步申請的 Gemini API key |
| `APP_TOKEN` | 自己取一組通關碼，建議 12～20 碼英數字 |
| `SHEET_ID` | 第 1 步複製的 Google Sheet ID |

### 5. 授權對外連線

Apps Script 預設沒有對外發送網路請求的權限，必須手動觸發一次授權：

1. 在任一檔案最下方暫時加上：
   ```js
   function testAuth() {
     UrlFetchApp.fetch('https://api.open-meteo.com/v1/forecast?latitude=25&longitude=121&current=temperature_2m');
   }
   ```
2. 存檔，在上方函式下拉選單選 `testAuth`，按 **Run**
3. 跳出 Authorization required → Review permissions → 選自己的帳號 → Advanced → Go to (專案名稱) (unsafe) → Allow
4. 授權完成後可以把 `testAuth` 刪掉

沒做這步的話，天氣與地點查詢會失敗並回報缺少 `script.external_request` 權限。

### 6. 部署為網頁應用程式

右上角 **Deploy** → **New deployment** → 齒輪選 **Web app**：

- Execute as：**Me**
- Who has access：**Anyone**

部署後複製產生的 `/exec` 網址。

> 驗證靠的是 `APP_TOKEN`，不是 Google 帳號，所以存取權必須設成 Anyone，前端才能從 GitHub Pages 呼叫。

### 7. 填入前端並上線

把上一步的網址填進 `index.html` 最上方：

```js
const CONFIG = { API_URL: "https://script.google.com/macros/s/.../exec", TOKEN: "" };
```

commit 後推上 GitHub，再到 repo 的 **Settings → Pages**，Source 選 `Deploy from a branch`、分支 `main`、資料夾 `/ (root)`。

---

## 使用方式

| 網址 | 用途 |
|---|---|
| `https://<帳號>.github.io/lost-capybara/` | 開場的模式選擇畫面 |
| `?k=<通關碼>` | 直接帶入通關碼，存好後會自動把參數從網址清掉；適合加到手機主畫面 |
| `?demo=1` | 展示模式：使用內建示範資料，不呼叫後端、不消耗額度、不要求定位權限 |

通關碼輸入一次後會存在該瀏覽器，之後不再詢問。換裝置、清除瀏覽器資料，或 `APP_TOKEN` 變更時會重新詢問。

App 內左上角有可收合的懸浮拉片，隨時可以在兩種模式之間切換。

---

## 更新程式碼

### 後端（Apps Script）

**存檔不等於上線。** 網頁應用程式的部署是版本快照，改完程式碼一定要發布新版本：

1. 在編輯器修改並存檔
2. **Deploy** → **Manage deployments**
3. 找到 Type 是 **Web app** 的那一筆，點右邊的鉛筆圖示
4. Version 下拉選 **New version**
5. **Deploy**

網址不會變，但會指向最新的程式碼。

> 如果專案裡同時存在 Library 類型的部署，務必確認編輯的是 **Web app** 那一筆，否則改再多次都不會生效。

### 前端

修改 `index.html` 後 commit 並 push，GitHub Pages 會自動重新建置，約一兩分鐘生效。

### 測試

純邏輯的部分都有單元測試，不需要任何套件：

```bash
for f in test/*.test.js; do node "$f"; done
```

涵蓋距離計算、OSM 分類、候選裁切、伺服器排序、時段判斷、回饋歸納、依據白名單、AI 輸出驗證與回應解析。

---

## 可調整的參數

| 位置 | 常數 | 預設 | 說明 |
|---|---|---|---|
| `Validate.js` | `SCORE_THRESHOLD_` | `0.6` | 低於這個信心分數的推薦會被丟掉 |
| `Main.js` | `handleRecommend_` 裡的半徑 | `1200` | 搜尋範圍（公尺） |
| `Places.js` | `OVERPASS_ENDPOINTS_` | 三台 | 依序嘗試，會記住上次成功的優先使用 |
| `Places.js` | `trimNearest_` 的 `perCat` | `30` | 每類快取幾筆候選 |
| `Gemini.js` | `GEMINI_MODELS_` | 三個 | 依序嘗試，遇到過載自動換下一個 |
| `Categorize.js` | `OSM_RULES_` | 44 條 | OSM 標籤 → 六大分類，同時決定 Overpass 查詢範圍 |

`OSM_RULES_` 是單一真相來源：新增一種地點類型時只要加一條規則，Overpass 查詢會自動跟著更新。

---

## 疑難排解

查問題的第一站永遠是 Google Sheet 的 **Log 分頁**，裡面有每次推薦的輸入摘要與結果（或錯誤訊息）。

| 症狀 | 可能原因 |
|---|---|
| 改了程式碼卻沒有任何變化 | 沒有發布 New version，或編輯到 Library 類型的部署 |
| 回報缺少 `script.external_request` 權限 | 沒做「授權對外連線」那一步 |
| 六類全空、Log 沒有新增任何一列 | 沒跑到 AI 那步，通常是 Overpass 查詢失敗 |
| Log 出現 `Overpass 全部失敗` | 三台伺服器都不可用，訊息會標明各自的失敗原因 |
| Log 出現 `high demand` | Gemini 模型過載，備援模型也忙碌；稍後再試 |
| 出現「通關碼不對喔」 | `APP_TOKEN` 被改過，或前端存的是舊通關碼 |
| 手機上容易連不到 | 請求太久被中斷；同一區域 12 小時內會讀快取而變快 |

> Apps Script 不允許自訂 `User-Agent`，因此 Overpass 端的封鎖無法靠標頭繞過，只能靠多台伺服器輪替。

---

## 授權

個人專案，僅供自用與課程展示。
