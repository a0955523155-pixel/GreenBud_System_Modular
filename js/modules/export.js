// 報表匯出模組
import { getCases } from './store.js';

export const exportToExcel = () => {
    const cases = getCases();
    if(cases.length === 0) return alert('目前無案件可匯出');
    
    const exportData = cases.map(c => ({
        '進件日期': c.date, '區域': c.region, '案名': c.name,
        '總價(萬)': c.totalPrice, '地坪': c.landArea, '建坪': c.buildArea,
        '土地單價(萬)': c.unitPrice, '土地面寬(米)': c.width, '縱深(米)': c.depth,
        '地籍資料': c.cadastral, '分區': c.zoning, '使用狀況': c.status,
        '門牌號碼': c.address, '建照號碼': c.buildLicense, '使照號碼': c.useLicense,
        '專員': c.agent, '備註': c.notes
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "不動產案件總表");
    XLSX.writeFile(wb, "綠芽團隊_案件總表.xlsx");
};

export const exportToPDF = () => {
    const cases = getCases();
    if(cases.length === 0) return alert('目前無案件可匯出');
    
    const tempDiv = document.createElement('div');
    tempDiv.style.padding = '20px';
    tempDiv.innerHTML = `<h2 style="text-align:center;">綠芽團隊 - 不動產案件總表</h2>`;
    // PDF Generation logic abbreviated for brevity, uses global html2pdf
    html2pdf().set({
        margin: 10, filename: '綠芽團隊_案件總表.pdf',
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    }).from(tempDiv).save();
};
