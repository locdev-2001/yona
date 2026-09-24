const COMBINING_MARKS = /[̀-ͯ]/g;

/**
 * Dạng so khớp của một chuỗi: bỏ dấu tiếng Việt, đ → d, chữ thường. Phải ra đúng
 * như hàm SQL `search_fold` để kết quả tô sáng khớp với kết quả tìm của máy chủ —
 * cả hai cùng kiểm bằng `searchFold.cases.json`.
 */
export function foldSearchText(text: string): string {
    return text.normalize('NFD').replace(COMBINING_MARKS, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}

export interface HighlightSegment {
    text: string;
    match: boolean;
}

interface FoldedText {
    folded: string;
    /** Vị trí [đầu, cuối) trong chuỗi gốc của từng đơn vị UTF-16 trong `folded`. */
    origins: Array<[number, number]>;
}

function foldWithOrigins(text: string): FoldedText {
    let folded = '';
    const origins: Array<[number, number]> = [];
    let offset = 0;

    for (const char of Array.from(text)) {
        const foldedChar = foldSearchText(char);
        const end = offset + char.length;

        if (foldedChar === '' && origins.length > 0) {
            // Dấu kết hợp đứng rời (chuỗi NFD) thuộc về ký tự trước nó.
            origins[origins.length - 1][1] = end;
        }

        for (let unit = 0; unit < foldedChar.length; unit++) {
            origins.push([offset, end]);
        }

        folded += foldedChar;
        offset = end;
    }

    return { folded, origins };
}

/** Cắt `text` thành các đoạn khớp / không khớp với `query`, so khớp không dấu. */
export function highlightSegments(text: string, query: string): HighlightSegment[] {
    const needle = foldSearchText(query.trim());

    if (needle === '') {
        return [{ text, match: false }];
    }

    const { folded, origins } = foldWithOrigins(text);
    const segments: HighlightSegment[] = [];
    let cursor = 0;
    let searchFrom = 0;

    for (let at = folded.indexOf(needle); at !== -1; at = folded.indexOf(needle, searchFrom)) {
        const start = origins[at][0];
        const end = origins[at + needle.length - 1][1];

        if (start > cursor) {
            segments.push({ text: text.slice(cursor, start), match: false });
        }

        segments.push({ text: text.slice(start, end), match: true });
        cursor = end;
        searchFrom = at + needle.length;
    }

    if (cursor < text.length || segments.length === 0) {
        segments.push({ text: text.slice(cursor), match: false });
    }

    return segments;
}
