// js/main.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// 🌟 關鍵修改：從外部檔案引入金鑰設定
import { firebaseConfig } from './firebase-config.js';

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// 全域變數
let casesData = [];
let currentUserEmail = null;
let currentExistingPhotos = [];
let currentExistingPdfs = []; 

// 管理員帳號 (只有這些人能看紀錄，請改成您自己的 Email)
const ADMIN_EMAILS = ['admin@green.com', 'boss@green.com'];

// 監聽登入狀態
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserEmail = user.email;
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
        document.getElementById('currentUser').innerText = currentUserEmail;
        
        if(ADMIN_EMAILS.includes(currentUserEmail)) {
            document.getElementById('adminLogBtn').classList.remove('hidden');
        }
        
        window.app.logAction('登入系統', '使用者登入成功');
        window.app.loadCases();
    } else {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('mainContent').style.display = 'none';
    }
});

// 上傳檔案至 Firebase
async function uploadFileToFirebase(file, folderName) {
    const fileRef = ref(storage, `${folderName}/${Date.now()}_${file.name}`);
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
}

window.app = {
    // ---------------- 系統與登入功能 ----------------
    login: async function(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const pwd = document.getElementById('loginPwd').value;
        document.getElementById('loading').style.display = 'flex';
        try {
            await signInWithEmailAndPassword(auth, email, pwd);
        } catch (error) {
            alert('登入失敗，請檢查帳號密碼。');
        }
        document.getElementById('loading').style.display = 'none';
    },

    logout: function() { signOut(auth); },

    logAction: async function(actionType, targetCaseName) {
        try {
            await addDoc(collection(db, "audit_logs"), {
                user: currentUserEmail,
                action: actionType,
                target: targetCaseName,
                timestamp: new Date().toLocaleString('zh-TW')
            });
        } catch(e) { console.error("紀錄失敗", e); }
    },

    viewLogs: async function() {
        document.getElementById('loading').style.display = 'flex';
        const q = query(collection(db, "audit_logs"), orderBy("timestamp", "desc"));
        const snapshot = await getDocs(q);
        let logHtml = '<ul class="divide-y">';
        snapshot.forEach(doc => {
            const d = doc.data();
            logHtml += `<li class="py-2"><span class="text-gray-500">${d.timestamp}</span> - <span class="font-bold text-blue-600">${d.user}</span> 執行了 <span class="text-red-500">[${d.action}]</span> : ${d.target}</li>`;
        });
        logHtml += '</ul>';
        document.getElementById('logContent').innerHTML = logHtml;
        document.getElementById('logModal').classList.remove('hidden');
        document.getElementById('loading').style.display = 'none';
    },

    // ---------------- 資料讀取與顯示 ----------------
    loadCases: async function() {
        document.getElementById('loading').style.display = 'flex';
        try {
            const querySnapshot = await getDocs(collection(db, "cases"));
            casesData = [];
            let regions = new Set();
            let zonings = new Set();

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                casesData.push({ id: doc.id, ...data });
                if(data.region) regions.add(data.region);
                if(data.zoning) zonings.add(data.zoning);
            });
            
            const regionSelect = document.getElementById('filterRegion');
            regionSelect.innerHTML = '<option value="">全部區域</option>' + [...regions].map(r => `<option value="${r}">${r}</option>`).join('');
            
            const zoningSelect = document.getElementById('filterZoning');
            zoningSelect.innerHTML = '<option value="">全部屬性</option>' + [...zonings].map(z => `<option value="${z}">${z}</option>`).join('');

            this.renderCases();
        } catch (error) { console.error(error); } 
        finally { document.getElementById('loading').style.display = 'none'; }
    },

    renderCases: function() {
        const keyword = document.getElementById('filterKeyword').value.toLowerCase();
        const fRegion = document.getElementById('filterRegion').value;
        const fZoning = document.getElementById('filterZoning').value;
        const fMin = parseFloat(document.getElementById('filterPriceMin').value) || 0;
        const fMax = parseFloat(document.getElementById('filterPriceMax').value) || Infinity;

        const container = document.getElementById('casesList');
        
        let filtered = casesData.filter(c => {
            const price = parseFloat(c.totalPrice) || 0;
            const matchKey = (c.name||'').toLowerCase().includes(keyword) || (c.address||'').toLowerCase().includes(keyword);
            const matchReg = fRegion === "" || c.region === fRegion;
            const matchZon = fZoning === "" || c.zoning === fZoning;
            const matchPrice = price >= fMin && price <= fMax;
            return matchKey && matchReg && matchZon && matchPrice;
        }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        document.getElementById('totalCount').innerText = filtered.length;
        if (filtered.length === 0) {
            container.innerHTML = `<div class="col-span-full text-center py-10 text-gray-400">找不到符合條件的案件</div>`; return;
        }

        container.innerHTML = filtered.map(item => `
            <div class="border border-gray-200 rounded-2xl overflow-hidden hover:shadow-md bg-white flex flex-col">
                ${item.photos && item.photos.length > 0 
                ? `<div class="h-48 overflow-hidden relative"><img src="${item.photos[0]}" class="w-full h-full object-cover"></div>` 
                : `<div class="h-20 bg-blue-50 flex items-center justify-center"><i class="fas fa-home text-3xl text-blue-200"></i></div>`
                }           
                <div class="p-5 flex-grow">
                    <h3 class="text-lg font-bold">${item.name}</h3>
                    <p class="text-sm text-gray-500 mb-2">${item.region} | 總價: <span class="text-red-600 font-bold">${item.totalPrice}萬</span></p>
                    
                    <div class="flex gap-1 bg-gray-50 p-1 rounded-lg border border-gray-100 mb-3 justify-center">
                        <button onclick='window.app.exportSingleExcel(${JSON.stringify(item).replace(/'/g, "&#39;")})' class="p-1.5 text-green-600 hover:bg-green-100 rounded" title="匯出 Excel"><i class="fas fa-file-excel"></i></button>
                        <button onclick='window.app.exportSinglePDF(${JSON.stringify(item).replace(/'/g, "&#39;")})' class="p-1.5 text-rose-500 hover:bg-rose-100 rounded" title="匯出 PDF"><i class="fas fa-file-pdf"></i></button>
                        <div class="w-px bg-gray-200 mx-1"></div>
                        <button onclick='window.app.editCase("${item.id}")' class="p-1.5 text-blue-500 hover:bg-blue-100 rounded" title="編輯"><i class="fas fa-edit"></i></button>
                        <button onclick='window.app.deleteCase("${item.id}")' class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded" title="刪除"><i class="fas fa-trash"></i></button>
                    </div>

                    <div class="grid grid-cols-2 gap-x-4 gap-y-3 mt-3 text-sm text-gray-600 bg-gray-50/70 p-3 rounded-xl border border-gray-100 flex-grow">
                        <div><span class="text-xs text-gray-400 block">總價</span><span class="font-bold text-red-600">${item.totalPrice ? item.totalPrice + ' 萬' : '-'}</span></div>
                        <div><span class="text-xs text-gray-400 block">單價</span><span>${item.unitPrice || '-'}</span></div>
                        <div><span class="text-xs text-gray-400 block">地坪 / 建坪</span><span>${item.landArea || '-'} / ${item.buildArea || '-'}</span></div>
                        <div><span class="text-xs text-gray-400 block">面寬 / 縱深</span><span>${item.width || '-'} / ${item.depth || '-'}</span></div>
                        <div class="col-span-2"><span class="text-xs text-gray-400 block">門牌號碼</span><span class="break-all">${item.address || '-'}</span></div>
                    </div>
                </div>
            </div>
        `).join('');
    },

    resetFilters: function() {
        document.getElementById('filterKeyword').value = '';
        document.getElementById('filterRegion').value = '';
        document.getElementById('filterZoning').value = '';
        document.getElementById('filterPriceMin').value = '';
        document.getElementById('filterPriceMax').value = '';
        this.renderCases();
    },

    // ---------------- 新增、修改與刪除功能 ----------------
    saveCase: async function(event) {
        event.preventDefault();
        document.getElementById('loading').style.display = 'flex';

        try {
            const editId = document.getElementById('editId').value;
            
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
                photos: [...currentExistingPhotos],
                pdfs: [...currentExistingPdfs],
                updatedBy: currentUserEmail
            };

            const photoInput = document.getElementById('c_photos');
            if (photoInput.files.length > 0) {
                for (let file of photoInput.files) {
                    const url = await uploadFileToFirebase(file, 'photos');
                    caseData.photos.push(url);
                }
            }

            const pdfInput = document.getElementById('c_pdfs');
            if (pdfInput.files.length > 0) {
                for (let file of pdfInput.files) {
                    const url = await uploadFileToFirebase(file, 'pdfs');
                    caseData.pdfs.push({ name: file.name, url: url });
                }
            }

            if (editId) {
                await setDoc(doc(db, "cases", editId), caseData, { merge: true });
                this.logAction('編輯案件', caseData.name);
                alert('案件資料已更新！');
            } else {
                caseData.createdAt = Date.now();
                caseData.createdBy = currentUserEmail;
                await addDoc(collection(db, "cases"), caseData);
                this.logAction('新增案件', caseData.name);
                alert('案件資料已新增！');
            }

            this.cancelEdit();
            await this.loadCases();

        } catch (error) {
            console.error('儲存失敗:', error);
            alert('儲存發生錯誤。');
        } finally {
            document.getElementById('loading').style.display = 'none';
        }
    },

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

        currentExistingPhotos = item.photos ? [...item.photos] : [];
        currentExistingPdfs = item.pdfs ? [...item.pdfs] : [];
        this.renderExistingFilesUI();

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

    deleteCase: async function(id) {
        if (confirm('警告：確定要刪除這筆案件嗎？')) {
            const item = casesData.find(c => c.id === id);
            document.getElementById('loading').style.display = 'flex';
            try {
                await deleteDoc(doc(db, "cases", id));
                this.logAction('刪除案件', item ? item.name : id);
                alert('案件已成功刪除');
                await this.loadCases();
            } catch (err) {
                alert('刪除失敗，請檢查權限與連線。');
            } finally {
                document.getElementById('loading').style.display = 'none';
            }
        }
    },

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
                <p class="text-xs font-semibold text-gray-600 mb-2">已上傳的檔案 (點擊 X 刪除)：</p>
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

    // ---------------- 匯出功能 ----------------
    exportSinglePDF: function(c) {
        this.logAction('匯出 PDF', c.name);
        document.getElementById('loading').style.display = 'flex';
        
        const element = document.createElement('div');
        element.innerHTML = `
            <div style="font-family: 'Microsoft JhengHei', sans-serif; padding: 20px;">
                <h1 style="text-align: center; color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px;">${c.name} - 案件資料</h1>
                
                <table style="width:100%; border-collapse: collapse; margin-top:20px; font-size:14px;">
                    <tr>
                        <td style="border:1px solid #ccc; padding:8px; background:#f9fafb;">門牌地址</td>
                        <td colspan="3" style="border:1px solid #ccc; padding:8px;">${c.address || '未提供'}</td>
                    </tr>
                    <tr>
                        <td style="border:1px solid #ccc; padding:8px; background:#f9fafb;">總價(萬)</td>
                        <td style="border:1px solid #ccc; padding:8px; color:red; font-weight:bold;">${c.totalPrice || '-'}</td>
                        <td style="border:1px solid #ccc; padding:8px; background:#f9fafb;">地坪/建坪</td>
                        <td style="border:1px solid #ccc; padding:8px;">${c.landArea || '-'} / ${c.buildArea || '-'}</td>
                    </tr>
                </table>

                ${c.address ? `
                <div style="margin-top:20px;">
                    <h3 style="border-bottom: 1px solid #eee; padding-bottom: 5px;">📍 案件位置圖</h3>
                    <iframe width="100%" height="250" frameborder="0" style="border:0; border-radius:8px;" 
                        src="https://maps.google.com/maps?q=${encodeURIComponent(c.address)}&t=&z=16&ie=UTF8&iwloc=&output=embed">
                    </iframe>
                </div>` : ''}

                ${c.photos && c.photos.length > 0 ? `
                <div style="margin-top:20px;">
                    <h3 style="border-bottom: 1px solid #eee; padding-bottom: 5px;">📷 案件照片</h3>
                    <div style="display: flex; flex-wrap:wrap; gap: 10px;">
                        ${c.photos.map(p => `<img crossorigin="anonymous" src="${p}" style="width: 48%; height: 200px; object-fit: cover; border-radius: 8px;">`).join('')}
                    </div>
                </div>` : ''}
            </div>
        `;

        const opt = {
            margin:       10,
            filename:     `${c.name}_案件資料表.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, allowTaint: true },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).save().then(() => {
            document.getElementById('loading').style.display = 'none';
        });
    },

    exportSingleExcel: function(c) {
        this.logAction('匯出 Excel', c.name);
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
    }
};