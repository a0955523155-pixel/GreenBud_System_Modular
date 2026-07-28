// js/main.js

// 您的專屬 GAS 部署網址
const GAS_URL = "https://script.google.com/macros/s/AKfycbz8MVcuqeYMtbdJVPDIk6cTwiDKuMgGZCR5ju0hPcxdrq1ucDh_y5Sy1Qltm_nmcEV9/exec";

// 輔助函數：將檔案轉換為 Base64 格式以利上傳至 Google 雲端
const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            // 移除前綴 (例如: data:image/png;base64,) 只保留編碼
            const base64String = reader.result.split(',')[1];
            resolve({ name: file.name, mimeType: file.type, data: base64String });
        };
        reader.onerror = error => reject(error);
    });
};

// 將 app 物件掛載到 window，讓 HTML 的 onclick 可以呼叫
window.app = {
    // 儲存案件至 Google 試算表
    saveCase: async function(event) {
        event.preventDefault();
        
        // 顯示載入中動畫
        document.getElementById('loading').classList.remove('hidden');

        try {
            // 1. 收集表單文字資料
            const formData = {
                action: document.getElementById('editId').value ? 'edit' : 'add',
                id: document.getElementById('editId').value || Date.now().toString(),
                date: document.getElementById('c_date').value,
                region: document.getElementById('c_region').value,
                name: document.getElementById('c_name').value,
                cadastral: document.getElementById('c_cadastral').value,
                zoning: document.getElementById('c_zoning').value,
                status: document.getElementById('c_status').value,
                address: document.getElementById('c_address').value,
                landArea: document.getElementById('c_landArea').value,
                buildArea: document.getElementById('c_buildArea').value,
                unitPrice: document.getElementById('c_unitPrice').value,
                width: document.getElementById('c_width').value,
                depth: document.getElementById('c_depth').value,
                totalPrice: document.getElementById('c_totalPrice').value,
                buildLicense: document.getElementById('c_buildLicense').value, // 建照號碼
                useLicense: document.getElementById('c_useLicense').value,     // 使照號碼
                agent: document.getElementById('c_agent').value,
                notes: document.getElementById('c_notes').value,
                photos: [],
                pdfs: []
            };

            // 2. 處理照片上傳 (轉為 Base64)
            const photoInput = document.getElementById('c_photos');
            if (photoInput.files.length > 0) {
                for (let i = 0; i < photoInput.files.length; i++) {
                    const fileData = await fileToBase64(photoInput.files[i]);
                    formData.photos.push(fileData);
                }
            }

            // 3. 處理 PDF 上傳 (轉為 Base64)
            const pdfInput = document.getElementById('c_pdfs');
            if (pdfInput.files.length > 0) {
                for (let i = 0; i < pdfInput.files.length; i++) {
                    const fileData = await fileToBase64(pdfInput.files[i]);
                    formData.pdfs.push(fileData);
                }
            }

            // 4. 使用 fetch 傳送資料至 GAS
            const response = await fetch(GAS_URL, {
                method: 'POST',
                body: JSON.stringify(formData)
            });
            
            const result = await response.json();
            
            if (result.status === 'success') {
                alert('資料已成功同步至雲端資料庫！');
                this.cancelEdit(); // 清空表單
                // 未來可在此呼叫 loadCases() 重新從雲端抓取列表
            } else {
                alert('儲存失敗：' + (result.message || '未知錯誤'));
            }

        } catch (error) {
            console.error('API 錯誤:', error);
            alert('連線至 Google 雲端發生錯誤，請檢查網路狀態。');
        } finally {
            // 隱藏載入中動畫
            document.getElementById('loading').classList.add('hidden');
        }
    },

    // 取消編輯並重置表單
    cancelEdit: function() {
        document.getElementById('caseForm').reset();
        document.getElementById('editId').value = '';
        document.getElementById('formTitle').innerText = '新增案件';
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.innerText = '新增案件資料';
        submitBtn.className = 'w-full bg-blue-600 text-white font-bold py-3 rounded hover:bg-blue-700';
        document.getElementById('cancelEditBtn').classList.add('hidden');
    },

    // 前端搜尋過濾功能
    handleSearch: function() {
        const keyword = document.getElementById('searchInput').value.toLowerCase();
        // 實際的 DOM 過濾邏輯會寫在這裡
        console.log('搜尋關鍵字:', keyword);
    },

    // 匯出全部資料為 Excel (整合 SheetJS)
    exportToExcel: function() {
        alert('匯出 Excel 功能準備中，將串接雲端資料。');
    },

    // 匯出全部資料為 PDF (整合 html2pdf)
    exportToPDF: function() {
        alert('匯出 PDF 功能準備中，將串接雲端資料。');
    }
};

// 頁面載入時可以呼叫一次讀取資料庫
document.addEventListener('DOMContentLoaded', () => {
    console.log('綠芽團隊模組化系統啟動，準備連線至 GAS...');
});