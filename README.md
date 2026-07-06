# jimny-db

`jimny-db` 是一個用來整理 Suzuki Jimny 車輛資料、保養紀錄、油品規格、螺絲扭力、故障排除與 OBD 故障碼的資料專案。

## 專案架構

```text
jimny-db/
├── data/       # 結構化 JSON 資料
├── docs/       # 人類可閱讀的 Markdown 文件
├── images/     # 車輛照片、零件照片、維修圖片
├── app/        # 未來可放查詢介面或應用程式
├── scripts/    # 未來可放資料轉換、檢查或匯入腳本
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

## 注意事項

本專案中的資料是範例資料，實際維修與扭力值請以車主手冊、維修手冊或合格技師建議為準。
