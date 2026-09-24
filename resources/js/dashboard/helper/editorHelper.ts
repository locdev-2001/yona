import {
    MessageMarkdownSerializer,
    MessageMarkdownTransformer,
    messageSchema,
} from '@ext/prosemirror-schema';
import type { Schema } from 'prosemirror-model';

// Port từ dashboard/helper/editorHelper.js + constants/editor.js
// (phần chữ ký + strip formatting mà ReplyBox/Editor cần).

export const SIGNATURE_DELIMITER = '--';

interface MarkdownPattern {
    type: string;
    patterns: { pattern: RegExp; replacement: string }[];
}

export const MARKDOWN_PATTERNS: MarkdownPattern[] = [
    { type: 'codeBlock', patterns: [{ pattern: /`{3}(?:\w+)?\n?([\s\S]*?)`{3}/g, replacement: '$1' }] },
    { type: 'blockquote', patterns: [{ pattern: /^> ?/gm, replacement: '' }] },
    { type: 'bulletList', patterns: [{ pattern: /^[\t ]*[-*+]\s+/gm, replacement: '' }] },
    { type: 'orderedList', patterns: [{ pattern: /^[\t ]*\d+[.)]\s+/gm, replacement: '' }] },
    { type: 'heading', patterns: [{ pattern: /^#{1,6}\s+/gm, replacement: '' }] },
    { type: 'horizontalRule', patterns: [{ pattern: /^(?:---|___|\*\*\*)\s*$/gm, replacement: '' }] },
    { type: 'image', patterns: [{ pattern: /!\[([^\]]*)\]\([^)]+\)/g, replacement: '$1' }] },
    {
        type: 'hardBreak',
        patterns: [
            { pattern: /\\\n/g, replacement: '\n' },
            { pattern: / {2,}\n/g, replacement: '\n' },
        ],
    },
    {
        type: 'strong',
        patterns: [
            { pattern: /\*\*(.+?)\*\*/g, replacement: '$1' },
            { pattern: /__(.+?)__/g, replacement: '$1' },
        ],
    },
    {
        type: 'em',
        patterns: [
            { pattern: /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, replacement: '$1' },
            { pattern: /(?<=^|[\s])_([^_\s][^_]*[^_\s]|[^_\s])_(?=$|[\s])/g, replacement: '$1' },
        ],
    },
    { type: 'strike', patterns: [{ pattern: /~~(.+?)~~/g, replacement: '$1' }] },
    { type: 'code', patterns: [{ pattern: /`([^`]+)`/g, replacement: '$1' }] },
    { type: 'link', patterns: [{ pattern: /\[([^\]]+)\]\([^)]+\)/g, replacement: '$1' }] },
];

// FORMATTING theo kênh (constants/editor.js).
export const FORMATTING: Record<string, { marks: string[]; nodes: string[] }> = {
    'Channel::Api': { marks: ['strong', 'em'], nodes: [] },
    // Cho phép định dạng nhưng KHÔNG hiện thanh công cụ (menu rỗng).
    'Context::NoToolbar': { marks: ['strong', 'em', 'link'], nodes: ['bulletList', 'orderedList'] },
    'Context::PrivateNote': {
        marks: ['strong', 'em', 'code', 'link', 'strike'],
        nodes: ['bulletList', 'orderedList', 'codeBlock', 'blockquote'],
    },
    'Context::Default': {
        marks: ['strong', 'em', 'code', 'link', 'strike'],
        nodes: ['bulletList', 'orderedList', 'codeBlock', 'blockquote'],
    },
};

const snakeToCamel = (value: string): string => value.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

export function stripUnsupportedFormatting(content: string, schema: Schema): string {
    if (!content) return content;

    const supportedMarks = Object.keys(schema.marks || {});
    const supportedNodes = Object.keys(schema.nodes || {}).map(snakeToCamel);

    let sanitizedContent = content;
    MARKDOWN_PATTERNS.forEach(({ type, patterns }) => {
        if (!supportedMarks.includes(type) && !supportedNodes.includes(type)) {
            patterns.forEach(({ pattern, replacement }) => {
                sanitizedContent = sanitizedContent.replace(pattern, replacement);
            });
        }
    });

    return sanitizedContent;
}

export function stripUnsupportedMarkdown(markdown: string, channelType: string, cleanWhitespace = true): string {
    if (!markdown) return '';

    const { marks = [], nodes = [] } = FORMATTING[channelType] || {};
    const supported = [...marks, ...nodes];

    const result = MARKDOWN_PATTERNS.reduce((text, { type, patterns }) => {
        if (supported.includes(type)) return text;
        return patterns.reduce((current, { pattern, replacement }) => current.replace(pattern, replacement), text);
    }, markdown);

    if (!cleanWhitespace) return result;

    return result
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .join('\n')
        .replace(/\n{2,}/g, '\n')
        .trim();
}

export function extractTextFromMarkdown(markdown: string): string {
    if (!markdown) return '';
    return markdown
        .replace(/```[\s\S]*?```/g, '')
        .replace(/`.*?`/g, '')
        .replace(/!\[.*?\]\(.*?\)/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/#+\s*|[*_-]{1,3}/g, '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .join('\n')
        .replace(/\n{2,}/g, '\n')
        .trim();
}

export function cleanSignature(signature: string): string {
    try {
        const withoutRules = signature
            .replace(/^( *\* *){3,} *$/gm, '')
            .replace(/^( *- *){3,} *$/gm, '')
            .replace(/^( *_ *){3,} *$/gm, '');

        const nodes = new MessageMarkdownTransformer(messageSchema).parse(withoutRules);
        return MessageMarkdownSerializer.serialize(nodes);
    } catch {
        return signature;
    }
}

const stripDelimiterHardbreaks = (body: string): string => body.replace(/(--)\s*(?:\\\s*)+$/, '$1');
const stripTrailingBlankLine = (body: string): string => body.replace(/\n(?:\s*\\\n)+$/, '');

export function findSignatureInBody(body: string, signature: string): number {
    const trimmedBody = body.trimEnd();
    const cleanedSignature = cleanSignature(signature);

    if (trimmedBody.endsWith(cleanedSignature)) {
        return body.lastIndexOf(cleanedSignature);
    }

    return -1;
}

export function appendSignature(body: string, signature: string, channelType?: string): string {
    const preparedSignature = channelType ? stripUnsupportedMarkdown(signature, channelType) : signature;
    const cleanedSignature = cleanSignature(preparedSignature);

    if (findSignatureInBody(body, cleanedSignature) > -1) {
        return body;
    }

    return `${body.trimEnd()}\n\n${SIGNATURE_DELIMITER}\n\n${cleanedSignature}`;
}

export function removeSignature(body: string, signature: string, channelType?: string): string {
    const channelStripped = channelType ? cleanSignature(stripUnsupportedMarkdown(signature, channelType)) : null;
    const signaturesToTry = [
        cleanSignature(signature),
        channelStripped,
        cleanSignature(extractTextFromMarkdown(signature)),
    ].filter((sig, index, all): sig is string => Boolean(sig) && all.indexOf(sig) === index);

    const signatureIndex = signaturesToTry.reduce(
        (found, sig) => (found === -1 ? findSignatureInBody(body, sig) : found),
        -1,
    );

    let newBody = body;

    if (signatureIndex > -1) {
        newBody = stripDelimiterHardbreaks(newBody.substring(0, signatureIndex)).trimEnd();
    }

    if (newBody.endsWith(SIGNATURE_DELIMITER)) {
        newBody = newBody.slice(0, -SIGNATURE_DELIMITER.length);
        if (signatureIndex > -1) {
            newBody = stripTrailingBlankLine(newBody);
        }
    }

    return newBody;
}
