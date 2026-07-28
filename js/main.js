// js/main.js

// 請確認這是您最新部署的 GAS 網址
const GAS_URL = "https://script.google.com/macros/s/AKfycbz8MVcuqeYMtbdJVPDIk6cTwiDKuMgGZCR5ju0hPcxdrq1ucDh_y5Sy1Qltm_nmcEV9/exec";

// 全域案件資料與當前編輯的舊照片清單
let casesData = [];
let currentExistingPhotos = [];

// 檔案轉 Base64 工具
const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve({ name: file.name, type: file.type, data: reader.result });
        reader.onerror = error => reject(error);
    });
};

window.app = {
    // 1. 從 Google 雲端載入案件資料 (doGet)
    loadCases: async function() {
        document.getElementById('loading').style.display = 'flex';
        try {
            const response = await fetch(GAS_URL);
            const data = await response.json();
            if (Array.isArray(data)) {
                casesData = data;
                this.renderCases();
            }
        } catch (error) {
            console.error('載入資料失敗:', error);
        } finally {
            document.getElementById('loading').style.display = 'none';
        }
    },

    // 2. 儲存/更新案件 (doPost)
    saveCase: async function(event) {
        event.preventDefault();
        document.getElementById('loading').style.display = 'flex';

        try {
            const editId = document.getElementById('editId').value;
            const formData = {
                action: editId ? 'edit' : 'add',
                id: editId || Date.now().toString(), // 保持原有 ID 或建立新 ID
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
                
                existingFiles: currentExistingPhotos, // 🌟 保留未被刪除的舊照片 URL
                files: []                            // 🌟 新上傳的檔案
            };

            // 處理新上傳的照片
            const photoInput = document.getElementById('c_photos');
            if (photoInput && photoInput.files) {
                for (let file of photoInput.files) {
                    const b64 = await fileToBase64(file);
                    formData.files.push({ name: file.name, type: file.type, base64: b64.data });
                }
            }

            // 處理新上傳的 PDF
            const pdfInput = document.getElementById('c_pdfs');
            if (pdfInput && pdfInput.files) {
                for (let file of pdfInput.files) {
                    const b64 = await fileToBase64(file);
                    formData.files.push({ name: file.name, type: file.type, base64: b64.data });
                }
            }

            // 發送至 GAS 雲端
            const response = await fetch(GAS_URL, {
                method: 'POST',
                body: JSON.stringify(formData)
            });
            const result = await response.json();

            if (result.status === 'success') {
                alert(result.message || '儲存成功！');
                this.cancelEdit();
                await this.loadCases(); // 重新向雲端同步最新列表
            } else {
                alert('儲存失敗：' + result.message);
            }

        } catch (error) {
            console.error(error);
            alert('連線至 Google 雲端發生錯誤。');
        } finally {
            document.getElementById('loading').style.display = 'none';
        }
    },

    // 3. 渲染右側案件卡片列表
    renderCases: function() {
        const keyword = (document.getElementById('searchInput')?.value || '').toLowerCase();
        const container = document.getElementById('casesList');
        
        let filtered = casesData.filter(c => {
            return (c.name || '').toLowerCase().includes(keyword) || 
                   (c.region || '').toLowerCase().includes(keyword) ||
                   (c.address || '').toLowerCase().includes(keyword);
        }).sort((a, b) => (a.region || '').localeCompare(b.region || '', 'zh-TW'));

        const totalCountEl = document.getElementById('totalCount');
        if (totalCountEl) totalCountEl.innerText = filtered.length;

        if (filtered.length === 0) {
            container.innerHTML = `<div class="col-span-full text-center py-20 text-gray-400"><i class="fas fa-folder-open text-4xl mb-3"></i><p>目前尚無符合的案件</p></div>`;
            return;
        }

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
                            <button onclick='window.app.editCase("${item.id}")' class="p-1.5 text-blue-500 hover:bg-blue-100 rounded" title="編輯"><i class="fas fa-edit"></i></button>
                            <button onclick='window.app.deleteCase("${item.id}")' class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded" title="刪除"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-x-4 gap-y-3 mt-3 text-sm text-gray-600 bg-gray-50/70 p-3 rounded-xl border border-gray-100 flex-grow">
                        <div><span class="text-xs text-gray-400 block">總價</span><span class="font-bold text-red-600">${item.totalPrice ? item.totalPrice + ' 萬' : '-'}</span></div>
                        <div><span class="text-xs text-gray-400 block">單價</span><span>${item.unitPrice || '-'}</span></div>
                        <div><span class="text-xs text-gray-400 block">地坪 / 建坪</span><span>${item.landArea || '-'} / ${item.buildArea || '-'}</span></div>
                        <div><span class="text-xs text-gray-400 block">面寬 / 縱深</span><span>${item.width || '-'} / ${item.depth || '-'}</span></div>
                        <div class="col-span-2"><span class="text-xs text-gray-400 block">門牌號碼</span><span class="break-all">${item.address || '-'}</span></div>
                        <div class="col-span-2"><span class="text-xs text-gray-400 block">建照號碼</span><span class="break-all">${item.buildLicense || '-'}</span></div>
                        <div class="col-span-2"><span class="text-xs text-gray-400 block">使照號碼</span><span class="break-all">${item.useLicense || '-'}</span></div>
                    </div>
                </div>
            </div>
        `).join('');
    },

    // 4. 準備編輯案件 (載入文字與舊照片)
    editCase: function(id) {
        const item = casesData.find(c => c.id.toString() === id.toString());
        if (!item) return;

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

        // 🌟 載入舊有的照片/檔案連結，並渲染預覽管理 UI
        currentExistingPhotos = item.photos ? [...item.photos] : [];
        this.renderExistingPhotosUI();

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

    // 🌟 渲染已存在照片管理預覽區 (包含刪除舊照片按鈕)
    renderExistingPhotosUI: function() {
        let container = document.getElementById('existingPhotosContainer');
        if (!container) {
            // 若 HTML 無此容器，動態建立一個
            const photoInput = document.getElementById('c_photos');
            container = document.createElement('div');
            container.id = 'existingPhotosContainer';
            container.className = 'my-2 p-2 border rounded bg-gray-50';
            photoInput.parentNode.insertBefore(container, photoInput);
        }

        if (currentExistingPhotos.length === 0) {
            container.innerHTML = `<p class="text-xs text-gray-400">目前無保留的舊檔案/照片</p>`;
            return;
        }

        container.innerHTML = `
            <p class="text-xs font-semibold text-gray-600 mb-2">已儲存的雲端照片/檔案 (可點擊刪除)：</p>
            <div class="flex flex-wrap gap-2">
                ${currentExistingPhotos.map((url, idx) => `
                    <div class="relative group w-16 h-16 border rounded overflow-hidden bg-white flex items-center justify-center">
                        ${url.match(/\.(jpeg|jpg|gif|png)/i) || url.includes('google.com') 
                            ? `<img src="${url}" class="w-full h-full object-cover">`
                            : `<i class="fas fa-file-pdf text-red-500 text-xl"></i>`
                        }
                        <button type="button" onclick="window.app.removeExistingPhoto(${idx})" class="absolute top-0 right-0 bg-red-600 text-white rounded-bl p-1 text-xs hover:bg-red-700">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
    },

    // 🌟 刪除特定的舊照片
    removeExistingPhoto: function(index) {
        currentExistingPhotos.splice(index, 1);
        this.renderExistingPhotosUI();
    },

    // 5. 取消編輯模式
    cancelEdit: function() {
        document.getElementById('caseForm').reset();
        document.getElementById('editId').value = '';
        currentExistingPhotos = [];
        
        const container = document.getElementById('existingPhotosContainer');
        if (container) container.innerHTML = '';

        document.getElementById('formTitle').innerHTML = '<i class="fas fa-plus"></i> 新增案件資料';
        document.getElementById('formHeader').classList.replace('bg-amber-50', 'bg-blue-50/50');
        document.getElementById('formHeader').classList.replace('border-amber-100', 'border-blue-100');
        document.getElementById('formTitle').classList.replace('text-amber-900', 'text-blue-900');

        const btn = document.getElementById('submitBtn');
        btn.innerHTML = '<i class="fas fa-save"></i> 儲存並新增至總表';
        btn.className = 'w-full text-white font-medium py-3 px-4 rounded-xl shadow-sm transition-all bg-blue-600 hover:bg-blue-700';
        document.getElementById('cancelEditBtn').classList.add('hidden');
    },

    // 6. 刪除案件
    deleteCase: async function(id) {
        if (confirm('警告：確定要刪除這筆案件嗎？')) {
            document.getElementById('loading').style.display = 'flex';
            try {
                const response = await fetch(GAS_URL, {
                    method: 'POST',
                    body: JSON.stringify({ action: 'delete', id: id })
                });
                const res = await response.json();
                alert(res.message || '已刪除');
                await this.loadCases();
            } catch (err) {
                alert('刪除失敗，請檢查網路。');
            } finally {
                document.getElementById('loading').style.display = 'none';
            }
        }
    },

    // 匯出 PDF/Excel 保留功能
    exportSinglePDF: function(c) { /* ...與先前相同的列印邏輯... */ },
    exportSingleExcel: function(c) { /* ...與先前相同的匯出邏輯... */ },
    exportToExcel: function() { alert('總表匯出功能開發中'); },
    exportToPDF: function() { alert('總表匯出功能開發中'); }
};

// 頁面載入完成後，自動連線 Google 雲端讀取案件
document.addEventListener('DOMContentLoaded', () => {
    window.app.loadCases();
});