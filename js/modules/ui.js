// UI 渲染與表單控制模組
import { getCases } from './store.js';

export const renderCases = () => {
    const list = document.getElementById('casesList');
    const keyword = document.getElementById('searchInput').value.toLowerCase();
    list.innerHTML = '';

    let cases = getCases();
    let filteredCases = cases.filter(c => {
        const searchStr = `${c.name} ${c.region} ${c.address} ${c.agent} ${c.notes}`.toLowerCase();
        return searchStr.includes(keyword);
    });
    filteredCases.sort((a, b) => a.region.localeCompare(b.region, 'zh-TW'));

    if (filteredCases.length === 0) {
        list.innerHTML = '<div class="text-center text-gray-400 py-10">無符合案件</div>';
        return;
    }

    filteredCases.forEach(c => {
        let photosHtml = c.photos?.length ? `<div class="flex gap-2 mt-2 overflow-x-auto">${c.photos.map(p => `<img src="${p.data}" class="h-20 w-auto object-cover border rounded">`).join('')}</div>` : '';
        let pdfsHtml = c.pdfs?.length ? `<div class="mt-2 flex gap-2">${c.pdfs.map(p => `<a href="${p.data}" download="${p.name}" class="text-xs bg-red-50 text-red-600 px-2 py-1 border rounded">📎 ${p.name}</a>`).join('')}</div>` : '';

        list.innerHTML += `
            <div class="bg-white p-5 rounded-lg shadow border-l-4 border-blue-500 relative">
                <div class="absolute top-4 right-4">
                    <button onclick="window.app.triggerEdit('${c.id}')" class="text-yellow-600 mr-2">✏️</button>
                    <button onclick="window.app.triggerDelete('${c.id}')" class="text-red-600">🗑️</button>
                </div>
                <div class="font-bold text-lg mb-2"><span class="bg-blue-100 text-blue-800 px-2 rounded text-sm mr-2">${c.region}</span>${c.name}</div>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-600">
                    <div>總價: <span class="font-bold text-red-600">${c.totalPrice}萬</span></div>
                    <div>地坪/建坪: ${c.landArea||'-'} / ${c.buildArea||'-'}</div>
                    <div>專員: ${c.agent||'-'}</div>
                    <div>地址: ${c.address||'-'}</div>
                    <div>建照: ${c.buildLicense||'-'}</div>
                    <div>使照: ${c.useLicense||'-'}</div>
                    <div class="col-span-full">備註: ${c.notes||'-'}</div>
                </div>
                ${photosHtml}
                ${pdfsHtml}
            </div>
        `;
    });
};
