// 綁定您專屬的 Google Apps Script (GAS) API 網址
const GAS_URL = 'https://script.google.com/macros/s/AKfycbz8MVcuqeYMtbdJVPDIk6cTwiDKuMgGZCR5ju0hPcxdrq1ucDh_y5Sy1Qltm_nmcEV9/exec';

// 系統核心狀態
let casesData = [];
let isEditing = false;
let currentEditId = null;

// DOM 元素快取
const caseForm = document.getElementById('caseForm');
const formContainer = document.getElementById('formContainer');
const formTitle = document.getElementById('formTitle');
const submitBtn = document.getElementById('submitBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const caseList = document.getElementById('caseList');
const searchInput = document.getElementById('searchInput');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText = document.getElementById('loadingText');
const caseCountBadge = document.getElementById('caseCountBadge');

// 初始化：網頁載入時自動向雲端拉取資料
window.onload = () => {
    fetchDataFromCloud();
};

// 顯示/隱藏載入遮罩
function toggleLoading(show, message = '資料雲端同步中...') {
    loadingText.innerText = message;
    if (show) {
        loadingOverlay.classList.remove('hidden');
        loadingOverlay.classList.add('flex');
    } else {
        loadingOverlay.classList.add('hidden');
        loadingOverlay.classList.remove('flex');
    }
}

// 檔案轉 Base64 編碼以利上傳
const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
});

// 表單提交事件 (新增或修改)
caseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    toggleLoading(true, isEditing ? '案件更新中...' : '案件新增中...');

    try {
        const formData = {
            action: isEditing ? 'update' : 'create',
            id: isEditing ? currentEditId : new Date().getTime().toString(),
            date: document.getElementById('date').value,
            agent: document.getElementById('agent').value,
            area: document.getElementById('area').value,
            caseName: document.getElementById('caseName').value,
            buildLicense: document.getElementById('buildLicense').value,
            useLicense: document.getElementById('useLicense').value,
            cadastral: document.getElementById('cadastral').value,
            zone: document.getElementById('zone').value,
            usage: document.getElementById('usage').value,
            landArea: document.getElementById('landArea').value,
            buildArea: document.getElementById('buildArea').value,
            unitPrice: document.getElementById('unitPrice').value,
            totalPrice: document.getElementById('totalPrice').value,
            width: document.getElementById('width').value,
            depth: document.getElementById('depth').value,
            address: document.getElementById('address').value,
            notes: document.getElementById('notes').value
        };

        // 處理照片檔案
        const photoFiles = document.getElementById('photoUpload').files;
        if (photoFiles.length > 0) {
            formData.photoName = photoFiles[0].name;
            formData.photoData = await fileToBase64(photoFiles[0]);
            formData.photoMimeType = photoFiles[0].type;
        }

        // 處理 PDF 檔案
        const pdfFiles = document.getElementById('pdfUpload').files;
        if (pdfFiles.length > 0) {
            formData.pdfName = pdfFiles[0].name;
            formData.pdfData = await fileToBase64(pdfFiles[0]);
            formData.pdfMimeType = pdfFiles[0].type;
        }

        const response = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            Swal.fire({
                title: '成功!',
                text: isEditing ? '案件已成功更新' : '案件已成功新增至總表',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
            resetForm();
            fetchDataFromCloud();
        } else {
            throw new Error('雲端寫入失敗');
        }
    } catch (error) {
        Swal.fire('錯誤!', '發生連線錯誤，請檢查網路或稍後再試。', 'error');
        console.error(error);
    } finally {
        toggleLoading(false);
    }
});

// 從 Google 試算表讀取資料
async function fetchDataFromCloud() {
    toggleLoading(true, '載入案件總表中...');
    try {
        const response = await fetch(`${GAS_URL}?action=read`);
        const data = await response.json();
        
        if (data.status === 'success') {
            casesData = data.data || [];
            renderCaseList(casesData);
        }
    } catch (error) {
        console.error('讀取資料失敗:', error);
    } finally {
        toggleLoading(false);
    }
}

// 刪除案件 (含 SweetAlert 防呆提醒)
window.deleteCase = (id) => {
    Swal.fire({
        title: '確定要刪除此案件嗎？',
        text: "刪除後將無法復原！",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        confirmButtonText: '是的，刪除！',
        cancelButtonText: '取消'
    }).then(async (result) => {
        if (result.isConfirmed) {
            toggleLoading(true, '刪除中...');
            try {
                const response = await fetch(GAS_URL, {
                    method: 'POST',
                    body: JSON.stringify({ action: 'delete', id: id })
                });
                
                const resData = await response.json();
                if (resData.status === 'success') {
                    Swal.fire({ title: '已刪除!', icon: 'success', timer: 1200, showConfirmButton: false });
                    fetchDataFromCloud();
                }
            } catch (error) {
                Swal.fire('錯誤!', '刪除失敗，請稍後再試。', 'error');
            } finally {
                toggleLoading(false);
            }
        }
    });
}

// 切換為編輯狀態
window.editCase = (id) => {
    const caseItem = casesData.find(c => String(c.id) === String(id));
    if (!caseItem) return;

    isEditing = true;
    currentEditId = id;
    
    // 介面變色提示正在編輯
    formContainer.classList.add('bg-amber-50/50', 'border-amber-200');
    formTitle.innerHTML = '<i class="fas fa-edit text-amber-600"></i>編輯案件資料';
    submitBtn.textContent = '更新案件資料';
    submitBtn.classList.replace('bg-blue-600', 'bg-amber-500');
    submitBtn.classList.replace('hover:bg-blue-700', 'hover:bg-amber-600');
    cancelEditBtn.classList.remove('hidden');

    // 填入既有資料
    document.getElementById('date').value = caseItem.date || '';
    document.getElementById('agent').value = caseItem.agent || '';
    document.getElementById('area').value = caseItem.area || '';
    document.getElementById('caseName').value = caseItem.caseName || '';
    document.getElementById('buildLicense').value = caseItem.buildLicense || '';
    document.getElementById('useLicense').value = caseItem.useLicense || '';
    document.getElementById('cadastral').value = caseItem.cadastral || '';
    document.getElementById('zone').value = caseItem.zone || '';
    document.getElementById('usage').value = caseItem.usage || '';
    document.getElementById('landArea').value = caseItem.landArea || '';
    document.getElementById('buildArea').value = caseItem.buildArea || '';
    document.getElementById('unitPrice').value = caseItem.unitPrice || '';
    document.getElementById('totalPrice').value = caseItem.totalPrice || '';
    document.getElementById('width').value = caseItem.width || '';
    document.getElementById('depth').value = caseItem.depth || '';
    document.getElementById('address').value = caseItem.address || '';
    document.getElementById('notes').value = caseItem.notes || '';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 取消編輯與重置表單
function resetForm() {
    isEditing = false;
    currentEditId = null;
    caseForm.reset();
    
    formContainer.classList.remove('bg-amber-50/50', 'border-amber-200');
    formTitle.innerHTML = '<i class="fas fa-plus-circle text-blue-600"></i>新增案件資料';
    submitBtn.textContent = '儲存並新增至總表';
    submitBtn.classList.replace('bg-amber-500', 'bg-blue-600');
    submitBtn.classList.replace('hover:bg-amber-600', 'hover:bg-blue-700');
    cancelEditBtn.classList.add('hidden');
}

cancelEditBtn.addEventListener('click', resetForm);

// 渲染案件列表卡片 (自動依區域排序與顯示完整內容)
function renderCaseList(data) {
    caseList.innerHTML = '';
    caseCountBadge.innerText = `共 ${data.length} 筆`;
    
    if (data.length === 0) {
        caseList.innerHTML = `
            <div class="col-span-2 text-center py-16 bg-white rounded-2xl border border-gray-100">
                <i class="fas fa-folder-open text-4xl text-gray-300 mb-2"></i>
                <p class="text-gray-500 text-sm">目前尚無案件資料</p>
            </div>
        `;
        return;
    }

    // 依據「區域」進行中文排序
    const sortedData = [...data].sort((a, b) => (a.area || '').localeCompare(b.area || '', 'zh-TW'));

    sortedData.forEach(item => {
        const cardHtml = `
            <div class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                <div>
                    <div class="flex justify-between items-start mb-3">
                        <div>
                            <span class="bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-md">${item.area || '未分類區域'}</span>
                            <h3 class="text-lg font-bold text-gray-900 mt-2">${item.caseName || '未命名案件'}</h3>
                        </div>
                        
                        <div class="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-100">
                            <button onclick="exportSingleExcel('${item.id}')" title="匯出單一 Excel" class="p-1.5 text-green-600 hover:bg-green-100 rounded transition-colors"><i class="fas fa-file-excel"></i></button>
                            <button onclick="exportSinglePDF('${item.id}')" title="匯出單一 PDF" class="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"><i class="fas fa-file-pdf"></i></button>
                            <button onclick="editCase('${item.id}')" title="編輯案件" class="p-1.5 text-blue-500 hover:bg-blue-100 rounded transition-colors"><i class="fas fa-pen"></i></button>
                            <button onclick="deleteCase('${item.id}')" title="刪除案件" class="p-1.5 text-red-500 hover:bg-red-100 rounded transition-colors"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 text-sm bg-gray-50 p-3 rounded-xl border border-gray-100 text-gray-600">
                        <div><span class="text-gray-400 text-xs block">總價</span><strong class="text-red-600 text-base">${item.totalPrice ? item.totalPrice + ' 萬' : '-'}</strong></div>
                        <div><span class="text-gray-400 text-xs block">土地單價</span><span>${item.unitPrice ? item.unitPrice + ' 萬/坪' : '-'}</span></div>
                        <div><span class="text-gray-400 text-xs block">地坪 / 建坪</span><span>${item.landArea || '-'} / ${item.buildArea || '-'} 坪</span></div>
                        <div><span class="text-gray-400 text-xs block">面寬 / 縱深</span><span>${item.width || '-'} / ${item.depth || '-'} 米</span></div>
                        <div class="col-span-2"><span class="text-gray-400 text-xs block">門牌號碼</span><span>${item.address || '-'}</span></div>
                        <div class="col-span-2"><span class="text-gray-400 text-xs block">地籍資料</span><span>${item.cadastral || '-'}</span></div>
                        
                        <div class="col-span-2 border-t pt-2 mt-1">
                            <span class="text-gray-400 text-xs block font-medium text-gray-700">執照資訊：</span>
                            <div class="ml-2 text-xs space-y-0.5 mt-1">
                                <p>建照號碼: ${item.buildLicense || '無'}</p>
                                <p>使照號碼: ${item.useLicense || '無'}</p>
                            </div>
                        </div>

                        <div><span class="text-gray-400 text-xs block">分區 / 狀況</span><span>${item.zone || '-'} / ${item.usage || '-'}</span></div>
                        <div><span class="text-gray-400 text-xs block">專員</span><span><i class="fas fa-user-tie text-gray-400 mr-1"></i>${item.agent || '-'}</span></div>
                    </div>
                </div>

                ${item.notes ? `<div class="mt-3 text-xs text-gray-500 bg-amber-50 p-2 rounded-lg border border-amber-100"><strong>備註：</strong> ${item.notes}</div>` : ''}
            </div>
        `;
        caseList.insertAdjacentHTML('beforeend', cardHtml);
    });
}

// 搜尋即時過濾功能
searchInput.addEventListener('input', (e) => {
    const keyword = e.target.value.toLowerCase();
    const filtered = casesData.filter(item => 
        (item.caseName && item.caseName.toLowerCase().includes(keyword)) ||
        (item.area && item.area.toLowerCase().includes(keyword)) ||
        (item.agent && item.agent.toLowerCase().includes(keyword)) ||
        (item.address && item.address.toLowerCase().includes(keyword)) ||
        (item.notes && item.notes.toLowerCase().includes(keyword))
    );
    renderCaseList(filtered);
});

// 單一案件匯出 Excel (兩欄式直向排版)
window.exportSingleExcel = (id) => {
    const item = casesData.find(c => String(c.id) === String(id));
    if (!item) return;

    const rows = [
        ['欄位項目', '詳細內容'],
        ['案名', item.caseName],
        ['進件日期', item.date],
        ['區域', item.area],
        ['門牌號碼', item.address],
        ['地籍資料', item.cadastral],
        ['分區', item.zone],
        ['使用狀況', item.usage],
        ['地坪(坪)', item.landArea],
        ['建坪(坪)', item.buildArea],
        ['土地面寬(米)', item.width],
        ['縱深(米)', item.depth],
        ['建照號碼', item.buildLicense],
        ['使照號碼', item.useLicense],
        ['土地單價(萬/坪)', item.unitPrice],
        ['總價(萬)', item.totalPrice],
        ['專員', item.agent],
        ['備註', item.notes]
    ];

    const csvContent = '\uFEFF' + rows.map(r => r.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${item.caseName || '案件'}_詳細資料.csv`;
    link.click();
};

// 單一案件匯出 PDF (含完整欄位及上下獨立執照排版)
window.exportSinglePDF = (id) => {
    const item = casesData.find(c => String(c.id) === String(id));
    if (!item) return;

    let html = `
        <html>
        <head>
            <title>${item.caseName} - 詳細報表</title>
            <style>
                body { font-family: 'Microsoft JhengHei', sans-serif; padding: 30px; color: #333; }
                h1 { text-align: center; color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; }
                .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 20px; }
                .box { background: #f9fafb; border: 1px solid #e5e7eb; padding: 12px; border-radius: 8px; }
                .full { grid-column: span 2; }
                .label { font-size: 12px; color: #6b7280; display: block; margin-bottom: 4px; }
                .value { font-size: 16px; font-weight: bold; }
            </style>
        </head>
        <body>
            <h1>不動產案件詳細資料表</h1>
            <div class="grid">
                <div class="box full"><span class="label">案名</span><span class="value" style="font-size: 20px;">${item.caseName || '-'}</span></div>
                <div class="box"><span class="label">進件日期</span><span class="value">${item.date || '-'}</span></div>
                <div class="box"><span class="label">區域</span><span class="value">${item.area || '-'}</span></div>
                <div class="box full"><span class="label">門牌號碼</span><span class="value">${item.address || '-'}</span></div>
                <div class="box"><span class="label">地坪 / 建坪</span><span class="value">${item.landArea || '-'} / ${item.buildArea || '-'} 坪</span></div>
                <div class="box"><span class="label">總價</span><span class="value" style="color: #dc2626;">${item.totalPrice ? item.totalPrice + ' 萬' : '-'}</span></div>
                <div class="box full"><span class="label">建照號碼</span><span class="value">${item.buildLicense || '-'}</span></div>
                <div class="box full"><span class="label">使照號碼</span><span class="value">${item.useLicense || '-'}</span></div>
                <div class="box full"><span class="label">專員</span><span class="value">${item.agent || '-'}</span></div>
            </div>
            ${item.notes ? `<div style="margin-top:20px; background:#fefce8; padding:15px; border-radius:8px;"><strong>備註：</strong><br>${item.notes}</div>` : ''}
        </body>
        </html>
    `;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 400);
};

// 總表匯出 Excel
document.getElementById('exportTotalExcel').addEventListener('click', () => {
    if (casesData.length === 0) { Swal.fire('提示', '目前無總表資料可匯出！', 'info'); return; }
    const headers = ['進件日期', '區域', '案名', '地籍資料', '分區', '使用狀況', '地坪', '建坪', '土地單價(萬)', '總價(萬)', '土地面寬', '縱深', '門牌號碼', '建照號碼', '使照號碼', '專員', '備註'];
    const rows = [headers.join(',')];
    casesData.forEach(c => {
        const r = [c.date, c.area, c.caseName, c.cadastral, c.zone, c.usage, c.landArea, c.buildArea, c.unitPrice, c.totalPrice, c.width, c.depth, c.address, c.buildLicense, c.useLicense, c.agent, c.notes]
            .map(v => `"${String(v || '').replace(/"/g, '""')}"`);
        rows.push(r.join(','));
    });
    const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '不動產案件總表.csv';
    link.click();
});

// 總表匯出 PDF
document.getElementById('exportTotalPDF').addEventListener('click', () => {
    if (casesData.length === 0) { Swal.fire('提示', '目前無總表資料可匯出！', 'info'); return; }
    let html = `<html><head><title>不動產案件總表</title><style>body{font-family:'Microsoft JhengHei',sans-serif;padding:20px;}table{width:100%;border-collapse:collapse;margin-top:15px;font-size:12px;}th,td{border:1px solid #ccc;padding:8px;text-align:left;}th{background:#f3f4f6;}</style></head><body><h2>不動產案件總表</h2><table><thead><tr><th>區域</th><th>案名</th><th>總價(萬)</th><th>地坪/建坪</th><th>專員</th><th>進件日期</th></tr></thead><tbody>`;
    casesData.forEach(c => {
        html += `<tr><td>${c.area || ''}</td><td>${c.caseName || ''}</td><td style="color:red;font-weight:bold;">${c.totalPrice || ''}</td><td>${c.landArea || ''}/${c.buildArea || ''}</td><td>${c.agent || ''}</td><td>${c.date || ''}</td></tr>`;
    });
    html += `</tbody></table></body></html>`;
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 400);
});