// js/main.js

// 您的專屬 GAS API 網址 (請確認這是最新部署的網址)
const GAS_URL = "https://script.google.com/macros/s/AKfycbz8MVcuqeYMtbdJVPDIk6cTwiDKuMgGZCR5ju0hPcxdrq1ucDh_y5Sy1Qltm_nmcEV9/exec";

// 狀態管理：儲存所有案件資料
let casesData = [];

// 工具函數：將檔案轉為 Base64 格式，讓 GAS 能夠接收與還原
const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve({ name: file.name, type: file.type, data: reader.result });
        reader.onerror = error => reject(error);
    });
};

// 將所有功能綁定在 window.app 以供 HTML 呼叫
window.app = {
    // 1. 儲存案件 (包含文字與檔案上傳)
    saveCase: async function(event) {
        event.preventDefault();
        document.getElementById('loading').style.display = 'flex';

        try {
            // 準備要傳送的基礎資料
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
                buildLicense: document.getElementById('c_buildLicense').value,
                useLicense: document.getElementById('c_useLicense').value,
                agent: document.getElementById('c_agent').value,
                notes: document.getElementById('c_notes').value,
                
                // 🌟 關鍵修改：準備三個陣列
                files: [],  // 這個是專門打包給 GAS 雲端上傳用的
                photos: [], // 這個是留給前端網頁即時預覽照片用的
                pdfs: []    // 這個是留給前端網頁即時顯示 PDF 檔名用的
            };

            // 處理照片檔案
            const photoInput = document.getElementById('c_photos');
            for (let file of photoInput.files) {
                const b64 = await fileToBase64(file);
                // 放入給 GAS 的檔案清單
                formData.files.push({ name: file.name, type: file.type, base64: b64.data });
                // 放入前端預覽清單
                formData.photos.push(b64.data); 
            }

            // 處理 PDF 檔案
            const pdfInput = document.getElementById('c_pdfs');
            for (let file of pdfInput.files) {
                const b64 = await fileToBase64(file);
                // 放入給 GAS 的檔案清單
                formData.files.push({ name: file.name, type: file.type, base64: b64.data });
                // 放入前端預覽清單 (暫時給一個 # 連結)
                formData.pdfs.push({ name: file.name, url: "#" }); 
            }

            // 🚀 發送至 GAS 雲端
            const response = await fetch(GAS_URL, {
                method: 'POST',
                body: JSON.stringify(formData)
            });
            const result = await response.json();

            if (result.status === 'success') {
                // 為了讓畫面即時更新，我們直接操作前端陣列
                if (formData.action === 'edit') {
                    const index = casesData.findIndex(c => c.id === formData.id);
                    if (index > -1) casesData[index] = formData;
                } else {
                    casesData.unshift(formData);
                }

                this.cancelEdit();
                this.renderCases();
                alert('資料與檔案已成功同步至雲端！');
            } else {
                alert('儲存失敗：' + result.message);
            }

        } catch (error) {
            console.error(error);
            alert('連線至 Google 雲端發生錯誤，請檢查網路連線。');
        } finally {
            document.getElementById('loading').style.display = 'none';
        }
    },

    // 2. 渲染卡片列表 (包含過濾與排序)
    renderCases: function() {
        const keyword = document.getElementById('searchInput').value.toLowerCase();
        const container = document.getElementById('casesList');
        
        // 過濾與排序
        let filtered = casesData.filter(c => {
            return (c.name || '').toLowerCase().includes(keyword) || 
                   (c.region || '').toLowerCase().includes(keyword) ||
                   (c.address || '').toLowerCase().includes(keyword);
        }).sort((a, b) => (a.region || '').localeCompare(b.region || '', 'zh-TW'));

        document.getElementById('totalCount').innerText = filtered.length;

        if (filtered.length === 0) {
            container.innerHTML = `<div class="col-span-full text-center py-20 text-gray-400"><i class="fas fa-folder-open text-4xl mb-3"></i><p>目前尚無符合的案件</p></div>`;
            return;
        }

        // 產生 HTML 卡片
        container.innerHTML = filtered.map(item => `
            <div class="border border-gray-200 rounded-2xl overflow-hidden hover:shadow-md transition-shadow bg-white flex flex-col">
                ${item.photos && item.photos.length > 0 
                    ? `<div class="h-48 overflow-hidden bg-gray-100 relative"><img src="${item.photos[0]}" class="w-full h-full object-cover"></div>` 
                    : `<div class="h-20 bg-blue-50 flex items-center justify-center"><i class="fas fa-home text-3xl text-blue-200"></i></div>`
                }
                <div class="p-5 flex-grow flex flex-col">
                    <div class="flex justify-between items-start mb-3">
                        <div>
                            <h3 class="text-lg font-bold text-gray-900">${item.name || '-'}</h3>
                            <p class="text-sm text-gray-500 mt-1">${item.region || ''} | ${item.date || ''}</p>
                        </div>
                        <div class="flex gap-1 bg-gray-50 p-1 rounded-lg border border-gray-100">
                            <button onclick='window.app.exportSingleExcel(${JSON.stringify(item).replace(/'/g, "&#39;")})' class="p-1.5 text-green-600 hover:bg-green-100 rounded" title="匯出 Excel"><i class="fas fa-file-excel"></i></button>
                            <button onclick='window.app.exportSinglePDF(${JSON.stringify(item).replace(/'/g, "&#39;")})' class="p-1.5 text-rose-500 hover:bg-rose-100 rounded" title="匯出 PDF"><i class="fas fa-file-pdf"></i></button>
                            <div class="w-px bg-gray-200 mx-1"></div>
                            <button onclick='window.app.editCase(${JSON.stringify(item).replace(/'/g, "&#39;")})' class="p-1.5 text-blue-500 hover:bg-blue-100 rounded" title="編輯"><i class="fas fa-edit"></i></button>
                            <button onclick='window.app.deleteCase("${item.id}")' class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded" title="刪除"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-x-4 gap-y-3 mt-3 text-sm text-gray-600 bg-gray-50/70 p-3 rounded-xl border border-gray-100 flex-grow">
                        <div><span class="text-xs text-gray-400 block">總價</span><span class="font-bold text-red-600">${item.totalPrice ? item.totalPrice + ' 萬' : '-'}</span></div>
                        <div><span class="text-xs text-gray-400 block">單價</span><span>${item.unitPrice || '-'}</span></div>
                        <div><span class="text-xs text-gray-400 block">地坪 / 建坪</span><span>${item.landArea || '-'} / ${item.buildArea || '-'}</span></div>
                        <div><span class="text-xs text-gray-400 block">面寬 / 縱深</span><span>${item.width || '-'} / ${item.depth || '-'}</span></div>
                        <div class="col-span-2"><span class="text-xs text-gray-400 block">建照號碼</span><span class="break-all">${item.buildLicense || '-'}</span></div>
                        <div class="col-span-2"><span class="text-xs text-gray-400 block">使照號碼</span><span class="break-all">${item.useLicense || '-'}</span></div>
                    </div>
                </div>
            </div>
        `).join('');
    },

    // 3. 準備編輯
    editCase: function(item) {
        document.getElementById('editId').value = item.id;
        document.getElementById('c_date').value = item.date || '';
        document.getElementById('c_region').value = item.region || '';
        document.getElementById('c_name').value = item.name || '';
        document.getElementById('c_cadastral').value = item.cadastral || '';
        document.getElementById('c_zoning').value = item.zoning || '';
        document.getElementById('c_status').value = item.status || '';
        document.getElementById('c_address').value = item.address || '';
        document.getElementById('c_landArea').value = item.landArea || '';
        document.getElementById('c_buildArea').value = item.buildArea || '';
        document.getElementById('c_unitPrice').value = item.unitPrice || '';
        document.getElementById('c_width').value = item.width || '';
        document.getElementById('c_depth').value = item.depth || '';
        document.getElementById('c_totalPrice').value = item.totalPrice || '';
        document.getElementById('c_buildLicense').value = item.buildLicense || '';
        document.getElementById('c_useLicense').value = item.useLicense || '';
        document.getElementById('c_agent').value = item.agent || '';
        document.getElementById('c_notes').value = item.notes || '';

        // 切換 UI 為編輯模式
        document.getElementById('formTitle').innerHTML = '<i class="fas fa-edit"></i> 編輯案件資料';
        document.getElementById('formHeader').classList.replace('bg-blue-50/50', 'bg-amber-50');
        document.getElementById('formHeader').classList.replace('border-blue-100', 'border-amber-100');
        document.getElementById('formTitle').classList.replace('text-blue-900', 'text-amber-900');
        
        const btn = document.getElementById('submitBtn');
        btn.innerHTML = '<i class="fas fa-save"></i> 更新案件資料';
        btn.className = 'w-full text-white font-medium py-3 px-4 rounded-xl shadow-sm transition-all bg-amber-500 hover:bg-amber-600';
        document.getElementById('cancelEditBtn').classList.remove('hidden');
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    // 4. 取消編輯
    cancelEdit: function() {
        document.getElementById('caseForm').reset();
        document.getElementById('editId').value = '';
        
        document.getElementById('formTitle').innerHTML = '<i class="fas fa-plus"></i> 新增案件資料';
        document.getElementById('formHeader').classList.replace('bg-amber-50', 'bg-blue-50/50');
        document.getElementById('formHeader').classList.replace('border-amber-100', 'border-blue-100');
        document.getElementById('formTitle').classList.replace('text-amber-900', 'text-blue-900');

        const btn = document.getElementById('submitBtn');
        btn.innerHTML = '<i class="fas fa-save"></i> 儲存並新增至總表';
        btn.className = 'w-full text-white font-medium py-3 px-4 rounded-xl shadow-sm transition-all bg-blue-600 hover:bg-blue-700';
        document.getElementById('cancelEditBtn').classList.add('hidden');
    },

    // 5. 刪除案件
    deleteCase: function(id) {
        if(confirm('確定要刪除這筆案件嗎？')) {
            casesData = casesData.filter(c => c.id !== id);
            this.renderCases();
            // 實務上這裡也需要發送 delete 請求到 GAS
        }
    },

    // 6. 單一案件匯出 PDF (使用原生的排版技術)
    exportSinglePDF: function(c) {
        let printContent = `
        <html>
        <head>
            <title>${c.name || '案件'} - 詳細資料</title>
            <style>
                body { font-family: 'Microsoft JhengHei', sans-serif; padding: 30px; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; }
                h1 { text-align: center; color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; }
                .info-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 15px; margin-top: 20px; }
                .info-item { background: #f9fafb; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; }
                .info-label { font-size: 12px; color: #6b7280; display: block; margin-bottom: 4px; }
                .info-value { font-size: 16px; font-weight: bold; color: #111827; }
                .full { grid-column: span 6; } .half { grid-column: span 3; } .third { grid-column: span 2; }
                .photos img { width: 100%; height: 200px; object-fit: cover; border-radius: 8px; border: 1px solid #ddd; margin-top: 10px;}
            </style>
        </head>
        <body>
            <h1>不動產案件詳細資料</h1>
            <div style="text-align: right; color:#666; font-size: 12px;">列印日期：${new Date().toLocaleDateString('zh-TW')}</div>
            
            <div class="info-grid">
                <div class="info-item full"><span class="info-label">案名</span><span class="info-value" style="font-size: 20px;">${c.name || '-'}</span></div>
                <div class="info-item third"><span class="info-label">進件日期</span><span class="info-value">${c.date || '-'}</span></div>
                <div class="info-item third"><span class="info-label">區域</span><span class="info-value">${c.region || '-'}</span></div>
                <div class="info-item third"><span class="info-label">專員</span><span class="info-value">${c.agent || '-'}</span></div>
                
                <div class="info-item half"><span class="info-label">門牌號碼</span><span class="info-value">${c.address || '-'}</span></div>
                <div class="info-item half"><span class="info-label">建坪</span><span class="info-value">${c.buildArea ? c.buildArea + ' 坪' : '-'}</span></div>
                <div class="info-item half"><span class="info-label">地籍資料</span><span class="info-value">${c.cadastral || '-'}</span></div>
                <div class="info-item half"><span class="info-label">地坪</span><span class="info-value">${c.landArea ? c.landArea + ' 坪' : '-'}</span></div>
                
                <div class="info-item full"><span class="info-label">建照號碼</span><span class="info-value">${c.buildLicense || '-'}</span></div>
                <div class="info-item full"><span class="info-label">使照號碼</span><span class="info-value">${c.useLicense || '-'}</span></div>
                
                <div class="info-item half"><span class="info-label">總價</span><span class="info-value" style="color: #dc2626;">${c.totalPrice ? c.totalPrice + ' 萬' : '-'}</span></div>
                <div class="info-item half"><span class="info-label">土地單價</span><span class="info-value">${c.unitPrice ? c.unitPrice + ' 萬/坪' : '-'}</span></div>
            </div>
            
            ${c.notes ? `<div style="margin-top:20px; padding:15px; background:#fefce8; border:1px solid #fef08a; border-radius:8px;"><strong>備註：</strong><br>${c.notes}</div>` : ''}
            
            ${c.photos && c.photos.length > 0 ? `
            <div class="photos" style="margin-top:30px;">
                <h3 style="border-bottom: 2px solid #eee; padding-bottom: 5px;">案件照片</h3>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                    ${c.photos.map(p => `<img src="${p}" />`).join('')}
                </div>
            </div>` : ''}
        </body>
        </html>
        `;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        }, 500);
    },

    // 7. 單一案件匯出 Excel (直式排版)
    exportSingleExcel: function(c) {
        const fields = [
            ['欄位', '內容'],
            ['案名', c.name], ['進件日期', c.date], ['區域', c.region], ['門牌號碼', c.address],
            ['地籍資料', c.cadastral], ['分區', c.zoning], ['使用狀況', c.status],
            ['地坪(坪)', c.landArea], ['建坪(坪)', c.buildArea], ['土地面寬(米)', c.width], ['縱深(米)', c.depth],
            ['建照號碼', c.buildLicense], ['使照號碼', c.useLicense],
            ['土地單價', c.unitPrice], ['總價(萬)', c.totalPrice], ['專員', c.agent], ['備註', c.notes]
        ];
        
        let csvContent = '\uFEFF' + fields.map(e => e.map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${c.name || '案件資料'}_詳細資料.csv`;
        link.click();
    },

    exportToExcel: function() { alert('總表 Excel 匯出功能準備中'); },
    exportToPDF: function() { alert('總表 PDF 匯出功能準備中'); }
};

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('系統載入完成，等待新增資料...');
    window.app.renderCases(); // 初始渲染空畫面
});