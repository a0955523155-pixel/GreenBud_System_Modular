// 管理資料狀態模組
let cases = [];

export const getCases = () => cases;

export const setCases = (newCases) => {
    cases = newCases;
};

export const addCase = (caseData) => {
    cases.push(caseData);
};

export const updateCase = (id, updatedData) => {
    const index = cases.findIndex(c => c.id === id);
    if (index !== -1) {
        cases[index] = updatedData;
    }
};

export const deleteCase = (id) => {
    cases = cases.filter(c => c.id !== id);
};

export const getCaseById = (id) => {
    return cases.find(c => c.id === id);
};
