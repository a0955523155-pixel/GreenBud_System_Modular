// js/main.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
// 新增引入 Auth 模組
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAjCvMLiZmEUEgfqjXAHSFBuKHk9Uyrfkw",
  authDomain: "real-estate-case-management.firebaseapp.com",
  projectId: "real-estate-case-management",
  storageBucket: "real-estate-case-management.firebasestorage.app",
  messagingSenderId: "22434337168",
  appId: "1:22434337168:web:27e65ef9dd4fb01a3e6315",
  measurementId: "G-5BX5KSTZQR"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

let casesData = [];
let currentUserEmail = null;

// 定義管理員帳號 (只有這些人能看紀錄)
const ADMIN_EMAILS = ['admin@green.com', 'boss@green.com'];

// 監聽登入狀態
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserEmail = user.email;
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
        document.getElementById('currentUser').innerText = currentUserEmail;
        
        // 判斷是否為管理員
        if(ADMIN_EMAILS.includes(currentUserEmail)) {
            document.getElementById('adminLogBtn').classList.remove('hidden');
        }
        
        // 紀錄登入
        window.app.logAction('登入系統', '使用者登入成功');
        window.app.loadCases();
    } else {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('mainContent').style.display = 'none';
    }
});

// 上傳檔案功能 (同前)
async function uploadFileToFirebase(file, folderName) {
    const fileRef = ref(storage, `${folderName}/${Date.now()}_${file.name}`);
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
}

window.app = {
    // 登入
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

    // 登出
    logout: function() { signOut(auth); },

    // 紀錄稽核 Log
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

    // 查看紀錄 (管理員功能)
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

    // 讀取案件，並自動萃取「區域」與「屬性」填入篩選器
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
            
            // 更新篩選器下拉選單
            const regionSelect = document.getElementById('filterRegion');
            regionSelect.innerHTML = '<option value="">全部區域</option>' + [...regions].map(r => `<option value="${r}">${r}</option>`).join('');
            
            const zoningSelect = document.getElementById('filterZoning');
            zoningSelect.innerHTML = '<option value="">全部屬性</option>' + [...zonings].map(z => `<option value="${z}">${z}</option>`).join('');

            this.renderCases();
        } catch (error) { console.error(error); } 
        finally { document.getElementById('loading').style.display = 'none'; }
    },

    // 591 概念進階篩選與渲染
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

        // 產生卡片，加入 Google Map iframe 按鈕或直接顯示
        container.innerHTML = filtered.map(item => `
            <div class="border border-gray-200 rounded-2xl overflow-hidden hover:shadow-md bg-white flex flex-col">
                ${item.photos && item.photos.length > 0 
                    ? `<div class="h-48 overflow-hidden relative"><img crossorigin="anonymous" src="${item.photos[0]}" class="w-full h-full object-cover"></div>` 
                    : `<div class="h-20 bg-blue-50 flex items-center justify-center"><i class="fas fa-home text-3xl text-blue-200"></i></div>`
                }
                <div class="p-5 flex-grow">
                    <h3 class="text-lg font-bold">${item.name}</h3>
                    <p class="text-sm text-gray-500 mb-2">${item.region} | 總價: <span class="text-red-600 font-bold">${item.totalPrice}萬</span></p>
                    <div class="flex gap-2">
                        <button onclick='window.app.exportSinglePDF(${JSON.stringify(item).replace(/'/g, "&#39;")})' class="bg-red-50 text-red-600 px-3 py-1 rounded text-sm border"><i class="fas fa-file-pdf"></i> 匯出PDF(含地圖)</button>
                        <button onclick='window.app.exportSingleExcel(${JSON.stringify(item).replace(/'/g, "&#39;")})' class="bg-green-50 text-green-600 px-3 py-1 rounded text-sm border"><i class="fas fa-file-excel"></i> 匯出Excel</button>
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

    // 解決 PDF 照片出不來，並自動嵌入 Google 門牌地圖
    exportSinglePDF: function(c) {
        // 紀錄匯出行為
        this.logAction('匯出 PDF', c.name);
        
        document.getElementById('loading').style.display = 'flex';
        
        // 製作要列印的 HTML，加入 crossOrigin 解決圖片問題，並加入自動門牌地圖
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

        // html2pdf 核心設定：必須開啟 useCORS
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
        // (此處保留原先的 Excel 匯出邏輯即可)
        alert('匯出 Excel 並已紀錄於管理員日誌！');
    }
};