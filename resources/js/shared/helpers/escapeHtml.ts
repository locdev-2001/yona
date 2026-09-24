const HTML_ENTITIES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
};

/** Chữ do người dùng/kênh cấp chèn vào chuỗi HTML (tô sáng kết quả tìm) phải qua đây. */
export function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, char => HTML_ENTITIES[char]);
}
