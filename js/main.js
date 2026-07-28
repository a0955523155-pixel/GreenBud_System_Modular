// js/main.js

// 1. 引入 Firebase 核心套件 (使用 v10 模組化寫法)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// ⚠️⚠️⚠️ 請將這裡替換成您剛剛在 Firebase 後台取得的 firebaseConfig ⚠️⚠️⚠️
const firebaseConfig = {
  apiKey: "AIzaSyAjCvMLiZmEUEgfqjXAHSFBuKHk9Uyrfkw",
  authDomain: "real-estate-case-management.firebaseapp.com",
  projectId: "real-estate-case-management",
  storageBucket: "real-estate-case-management.firebasestorage.app",
  messagingSenderId: "22434337168",
  appId: "1:22434337168:web:27e65ef9dd4fb01a3e6315",
  measurementId: "G-5BX5KSTZQR"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// 全域狀態管理
let casesData = [];
let currentExistingPhotos = [];
let currentExistingPdfs = []; 

// 工具函數：上傳檔案至 Firebase Storage 並取得下載網址
async function uploadFileToFirebase(file, folderName) {
    const fileRef = ref(storage, `${folderName}/${Date.now()}_${file.name}`);
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
}

// 將功能綁定到 window，讓 HTML 的 onclick 可以呼叫
window.app = {
    // 1. 從 Firebase 載入資料
    loadCases: async function() {
        document.getElementById('loading').style.display = 'flex';
        try {
            const querySnapshot = await getDocs(collection(db, "cases"));
            casesData = [];
            querySnapshot.forEach((doc) => {
                // Firebase 的 document ID 就是該筆資料的 ID
                casesData.push({ id: doc.id, ...doc.data() });
            });
            this.renderCases();
        } catch (error) {
            console.error('載入資料失敗:', error);
            alert('無法載入資料，請檢查 Firebase 設定與權限。');
        } finally {
            document.getElementById('loading').style.display = 'none';
        }
    },

    // 2. 儲存/更新案件至 Firebase
    saveCase: async function(event) {
        event.preventDefault();
        document.getElementById('loading').style.display = 'flex';

        try {
            const editId = document.getElementById('editId').value;
            
            // 準備基礎文字資料
            const caseData = {
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
                photos: [...currentExistingPhotos], // 繼承未刪除的舊照片
                pdfs: [...currentExistingPdfs]      // 繼承未刪除的舊 PDF
            };

            // 上傳新照片到 Firebase Storage
            const photoInput = document.getElementById('c_photos');
            if (photoInput.files.length > 0) {
                for (let file of photoInput.files) {
                    const downloadUrl = await uploadFileToFirebase(file, 'photos');
                    caseData.photos.push(downloadUrl);
                }
            }

            // 上傳新 PDF 到 Firebase Storage
            const pdfInput = document.getElementById('c_pdfs');
            if (pdfInput.files.length > 0) {
                for (let file of pdfInput.files) {
                    const downloadUrl = await uploadFileToFirebase(file, 'pdfs');
                    caseData.pdfs.push({ name: file.name, url: downloadUrl });
                }
            }

            // 寫入 Firestore Database
            if (editId) {
                // 編輯模式：更新指定 ID 的文件
                await setDoc(doc(db, "cases", editId), caseData);
                alert('案件資料已成功更新！');
            } else {
                // 新增模式：由 Firebase 自動產生文件 ID
                caseData.createdAt = Date.now(); // 加入時間戳記方便排序
                await addDoc(collection(db, "cases"), caseData);
                alert('案件資料已成功新增！');
            }

            this.cancelEdit();
            await this.loadCases(); // 重新載入最新資料

        } catch (error) {
            console.error('儲存失敗:', error);
            alert('儲存至 Firebase 時發生錯誤。');
        } finally {
            document.getElementById('loading').style.display = 'none';
        }
    },

    // 3. 渲染右側案件卡片列表 (邏輯不變，直接從 casesData 讀取)
    renderCases: function() {
        const keyword = (document.getElementById('searchInput')?.value || '').toLowerCase();
        const container = document.getElementById('casesList');
        
        // 過濾與排序 (依新增時間或區域排序)
        let filtered = casesData.filter(c => {
            return (c.name || '').toLowerCase().includes(keyword) || 
                   (c.region || '').toLowerCase().includes(keyword) ||
                   (c.address || '').toLowerCase().includes(keyword);
        }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)); // 預設依新到舊排序

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

    // 4. 準備編輯案件 (載入文字與舊檔案)
    editCase: function(id) {
        const item = casesData.find(c => c.id === id);
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

        // 載入舊有的照片與 PDF 檔案
        currentExistingPhotos = item.photos ? [...item.photos] : [];
        currentExistingPdfs = item.pdfs ? [...item.pdfs] : [];
        this.renderExistingFilesUI();

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

    // 🌟 渲染已存在的照片與 PDF 預覽區 (包含刪除按鈕)
    renderExistingFilesUI: function() {
        let container = document.getElementById('existingFilesContainer');
        if (!container) {
            const photoInput = document.getElementById('c_photos');
            container = document.createElement('div');
            container.id = 'existingFilesContainer';
            photoInput.parentNode.insertBefore(container, photoInput);
        }

        if (currentExistingPhotos.length === 0 && currentExistingPdfs.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = `
            <div class="my-4 p-3 border rounded-xl bg-gray-50 border-gray-200">
                <p class="text-xs font-semibold text-gray-600 mb-2">已上傳雲端的檔案 (可點擊 X 刪除)：</p>
                <div class="flex flex-wrap gap-3">
                    ${currentExistingPhotos.map((url, idx) => `
                        <div class="relative group w-16 h-16 border border-gray-200 rounded-lg overflow-hidden bg-white">
                            <img src="${url}" class="w-full h-full object-cover">
                            <button type="button" onclick="window.app.removeExistingPhoto(${idx})" class="absolute top-0 right-0 bg-red-600 text-white p-1 text-xs hover:bg-red-700 opacity-90"><i class="fas fa-times"></i></button>
                        </div>
                    `).join('')}
                    ${currentExistingPdfs.map((pdf, idx) => `
                        <div class="relative group h-16 px-2 border border-gray-200 rounded-lg bg-white flex flex-col items-center justify-center text-center max-w-[80px]">
                            <i class="fas fa-file-pdf text-red-500 text-xl mb-1"></i>
                            <span class="text-[10px] text-gray-500 truncate w-full" title="${pdf.name}">${pdf.name}</span>
                            <button type="button" onclick="window.app.removeExistingPdf(${idx})" class="absolute top-0 right-0 bg-red-600 text-white p-1 text-xs hover:bg-red-700 opacity-90"><i class="fas fa-times"></i></button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    removeExistingPhoto: function(index) { currentExistingPhotos.splice(index, 1); this.renderExistingFilesUI(); },
    removeExistingPdf: function(index) { currentExistingPdfs.splice(index, 1); this.renderExistingFilesUI(); },

    // 5. 取消編輯
    cancelEdit: function() {
        document.getElementById('caseForm').reset();
        document.getElementById('editId').value = '';
        currentExistingPhotos = [];
        currentExistingPdfs = [];
        const container = document.getElementById('existingFilesContainer');
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

    // 6. 刪除案件 (刪除 Firestore 資料)
    deleteCase: async function(id) {
        if (confirm('警告：確定要刪除這筆案件嗎？')) {
            document.getElementById('loading').style.display = 'flex';
            try {
                await deleteDoc(doc(db, "cases", id));
                alert('案件已成功刪除');
                await this.loadCases();
            } catch (err) {
                console.error(err);
                alert('刪除失敗，請檢查權限與連線。');
            } finally {
                document.getElementById('loading').style.display = 'none';
            }
        }
    },

    // 匯出 PDF/Excel 保留不變
    exportSinglePDF: function(c) { /* ...與先前相同的列印邏輯... */ },
    exportSingleExcel: function(c) { /* ...與先前相同的匯出邏輯... */ },
    exportToExcel: function() { alert('總表匯出功能開發中'); },
    exportToPDF: function() { alert('總表匯出功能開發中'); }
};

// 頁面載入完成後，自動向 Firebase 請求資料
document.addEventListener('DOMContentLoaded', () => {
    window.app.loadCases();
});