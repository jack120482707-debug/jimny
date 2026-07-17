# jimny-db

`jimny-db` 是一個用來整理 Suzuki Jimny 車輛資料、保養紀錄、油品規格、螺絲扭力、故障排除與 OBD 故障碼的資料專案。

## 專案架構

```text
jimny-db/
├── data/       # 結構化 JSON 資料
├── docs/       # 人類可閱讀的 Markdown 文件
├── images/     # 車輛照片、零件照片、維修圖片
├── app/        # Jimny DB 查詢 App
├── scripts/    # 啟動或維護腳本
├── README.md   # 專案說明
└── .gitignore  # Git 忽略設定
```

## data 目錄

- `vehicle.json`：車輛基本資料、規格、輪胎、電瓶與常用零件。
- `maintenance.json`：保養週期、歷史紀錄、待辦事項與檢查清單。
- `fluids.json`：引擎油、變速箱油、差速器油、冷卻液、煞車油等規格。
- `torque.json`：輪胎、底盤、煞車、引擎與傳動系統常用鎖付扭力。
- `troubleshooting.json`：常見症狀、可能原因、檢查步驟與處理方式。
- `obd_codes.json`：常見 OBD-II 故障碼、意義、症狀、診斷與處理建議。

## docs 目錄

- `保養紀錄.md`：保養紀錄與待辦清單。
- `油品規格.md`：油品規格、人員維護備註與更換週期。
- `故障排除.md`：故障症狀、診斷流程與處理紀錄。
- `改裝紀錄.md`：改裝項目、零件、安裝日期與後續觀察。

## 使用方式

1. 將車輛實際資料填入 `data/vehicle.json`。
2. 每次保養後更新 `data/maintenance.json` 與 `docs/保養紀錄.md`。
3. 新增油品或零件規格時，同步更新 `data/fluids.json` 與 `docs/油品規格.md`。
4. 遇到故障時，先查 `data/troubleshooting.json` 與 `data/obd_codes.json`。
5. 改裝後記錄在 `docs/改裝紀錄.md`，並可把照片放入 `images/`。

## 啟動 App

在 PowerShell 執行：

```powershell
.\scripts\start-app.ps1
```

然後用瀏覽器開啟：

```text
http://localhost:8000/app/
```

App 會讀取 `data/` 裡的 JSON，提供總覽、保養、油品、扭力、故障排除與 OBD 代碼查詢。

### 手機輸入保養紀錄

在 App 的 `保養` 頁面可以直接新增保養紀錄。手機新增的資料會存在該手機瀏覽器的本機儲存空間，並會出現在保養紀錄列表中。

注意：GitHub Pages 是靜態網站，手機輸入的資料不會自動寫回 GitHub。需要備份時，請使用 `匯出手機紀錄` 下載 JSON。

### 維修手冊搜尋

`docs/manual.pdf` 是本機參考檔，不會提交到 GitHub。App 會使用 `data/manual_index.json` 顯示可搜尋的手冊文字內容，因此手機上可以查詢頁碼、關鍵字與文字內容；需要看完整 PDF 時，會開啟 Suzuki 原廠公開 PDF 連結。

### AI 問答準備

App 的 `AI 問答` 頁面可以輸入問題，系統會先判斷問題類型，再搜尋維修手冊索引，擷取相關片段，最後產生可貼到 Gemini 或 ChatGPT 的 Prompt。此版本不會直接呼叫 AI API，也不需要 API key。

### iPhone 加入主畫面

1. 用 iPhone 的 Safari 開啟 GitHub Pages App 網址。
2. 點 Safari 下方的分享按鈕。
3. 選擇 `加入主畫面`。
4. 名稱可使用 `Jimny DB`。
5. 按 `加入`。

加入後，iPhone 主畫面會出現 Jimny DB icon，開啟時會像 App 一樣顯示。

如果 PowerShell 阻擋腳本執行，可以改用：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-app.ps1
```

## 注意事項

本專案中的資料是範例資料，實際維修與扭力值請以車主手冊、維修手冊或合格技師建議為準。
