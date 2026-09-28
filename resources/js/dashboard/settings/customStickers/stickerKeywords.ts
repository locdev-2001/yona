// Từ khoá sticker nhập dạng một chuỗi cách nhau dấu phẩy: bỏ khoảng trắng thừa, bỏ
// ô rỗng và bỏ từ lặp (không phân biệt hoa thường), giữ thứ tự người nhập.
export function parseKeywordInput(text: string): string[] {
    const seen = new Set<string>();

    return text
        .split(',')
        .map(keyword => keyword.replace(/\s+/g, ' ').trim())
        .filter(keyword => {
            const key = keyword.toLocaleLowerCase('vi');
            if (!keyword || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
}

export function formatKeywords(keywords: readonly string[]): string {
    return keywords.join(', ');
}
