# 綠芽團隊 - 不動產案件管理系統 (模組化版)

阿孫你好！這是為你打包好的本機電腦專用模組化專案原始碼。

## 專案結構
整個應用程式已使用 ES6 Modules 架構進行拆分，方便你後續擴充功能或串接你熟悉的 MongoDB / Firebase 後端：

- `index.html` : 系統進入點與版面結構
- `css/style.css` : 自訂樣式表
- `js/main.js` : 核心控制器，負責綁定全域事件供 HTML 呼叫
- `js/modules/store.js` : 負責案件資料的狀態管理 (CRUD)
- `js/modules/ui.js` : 負責搜尋過濾與畫面渲染
- `js/modules/export.js` : 負責處理 Excel 與 PDF 的匯出邏輯
- `js/modules/fileHandler.js` : 獨立處理照片與 PDF 檔案的 Base64 轉換

## 執行方式說明 ⚠️
因為系統使用了原生的 ES6 模組匯入 (`import / export`)，直接在電腦上雙擊打開 `index.html` 會被瀏覽器的跨網域安全性政策 (CORS) 阻擋。

請在你的程式編輯器（例如 VS Code）中，使用 **Live Server** 擴充功能來啟動，或者使用 Python 內建的伺服器：
```bash
python -m http.server 8000
```
接著在瀏覽器打開 `http://localhost:8000` 即可正常測試與修改！
