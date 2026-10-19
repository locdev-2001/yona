// Port từ dashboard/helper/articleDiffHelper.js — so sánh bản nháp với bản đang
// đăng: theo từ ở tiêu đề, theo khối ở thân bài.
import MarkdownIt from 'markdown-it';

import { escapeHtml } from 'shared/helpers/escapeHtml';

const commonmark = MarkdownIt('commonmark');

export const rendersIdentically = (a?: string | null, b?: string | null): boolean =>
    commonmark.render(a ?? '') === commonmark.render(b ?? '');

const INS_CLASS = '!bg-n-teal-5 !text-n-teal-12 !no-underline rounded px-0.5';
const DEL_CLASS = '!bg-n-ruby-5 !text-n-ruby-12 !line-through rounded px-0.5';

const MAX_DIFF_TOKENS = 2000;

const tokenizeWords = (value?: string | null): string[] => (value || '').match(/\S+/g) || [];

type DiffOp<T> = { type: 'equal' | 'del' | 'ins'; item: T };

const diffSequence = <T,>(a: T[], b: T[], keyOf: (item: T) => unknown = item => item): DiffOp<T>[] => {
    const n = a.length;
    const m = b.length;
    if (n > MAX_DIFF_TOKENS || m > MAX_DIFF_TOKENS) {
        return [
            ...a.map(item => ({ type: 'del' as const, item })),
            ...b.map(item => ({ type: 'ins' as const, item })),
        ];
    }

    const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i -= 1) {
        for (let j = m - 1; j >= 0; j -= 1) {
            dp[i][j] = keyOf(a[i]) === keyOf(b[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
        }
    }

    const ops: DiffOp<T>[] = [];
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
        if (keyOf(a[i]) === keyOf(b[j])) {
            ops.push({ type: 'equal', item: a[i] });
            i += 1;
            j += 1;
        } else if (dp[i + 1][j] >= dp[i][j + 1]) {
            ops.push({ type: 'del', item: a[i] });
            i += 1;
        } else {
            ops.push({ type: 'ins', item: b[j] });
            j += 1;
        }
    }
    while (i < n) {
        ops.push({ type: 'del', item: a[i] });
        i += 1;
    }
    while (j < m) {
        ops.push({ type: 'ins', item: b[j] });
        j += 1;
    }

    return ops;
};

const wrapDiff: Record<string, (text: string) => string> = {
    ins: text => `<ins class="${INS_CLASS}">${text}</ins>`,
    del: text => `<del class="${DEL_CLASS}">${text}</del>`,
};

export const renderInlineDiff = (oldValue?: string | null, newValue?: string | null): string => {
    const ops = diffSequence(tokenizeWords(oldValue), tokenizeWords(newValue));

    const segments: string[] = [];
    let run: string[] = [];
    let runType: string | null = null;
    const flushRun = () => {
        if (!run.length) return;
        const text = run.map(escapeHtml).join(' ');
        segments.push(runType && wrapDiff[runType] ? wrapDiff[runType](text) : text);
        run = [];
    };

    ops.forEach(({ type, item }) => {
        if (type !== runType) flushRun();
        runType = type;
        run.push(item);
    });
    flushRun();

    return segments.join(' ');
};

const FENCE_RE = /^ {0,3}(```|~~~)/;
const LIST_ITEM_RE = /^ {0,3}(?:[-*+]|\d{1,9}[.)])(?:\s|$)/;

const splitBlocks = (text?: string | null): string[] => {
    const lines = (text || '').split('\n');
    const blocks: string[] = [];
    let buffer: string[] = [];
    let fence: string | null = null;
    let inList = false;

    const flush = () => {
        const block = buffer.join('\n');
        if (block.trim()) blocks.push(block);
        buffer = [];
        inList = false;
    };

    lines.forEach((line, index) => {
        const marker = line.match(FENCE_RE)?.[1];
        if (marker && !fence) fence = marker;
        else if (fence && line.trimStart().startsWith(fence)) fence = null;

        if (fence) {
            buffer.push(line);

            return;
        }

        if (LIST_ITEM_RE.test(line)) inList = true;

        if (line.trim() !== '') {
            buffer.push(line);

            return;
        }

        const next = lines.slice(index + 1).find(other => other.trim() !== '');
        if (inList && next && (LIST_ITEM_RE.test(next) || /^\s/.test(next))) {
            buffer.push(line);
        } else {
            flush();
        }
    });

    flush();

    return blocks;
};

const BLOCK_TYPE: Record<string, string> = { equal: 'equal', del: 'removed', ins: 'added' };

export interface DiffBlock {
    type: string;
    md: string;
}

export const buildDiffBlocks = (oldText?: string | null, newText?: string | null): DiffBlock[] => {
    const toBlocks = (text?: string | null) => splitBlocks(text).map(md => ({ md, key: commonmark.render(md) }));
    const ops = diffSequence(toBlocks(oldText), toBlocks(newText), block => block.key);

    return ops.map(op => ({ type: BLOCK_TYPE[op.type], md: op.item.md }));
};

export interface PendingChangesArticle {
    draftTitle?: string | null;
    draftContent?: string | null;
}

export const hasPendingChanges = (article?: PendingChangesArticle | null): boolean =>
    article?.draftTitle != null || article?.draftContent != null;
