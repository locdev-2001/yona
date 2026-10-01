type ClassValue = string | false | null | undefined;

const SIZES = '(?:xs|sm|base|lg|xl|[2-9]xl)';
const DISPLAY = new Set(['block', 'inline-block', 'inline', 'flex', 'inline-flex', 'grid', 'inline-grid', 'hidden', 'contents', 'table']);
const POSITION = new Set(['static', 'fixed', 'absolute', 'relative', 'sticky']);

// Nhóm xung đột của một utility (không tính tiền tố biến thể); null = không gộp.
function conflictGroup(utility: string): string | null {
    const base = utility.replace(/^!/, '');
    if (DISPLAY.has(base)) return 'display';
    if (POSITION.has(base)) return 'position';
    if (/^flex-(row|col)(-reverse)?$/.test(base)) return 'flex-direction';
    if (/^text-(left|center|right|justify|start|end)$/.test(base)) return 'text-align';
    if (new RegExp(`^text-${SIZES}$`).test(base) || /^text-\[\d/.test(base)) return 'font-size';
    if (/^text-/.test(base)) return 'text-color';
    if (/^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/.test(base)) return 'font-weight';
    if (/^bg-(?!gradient|clip|origin|fixed|local|scroll|repeat|no-repeat|cover|contain|center|top|bottom|left|right|blend)/.test(base)) return 'bg';
    if (/^rounded(-(none|sm|md|lg|xl|2xl|3xl|full))?$/.test(base)) return 'rounded';
    if (/^shadow(-(sm|md|lg|xl|2xl|none|inner))?$/.test(base)) return 'shadow';
    if (/^border(-[0248])?$/.test(base)) return 'border-width';
    if (/^border-(?!(?:x|y|t|r|b|l|s|e)(?:-|$)|solid|dashed|dotted|double|none|collapse|separate|spacing)/.test(base)) return 'border-color';

    const prefix = /^-?(p[xytrblse]?|m[xytrblse]?|gap(?:-[xy])?|size|min-w|min-h|max-w|max-h|w|h|items|justify|self|overflow(?:-[xy])?|whitespace|inset(?:-[xy])?|top|right|bottom|left|z|opacity|leading|tracking)-/.exec(base);

    return prefix ? prefix[1] : null;
}

// Nối class; utility truyền sau thắng utility cùng nhóm truyền trước (vd. `py-0`
// đè `py-5` của Card), cùng tiền tố biến thể (`sm:`, `hover:`…) mới tính là trùng.
export function cn(...classes: ClassValue[]): string {
    const tokens = classes.filter(Boolean).join(' ').split(/\s+/).filter(Boolean);
    const seen = new Set<string>();
    const kept: string[] = [];

    for (let index = tokens.length - 1; index >= 0; index--) {
        const token = tokens[index];
        const separator = token.lastIndexOf(':');
        const variant = separator === -1 ? '' : token.slice(0, separator + 1);
        const group = conflictGroup(token.slice(separator + 1));
        const key = group === null ? `=${token}` : `${variant}${group}`;

        if (seen.has(key)) continue;
        seen.add(key);
        kept.push(token);
    }

    return kept.reverse().join(' ');
}
