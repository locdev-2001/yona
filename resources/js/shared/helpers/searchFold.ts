const COMBINING_MARKS = /[\u0300-\u036f]/g;
const WORD_SEPARATORS = /[-_./]/g;
const WHITESPACE = /\s+/;
const ONLY_WHITESPACE = /^\s*$/;

/**
 * Dạng so khớp của một chuỗi: bỏ dấu tiếng Việt, đ → d, chữ thường, - _ . / thành
 * khoảng trắng (mỗi ký tự ra đúng một ký tự). Phải ra đúng như hàm SQL
 * `search_fold` để kết quả tô sáng khớp với kết quả tìm của máy chủ — cả hai cùng
 * kiểm bằng `searchFold.cases.json`.
 */
export function foldSearchText(text: string): string {
    return text
        .normalize('NFD')
        .replace(COMBINING_MARKS, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .replace(WORD_SEPARATORS, ' ')
        .toLowerCase();
}

/** Các từ của từ khoá sau khi fold — máy chủ đòi mỗi từ có mặt, không cần liền nhau. */
export function foldedSearchWords(query: string): string[] {
    return [...new Set(foldSearchText(query).split(WHITESPACE).filter(Boolean))];
}

/**
 * Mức liên quan của một chuỗi đã khớp, số nhỏ đứng trước: cả cụm từ khoá liền nhau,
 * mỗi từ đứng trọn → đủ các từ đứng trọn nhưng rời nhau hoặc đảo thứ tự → còn lại
 * (có từ chỉ là một phần của từ dài hơn). Cùng luật với SearchTerm::orderByRelevance
 * của máy chủ — hai bên kiểm chung bằng `searchRelevance.cases.json`.
 */
export const SEARCH_RELEVANCE = {
    exactPhrase: 0,
    wholeWords: 1,
    partialWords: 2,
} as const;

export type SearchRelevance = (typeof SEARCH_RELEVANCE)[keyof typeof SEARCH_RELEVANCE];

const REGEXP_SYNTAX = /[.*+?^${}()|[\]\\]/g;
const PHRASE_WORD_GAP = '\\s+';

interface CompiledSearchQuery {
    words: string[];
    phrase: RegExp;
    wholeWords: RegExp[];
}

// Một từ "đứng trọn" khi hai bên không dính chữ hay số.
function wholeWordPattern(escapedWords: string): RegExp {
    return new RegExp(`(?<![\\p{L}\\p{N}])${escapedWords}(?![\\p{L}\\p{N}])`, 'u');
}

function compileSearchQuery(query: string): CompiledSearchQuery | null {
    const words = foldedSearchWords(query);

    if (words.length === 0) return null;

    const escapedWords = words.map(word => word.replace(REGEXP_SYNTAX, '\\$&'));

    return {
        words,
        phrase: wholeWordPattern(escapedWords.join(PHRASE_WORD_GAP)),
        wholeWords: escapedWords.map(wholeWordPattern),
    };
}

// Chuỗi thiếu một từ thì null — máy chủ đã không trả dòng đó (SearchTerm::foldedMatch).
function relevanceOfFolded(folded: string, query: CompiledSearchQuery): SearchRelevance | null {
    if (!query.words.every(word => folded.includes(word))) return null;
    if (query.phrase.test(folded)) return SEARCH_RELEVANCE.exactPhrase;

    return query.wholeWords.every(pattern => pattern.test(folded))
        ? SEARCH_RELEVANCE.wholeWords
        : SEARCH_RELEVANCE.partialWords;
}

/** Mức liên quan của `text` với từ khoá; null khi `text` không chứa đủ mọi từ hoặc từ khoá rỗng. */
export function searchRelevance(text: string, query: string): SearchRelevance | null {
    const compiled = compileSearchQuery(query);

    return compiled ? relevanceOfFolded(foldSearchText(text), compiled) : null;
}

/**
 * Tìm trên danh sách đã có sẵn ở giao diện theo đúng luật của máy chủ: giữ mục chứa
 * đủ mọi từ (không dấu, không cần liền nhau hay đúng thứ tự), xếp theo mức liên quan,
 * cùng mức giữ thứ tự đầu vào. Từ khoá không còn từ nào thì trả nguyên danh sách.
 */
export function searchByRelevance<T>(items: readonly T[], query: string, textOf: (item: T) => string): T[] {
    const compiled = compileSearchQuery(query);

    if (!compiled) return [...items];

    return items
        .map((item, position) => ({ item, position, relevance: relevanceOfFolded(foldSearchText(textOf(item)), compiled) }))
        .filter((entry): entry is { item: T; position: number; relevance: SearchRelevance } => entry.relevance !== null)
        .sort((left, right) => left.relevance - right.relevance || left.position - right.position)
        .map(entry => entry.item);
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

type Range = [number, number];

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

// Mọi lần xuất hiện của từng từ trên chuỗi đã fold. Đoạn chồng nhau hoặc chỉ cách
// nhau bởi khoảng trắng gộp làm một, để "báo giá" tô liền một khối.
function foldedMatchRanges(folded: string, words: string[]): Range[] {
    const ranges: Range[] = [];

    for (const word of words) {
        for (let at = folded.indexOf(word); at !== -1; at = folded.indexOf(word, at + word.length)) {
            ranges.push([at, at + word.length]);
        }
    }

    ranges.sort((left, right) => left[0] - right[0] || left[1] - right[1]);

    return ranges.reduce<Range[]>((merged, range) => {
        const last = merged[merged.length - 1];

        if (last && (range[0] <= last[1] || ONLY_WHITESPACE.test(folded.slice(last[1], range[0])))) {
            last[1] = Math.max(last[1], range[1]);
        } else {
            merged.push([...range]);
        }

        return merged;
    }, []);
}

/** Các đoạn [đầu, cuối) trong `text` khớp một từ của `query`, so khớp không dấu. */
export function searchMatchRanges(text: string, query: string): Range[] {
    const words = foldedSearchWords(query);

    if (words.length === 0) return [];

    const { folded, origins } = foldWithOrigins(text);

    return foldedMatchRanges(folded, words).map(([start, end]) => [origins[start][0], origins[end - 1][1]]);
}

/** Cắt `text` thành các đoạn khớp / không khớp với các từ của `query`, so khớp không dấu. */
export function highlightSegments(text: string, query: string): HighlightSegment[] {
    const segments: HighlightSegment[] = [];
    let cursor = 0;

    for (const [start, end] of searchMatchRanges(text, query)) {
        if (start > cursor) {
            segments.push({ text: text.slice(cursor, start), match: false });
        }

        segments.push({ text: text.slice(start, end), match: true });
        cursor = end;
    }

    if (cursor < text.length || segments.length === 0) {
        segments.push({ text: text.slice(cursor), match: false });
    }

    return segments;
}

export const EXCERPT_LEADING_CHARS = 16;

/**
 * Đoạn trích bắt đầu ngay trước chỗ khớp đầu tiên, mở bằng "…" khi đã cắt phần
 * đầu — để dòng bị cắt vẫn thấy từ khoá. Cắt ở đầu một từ, không cắt giữa từ.
 */
export function excerptAroundFirstMatch(text: string, query: string, leadingChars = EXCERPT_LEADING_CHARS): string {
    const [firstMatch] = searchMatchRanges(text, query);

    if (!firstMatch || firstMatch[0] <= leadingChars) return text;

    const matchStart = firstMatch[0];
    const wordBreak = text.slice(matchStart - leadingChars, matchStart).search(WHITESPACE);
    const start = wordBreak === -1 ? matchStart : matchStart - leadingChars + wordBreak;

    return `…${text.slice(start).trimStart()}`;
}
