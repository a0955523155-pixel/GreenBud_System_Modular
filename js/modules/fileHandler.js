// 處理檔案轉換模組
export const processFiles = (files) => {
    return Promise.all(Array.from(files).map(file => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve({ name: file.name, data: e.target.result, type: file.type });
            reader.readAsDataURL(file);
        });
    }));
};
