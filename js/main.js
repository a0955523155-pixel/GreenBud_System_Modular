// js/main.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// 🌟 全台灣縣市與鄉鎮市區完整資料庫 (簡化列出主要縣市與全區)
const TAIWAN_REGIONS = {
    "台北市": ["中正區","大安區","中山區","信義區","松山區","士林區","北投區","內湖區","南港區","文山區","萬華區","大同區"],
    "新北市": ["板橋區","新莊區","中和區","永和區","三重區","新店區","土城區","蘆洲區","汐止區","樹林區","淡水區","三峽區","鶯歌區","瑞芳區","五股區","泰山區","林口區","深坑區","石碇區","坪林區","三芝區","石門區","八里區","平溪區","雙溪區","貢寮區","金山區","萬里區","烏來區"],
    "桃園市": ["桃園區","中壢區","平鎮區","八德區","楊梅區","蘆竹區","大溪區","龍潭區","龜山區","大園區","觀音區","新屋區","復興區"],
    "台中市": ["中區","東區","南區","西區","北區","北屯區","西屯區","南屯區","太平區","大里區","霧峰區","烏日區","豐原區","后里區","石岡區","東勢區","和平區","新社區","潭子區","大雅區","神岡區","大肚區","沙鹿區","龍井區","梧棲區","清水區","大甲區","外埔區","大安區"],
    "台南市": ["中西區","東區","南區","北區","安平區","安南區","永康區","歸仁區","新化區","左鎮區","玉井區","楠西區","南化區","仁德區","關廟區","龍崎區","官田區","麻豆區","佳里區","西港區","七股區","將軍區","學甲區","北門區","新營區","後壁區","白河區","東山區","六甲區","下營區","柳營區","鹽水區","善化區","大內區","山上區","新市區","安定區"],
    "高雄市": ["楠梓區","左營區","鼓山區","三民區","鹽埕區","前金區","新興區","苓雅區","前鎮區","旗津區","小港區","鳳山區","林園區","大寮區","大樹區","大社區","仁武區","鳥松區","岡山區","橋頭區","燕巢區","田寮區","阿蓮區","路竹區","湖內區","茄萣區","永安區","彌陀區","梓官區","旗山區","美濃區","六龜區","甲仙區","杉林區","內門區","茂林區","桃源區","那瑪夏區"],
    "基隆市": ["仁愛區","信義區","中正區","中山區","安樂區","暖暖區","七堵區"],
    "新竹市": ["東區","北區","香山區"],
    "嘉義市": ["東區","西區"],
    "新竹縣": ["竹北市","竹東鎮","新埔鎮","關西鎮","湖口鄉","新豐鄉","芎林鄉","橫山鄉","北埔鄉","寶山鄉","峨眉鄉","尖石鄉","五峰鄉"],
    "苗栗縣": ["苗栗市","頭份市","竹南鎮","後龍鎮","通霄鎮","苑裡鎮","卓蘭鎮","造橋鄉","西湖鄉","頭屋鄉","公館鄉","銅鑼鄉","三義鄉","大湖鄉","獅潭鄉","三灣鄉","南庄鄉","泰安鄉"],
    "彰化縣": ["彰化市","員林市","和美鎮","鹿港鎮","溪湖鎮","二林鎮","田中鎮","北斗鎮","花壇鄉","芬園鄉","大村鄉","永靖鄉","伸港鄉","線西鄉","福興鄉","秀水鄉","埔心鄉","埔鹽鄉","大城鄉","芳苑鄉","竹塘鄉","社頭鄉","二水鄉","田尾鄉","埤頭鄉","溪州鄉"],
    "南投縣": ["南投市","埔里鎮","草屯鎮","竹山鎮","集集鎮","名間鄉","鹿谷鄉","中寮鄉","魚池鄉","國姓鄉","水里鄉","信義鄉","仁愛鄉"],
    "雲林縣": ["斗六市","斗南鎮","虎尾鎮","西螺鎮","土庫鎮","北港鎮","古坑鄉","大埤鄉","莿桐鄉","林內鄉","二崙鄉","崙背鄉","麥寮鄉","東勢鄉","褒忠鄉","台西鄉","元長鄉","四湖鄉","口湖鄉","水林鄉"],
    "嘉義縣": ["太保市","樸子市","布袋鎮","大林鎮","民雄鄉","溪口鄉","新港鄉","六腳鄉","東石鄉","義竹鄉","鹿草鄉","水上鄉","中埔鄉","竹崎鄉","梅山鄉","番路鄉","大埔鄉","阿里山鄉"],
    "屏東縣": ["屏東市","潮州鎮","東港鎮","恆春鎮","萬丹鄉","長治鄉","麟洛鄉","九如鄉","里港鄉","鹽埔鄉","高樹鄉","萬巒鄉","內埔鄉","竹田鄉","新埤鄉","枋寮鄉","新園鄉","崁頂鄉","林邊鄉","南州鄉","佳冬鄉","琉球鄉","車城鄉","滿州鄉","枋山鄉","三地門鄉","霧台鄉","瑪家鄉","泰武鄉","來義鄉","春日鄉","獅子鄉","牡丹鄉"],
    "宜蘭縣": ["宜蘭市","羅東鎮","蘇澳鎮","頭城鎮","礁溪鄉","壯圍鄉","員山鄉","冬山鄉","五結鄉","三星鄉","大同鄉","南澳鄉"],
    "花蓮縣": ["花蓮市","鳳林鎮","玉里鎮","新城鄉","吉安鄉","壽豐鄉","光復鄉","豐濱鄉","瑞穗鄉","富里鄉","秀林鄉","萬榮鄉","卓溪鄉"],
    "台東縣": ["台東市","成功鎮","關山鎮","長濱鄉","海端鄉","池上鄉","東河鄉","鹿野鄉","延平鄉","太麻里鄉","金峰鄉","大武鄉","達仁鄉","綠島鄉","蘭嶼鄉"],
    "澎湖縣": ["馬公市","湖西鄉","白沙鄉","西嶼鄉","望安鄉","七美鄉"],
    "金門縣": ["金城鎮","金湖鎮","金沙鎮","金寧鄉","烈嶼鄉","烏坵鄉"],
    "連江縣": ["南竿鄉","北竿鄉","莒光鄉","東引鄉"]
};

// 🌟 不動產類型與土地分區完整分類 (591概念)
const ZONING_CATEGORIES = {
    "住宅類": ["電梯大樓", "透天/別墅", "華廈", "公寓", "套房"],
    "商業與辦公": ["店面", "辦公室/廠辦", "飯店/旅宿"],
    "工廠/倉庫": ["工業廠房", "廠辦", "倉庫/物流"],
    "土地分類": ["住宅區土地", "商業區土地", "工業區土地", "農業區/農地", "建地", "建照地", "林地/山坡地", "特定專用區", "公共設施用地"]
};

let casesData = [];
let currentUserEmail = null;
let currentExistingPhotos = [];
let currentExistingPdfs = []; 

// 複選狀態陣列
let selectedRegionsTemp = [];
let selectedRegionsConfirmed = [];
let selectedZoningsTemp = [];
let selectedZoningsConfirmed = [];

const ADMIN_EMAILS = ['a0955523155@gmail.com', 'boss@green.com']; // 請改成您的管理員 Email

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserEmail = user.email;
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
        document.getElementById('currentUser').innerText = currentUserEmail;
        
        if(ADMIN_EMAILS.includes(currentUserEmail)) {
            document.getElementById('adminLogBtn').classList.remove('hidden');
        }
        
        window.app.logAction('登入系統', '成功登入');
        window.app.loadCases();
    } else {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('mainContent').style.display = 'none';
    }
});

async function uploadFileToFirebase(file, folderName) {
    const fileRef = ref(storage, `${folderName}/${Date.now()}_${file.name}`);
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
}

window.app = {
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

    loadCases: async function() {
        document.getElementById('loading').style.display = 'flex';
        try {
            const querySnapshot = await getDocs(collection(db, "cases"));
            casesData = [];
            querySnapshot.forEach((doc) => {
                casesData.push({ id: doc.id, ...doc.data() });
            });
            this.renderCases();
        } catch (error) { console.error(error); } 
        finally { document.getElementById('loading').style.display = 'none'; }
    },

    // 🌐 區域 Modal 邏輯
    openRegionModal: function() {
        selectedRegionsTemp = [...selectedRegionsConfirmed];
        const body = document.getElementById('regionModalBody');
        let html = '';

        for (const [city, dists] of Object.entries(TAIWAN_REGIONS)) {
            html += `<div class="border border-gray-200 rounded-xl p-3 bg-gray-50/50">
                <div class="font-bold text-gray-800 border-b pb-1 mb-2 flex items-center justify-between">
                    <span>📍 ${city}</span>
                    <button type="button" onclick="window.app.toggleCityAll('${city}')" class="text-xs text-blue-600 hover:underline">全選該縣市</button>
                </div>
                <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">`;
            
            dists.forEach(dist => {
                const isChecked = selectedRegionsTemp.includes(dist) || selectedRegionsTemp.includes(city) || selectedRegionsTemp.includes(`${city}${dist}`);
                html += `<label class="flex items-center gap-1.5 cursor-pointer bg-white p-1.5 rounded border hover:bg-green-50 text-xs">
                    <input type="checkbox" value="${dist}" data-city="${city}" ${isChecked ? 'checked' : ''} onchange="window.app.handleRegionCheck(this)" class="accent-green-600">
                    <span class="truncate">${dist}</span>
                </label>`;
            });
            html += `</div></div>`;
        }
        body.innerHTML = html;
        document.getElementById('regionModal').classList.remove('hidden');
    },

    closeRegionModal: function() { document.getElementById('regionModal').classList.add('hidden'); },

    handleRegionCheck: function(cb) {
        const val = cb.value;
        if (cb.checked) {
            if (!selectedRegionsTemp.includes(val)) selectedRegionsTemp.push(val);
        } else {
            selectedRegionsTemp = selectedRegionsTemp.filter(r => r !== val);
        }
    },

    toggleCityAll: function(city) {
        const dists = TAIWAN_REGIONS[city] || [];
        const allChecked = dists.every(d => selectedRegionsTemp.includes(d));
        dists.forEach(d => {
            if (allChecked) {
                selectedRegionsTemp = selectedRegionsTemp.filter(r => r !== d);
            } else {
                if (!selectedRegionsTemp.includes(d)) selectedRegionsTemp.push(d);
            }
        });
        this.openRegionModal(); // 重新渲染 modal
    },

    clearSelectedRegions: function() {
        selectedRegionsTemp = [];
        this.openRegionModal();
    },

    confirmRegionSelection: function() {
        selectedRegionsConfirmed = [...selectedRegionsTemp];
        const btnText = document.getElementById('selectedRegionText');
        if (selectedRegionsConfirmed.length === 0) {
            btnText.innerText = "全部縣市/區域";
        } else {
            btnText.innerText = `已選 ${selectedRegionsConfirmed.length} 個區域: ${selectedRegionsConfirmed.join(', ')}`;
        }
        this.closeRegionModal();
        this.renderCases();
    },

    // 🏷️ 屬性 Modal 邏輯
    openZoningModal: function() {
        selectedZoningsTemp = [...selectedZoningsConfirmed];
        const body = document.getElementById('zoningModalBody');
        let html = '';

        for (const [cat, items] of Object.entries(ZONING_CATEGORIES)) {
            html += `<div class="border border-gray-200 rounded-xl p-3 bg-gray-50/50">
                <div class="font-bold text-gray-800 border-b pb-1 mb-2">🏷️ ${cat}</div>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">`;
            
            items.forEach(item => {
                const isChecked = selectedZoningsTemp.includes(item);
                html += `<label class="flex items-center gap-1.5 cursor-pointer bg-white p-2 rounded border hover:bg-blue-50 text-xs">
                    <input type="checkbox" value="${item}" ${isChecked ? 'checked' : ''} onchange="window.app.handleZoningCheck(this)" class="accent-blue-600">
                    <span>${item}</span>
                </label>`;
            });
            html += `</div></div>`;
        }
        body.innerHTML = html;
        document.getElementById('zoningModal').classList.remove('hidden');
    },

    closeZoningModal: function() { document.getElementById('zoningModal').classList.add('hidden'); },

    handleZoningCheck: function(cb) {
        const val = cb.value;
        if (cb.checked) {
            if (!selectedZoningsTemp.includes(val)) selectedZoningsTemp.push(val);
        } else {
            selectedZoningsTemp = selectedZoningsTemp.filter(z => z !== val);
        }
    },

    clearSelectedZonings: function() {
        selectedZoningsTemp = [];
        this.openZoningModal();
    },

    confirmZoningSelection: function() {
        selectedZoningsConfirmed = [...selectedZoningsTemp];
        const btnText = document.getElementById('selectedZoningText');
        if (selectedZoningsConfirmed.length === 0) {
            btnText.innerText = "全部類型/分區";
        } else {
            btnText.innerText = `已選 ${selectedZoningsConfirmed.length} 個屬性: ${selectedZoningsConfirmed.join(', ')}`;
        }
        this.closeZoningModal();
        this.renderCases();
    },

    // 591 概念過濾演算法
    getFilteredCases: function() {
        const keyword = document.getElementById('filterKeyword').value.toLowerCase();
        const fMin = parseFloat(document.getElementById('filterPriceMin').value) || 0;
        const fMax = parseFloat(document.getElementById('filterPriceMax').value) || Infinity;

        return casesData.filter(c => {
            const price = parseFloat(c.totalPrice) || 0;
            const matchKey = (c.name||'').toLowerCase().includes(keyword) || 
                             (c.address||'').toLowerCase().includes(keyword) ||
                             (c.agent||'').toLowerCase().includes(keyword);

            // 區域多選比對 (若完全沒勾選視為「不限區域」)
            const matchRegion = selectedRegionsConfirmed.length === 0 || 
                                selectedRegionsConfirmed.some(reg => (c.region || '').includes(reg) || (c.address || '').includes(reg));

            // 屬性多選比對 (若完全沒勾選視為「不限屬性」)
            const matchZoning = selectedZoningsConfirmed.length === 0 || 
                                selectedZoningsConfirmed.some(zon => (c.zoning || '').includes(zon));

            const matchPrice = price >= fMin && price <= fMax;

            return matchKey && matchRegion && matchZoning && matchPrice;
        }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    },

    renderCases: function() {
        const filtered = this.getFilteredCases();
        const container = document.getElementById('casesList');
        document.getElementById('totalCount').innerText = filtered.length;

        if (filtered.length === 0) {
            container.innerHTML = `<div class="col-span-full text-center py-12 text-gray-400"><i class="fas fa-search text-3xl mb-2"></i><p>找不到符合條件的案件</p></div>`; 
            return;
        }

        container.innerHTML = filtered.map(item => `
            <div class="border border-gray-200 rounded-2xl overflow-hidden hover:shadow-md bg-white flex flex-col transition">
                ${item.photos && item.photos.length > 0 
                    ? `<div class="h-48 overflow-hidden relative"><img src="${item.photos[0]}" class="w-full h-full object-cover"></div>` 
                    : `<div class="h-20 bg-blue-50 flex items-center justify-center"><i class="fas fa-home text-3xl text-blue-200"></i></div>`
                }
                <div class="p-5 flex-grow">
                    <h3 class="text-lg font-bold text-gray-900">${item.name}</h3>
                    <p class="text-sm text-gray-500 mb-2">${item.region || '無區域'} | <span class="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs">${item.zoning || '一般'}</span></p>
                    <p class="text-sm font-semibold mb-3">總價: <span class="text-red-600 text-lg">${item.totalPrice || '-'} 萬</span></p>
                    
                    <div class="flex gap-1 bg-gray-50 p-1 rounded-lg border border-gray-100 mb-3 justify-center">
                        <button onclick='window.app.exportSingleExcel(${JSON.stringify(item).replace(/'/g, "'")})' class="p-1.5 text-green-600 hover:bg-green-100 rounded" title="匯出 Excel"><i class="fas fa-file-excel"></i></button>
                        <button onclick='window.app.exportSinglePDF(${JSON.stringify(item).replace(/'/g, "'")})' class="p-1.5 text-rose-500 hover:bg-rose-100 rounded" title="匯出 PDF"><i class="fas fa-file-pdf"></i></button>
                        <div class="w-px bg-gray-200 mx-1"></div>
                        <button onclick='window.app.editCase("${item.id}")' class="p-1.5 text-blue-500 hover:bg-blue-100 rounded" title="編輯"><i class="fas fa-edit"></i></button>
                        <button onclick='window.app.deleteCase("${item.id}")' class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded" title="刪除"><i class="fas fa-trash"></i></button>
                    </div>

                    <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-600 bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                        <div><span class="text-xs text-gray-400 block">單價</span><span>${item.unitPrice || '-'}</span></div>
                        <div><span class="text-xs text-gray-400 block">地坪 / 建坪</span><span>${item.landArea || '-'} / ${item.buildArea || '-'}</span></div>
                        <div class="col-span-2"><span class="text-xs text-gray-400 block">門牌號碼</span><span class="break-all">${item.address || '-'}</span></div>
                    </div>
                </div>
            </div>
        `).join('');
    },

    resetFilters: function() {
        document.getElementById('filterKeyword').value = '';
        document.getElementById('filterPriceMin').value = '';
        document.getElementById('filterPriceMax').value = '';
        selectedRegionsConfirmed = [];
        selectedZoningsConfirmed = [];
        document.getElementById('selectedRegionText').innerText = "全部縣市/區域";
        document.getElementById('selectedZoningText').innerText = "全部類型/分區";
        this.renderCases();
    },

    // ---------------- 儲存、編輯與刪除 ----------------
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
            console.error(error);
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
            } catch (err) { alert('刪除失敗'); } 
            finally { document.getElementById('loading').style.display = 'none'; }
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
            container.innerHTML = ''; return;
        }
        container.innerHTML = `
            <div class="my-4 p-3 border rounded-xl bg-gray-50 border-gray-200">
                <p class="text-xs font-semibold text-gray-600 mb-2">已上傳的檔案 (點擊 X 刪除)：</p>
                <div class="flex flex-wrap gap-3">
                    ${currentExistingPhotos.map((url, idx) => `
                        <div class="relative group w-16 h-16 border border-gray-200 rounded-lg overflow-hidden bg-white">
                            <img src="${url}" class="w-full h-full object-cover">
                            <button type="button" onclick="window.app.removeExistingPhoto(${idx})" class="absolute top-0 right-0 bg-red-600 text-white p-1 text-xs hover:bg-red-700"><i class="fas fa-times"></i></button>
                        </div>
                    `).join('')}
                    ${currentExistingPdfs.map((pdf, idx) => `
                        <div class="relative group h-16 px-2 border border-gray-200 rounded-lg bg-white flex flex-col items-center justify-center text-center max-w-[80px]">
                            <i class="fas fa-file-pdf text-red-500 text-xl mb-1"></i>
                            <span class="text-[10px] text-gray-500 truncate w-full" title="${pdf.name}">${pdf.name}</span>
                            <button type="button" onclick="window.app.removeExistingPdf(${idx})" class="absolute top-0 right-0 bg-red-600 text-white p-1 text-xs hover:bg-red-700"><i class="fas fa-times"></i></button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    removeExistingPhoto: function(index) { currentExistingPhotos.splice(index, 1); this.renderExistingFilesUI(); },
    removeExistingPdf: function(index) { currentExistingPdfs.splice(index, 1); this.renderExistingFilesUI(); },

    // ---------------- 單一與總表匯出 ----------------
    exportSinglePDF: function(c) {
        this.logAction('匯出單一 PDF', c.name);
        document.getElementById('loading').style.display = 'flex';
        const element = document.createElement('div');
        element.innerHTML = `
            <div style="font-family: 'Microsoft JhengHei', sans-serif; padding: 20px;">
                <h1 style="text-align: center; color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px;">${c.name} - 案件資料</h1>
                <table style="width:100%; border-collapse: collapse; margin-top:20px; font-size:14px;">
                    <tr><td style="border:1px solid #ccc; padding:8px; background:#f9fafb;">門牌地址</td><td colspan="3" style="border:1px solid #ccc; padding:8px;">${c.address || '未提供'}</td></tr>
                    <tr>
                        <td style="border:1px solid #ccc; padding:8px; background:#f9fafb;">總價(萬)</td><td style="border:1px solid #ccc; padding:8px; color:red; font-weight:bold;">${c.totalPrice || '-'}</td>
                        <td style="border:1px solid #ccc; padding:8px; background:#f9fafb;">地坪/建坪</td><td style="border:1px solid #ccc; padding:8px;">${c.landArea || '-'} / ${c.buildArea || '-'}</td>
                    </tr>
                </table>
                ${c.address ? `<div style="margin-top:20px;"><h3 style="border-bottom: 1px solid #eee; padding-bottom: 5px;">📍 案件位置圖</h3><iframe width="100%" height="250" frameborder="0" style="border:0; border-radius:8px;" src="https://maps.google.com/maps?q=${encodeURIComponent(c.address)}&t=&z=16&ie=UTF8&iwloc=&output=embed"></iframe></div>` : ''}
                ${c.photos && c.photos.length > 0 ? `<div style="margin-top:20px;"><h3 style="border-bottom: 1px solid #eee; padding-bottom: 5px;">📷 案件照片</h3><div style="display: flex; flex-wrap:wrap; gap: 10px;">${c.photos.map(p => `<img src="${p}" style="width: 48%; height: 200px; object-fit: cover; border-radius: 8px;">`).join('')}</div></div>` : ''}
            </div>
        `;
        const opt = { margin: 10, filename: `${c.name}_案件資料表.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true, allowTaint: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
        html2pdf().set(opt).from(element).save().then(() => { document.getElementById('loading').style.display = 'none'; });
    },

    exportSingleExcel: function(c) {
        this.logAction('匯出單一 Excel', c.name);
        const fields = [
            ['欄位', '內容'], ['案名', c.name], ['進件日期', c.date], ['區域', c.region], ['門牌號碼', c.address],
            ['地籍資料', c.cadastral], ['分區/屬性', c.zoning], ['使用狀況', c.status], ['地坪(坪)', c.landArea], ['建坪(坪)', c.buildArea], 
            ['面寬(米)', c.width], ['縱深(米)', c.depth], ['建照號碼', c.buildLicense], ['使照號碼', c.useLicense],
            ['土地單價', c.unitPrice], ['總價(萬)', c.totalPrice], ['專員', c.agent], ['備註', c.notes]
        ];
        let csvContent = '\uFEFF' + fields.map(e => e.map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${c.name || '案件資料'}_詳細資料.csv`; link.click();
    },

    exportToExcel: function() {
        const filtered = this.getFilteredCases();
        if (filtered.length === 0) return alert('目前沒有資料可以匯出');
        this.logAction('匯出總表 Excel', `共 ${filtered.length} 筆`);
        
        const headers = ['進件日期', '區域', '案名', '地籍資料', '屬性/分區', '使用狀況', '地坪', '建坪', '土地單價(萬)', '總價(萬)', '面寬(米)', '縱深(米)', '門牌號碼', '建照號碼', '使照號碼', '專員', '備註'];
        let csvRows = [headers.join(',')];
        
        filtered.forEach(c => {
            const row = [ c.date, c.region, c.name, c.cadastral, c.zoning, c.status, c.landArea, c.buildArea, c.unitPrice, c.totalPrice, c.width, c.depth, c.address, c.buildLicense, c.useLicense, c.agent, c.notes ];
            csvRows.push(row.map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(','));
        });

        const csvContent = '\uFEFF' + csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `不動產案件總表_${new Date().toLocaleDateString('zh-TW')}.csv`; link.click();
    },

    exportToPDF: function() {
        const filtered = this.getFilteredCases();
        if (filtered.length === 0) return alert('目前沒有資料可以匯出');
        this.logAction('匯出總表 PDF', `共 ${filtered.length} 筆`);
        
        let printContent = `
            <html><head><title>不動產案件總表</title>
            <style>
                body { font-family: 'Microsoft JhengHei', sans-serif; padding: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
                th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
                th { background-color: #f3f4f6; }
            </style></head><body>
            <h2 style="text-align: center; color: #1e3a8a;">不動產案件總表</h2>
            <div style="text-align: right; font-size: 12px; color: #666;">列印日期：${new Date().toLocaleDateString('zh-TW')}</div>
            <table><thead><tr><th>區域</th><th>案名</th><th>總價(萬)</th><th>屬性</th><th>地坪/建坪</th><th>專員</th><th>進件日期</th></tr></thead><tbody>
        `;
        filtered.forEach(c => {
            printContent += `<tr><td>${c.region || '-'}</td><td>${c.name || '-'}</td><td style="color:red; font-weight:bold;">${c.totalPrice || '-'}</td><td>${c.zoning || '-'}</td><td>${c.landArea || '-'}/${c.buildArea || '-'}</td><td>${c.agent || '-'}</td><td>${c.date || '-'}</td></tr>`;
        });
        printContent += `</tbody></table></body></html>`;
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        setTimeout(() => { printWindow.focus(); printWindow.print(); printWindow.close(); }, 500);
    }
};