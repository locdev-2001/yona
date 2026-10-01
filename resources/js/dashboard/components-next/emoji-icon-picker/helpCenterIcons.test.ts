import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { CURATED_ICONS } from './icons';
import { iconClassFor } from './constants';

// Portal công khai là Blade, không có CSS của bảng chọn icon: nó nhúng SVG lấy từ
// file JSON dưới đây. Test giữ file khớp với CURATED_ICONS; đổi bảng thì chạy lại
// với UPDATE_HELP_CENTER_ICONS=1 để sinh lại.
const ROOT = process.cwd();
const OUTPUT = join(ROOT, 'resources/icons/help-center-icons.json');

interface IconSet {
    prefix: string;
    icons: Record<string, { body: string }>;
}

const SETS: Record<string, IconSet> = Object.fromEntries(
    ['lucide', 'simple-icons'].map(name => [
        `i-${name}-`,
        JSON.parse(readFileSync(join(ROOT, `node_modules/@iconify-json/${name}/icons.json`), 'utf8')) as IconSet,
    ]),
);

function svgBody(iconClass: string): string {
    const prefix = Object.keys(SETS).find(candidate => iconClass.startsWith(candidate));
    const body = prefix ? SETS[prefix].icons[iconClass.slice(prefix.length)]?.body : undefined;
    if (!body) throw new Error(`Không tìm thấy SVG cho ${iconClass}`);
    return body;
}

describe('icon danh mục Help Center', () => {
    it('file SVG của portal khớp bảng chọn icon', () => {
        const expected = Object.fromEntries(CURATED_ICONS.map(icon => [icon.name, svgBody(icon.icon)]));
        if (process.env.UPDATE_HELP_CENTER_ICONS) {
            writeFileSync(OUTPUT, `${JSON.stringify(expected, null, 1)}\n`);
        }

        expect(JSON.parse(readFileSync(OUTPUT, 'utf8'))).toEqual(expected);
    });

    it('giá trị đã lưu theo kiểu cũ vẫn ra icon', () => {
        expect(iconClassFor('rocket')).toBe('i-lucide-rocket');
        expect(iconClassFor('rocket-line')).toBe('i-lucide-rocket');
        expect(iconClassFor('rocket-fill')).toBe('i-lucide-rocket');
        expect(iconClassFor('i-ri-home-fill')).toBe('i-lucide-house');
        expect(iconClassFor('line-chart')).toBe('i-lucide-chart-line');
        expect(iconClassFor('khong-co')).toBe('');
    });
});
