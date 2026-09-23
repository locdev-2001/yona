import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// Class icon `i-<bộ>-<tên>` chỉ ra CSS khi bộ đó được nạp trong getIconCollections
// của cấu hình Tailwind. Thiếu bộ thì build vẫn xanh, còn nút dùng icon đó hiện
// trống — nút phát tin ghi âm từng trống như vậy vì thiếu bộ teenyicons.
const ROOT = process.cwd();

function iconCollections(configFile: string): string[] {
    const source = readFileSync(join(ROOT, configFile), 'utf8');
    const block = source.match(/getIconCollections\(\[([\s\S]*?)\]\)/);
    const names = [...(block?.[1] ?? '').matchAll(/'([a-z0-9-]+)'/g)].map(match => match[1]);
    // Bộ tự vẽ của repo (theme/icons) khai thẳng trong collections, không qua getIconCollections.
    return /woot:\s*\{\s*icons\s*\}/.test(source) ? ['woot', ...names] : names;
}

function sourceFiles(dir: string, skip: string[]): string[] {
    return readdirSync(join(ROOT, dir)).flatMap(name => {
        const path = join(dir, name);
        if (skip.some(prefix => path.startsWith(prefix))) return [];
        if (statSync(join(ROOT, path)).isDirectory()) return sourceFiles(path, skip);
        return /\.(tsx?|jsx?)$/.test(name) && !/\.test\./.test(name) ? [path] : [];
    });
}

function unknownIcons(files: string[], collections: string[]): string[] {
    const unknown = new Set<string>();
    for (const file of files) {
        for (const [token] of readFileSync(join(ROOT, file), 'utf8').matchAll(/(?<![\w-])i-[a-z0-9]+(?:-[a-z0-9]+)+/g)) {
            if (!collections.some(collection => token.startsWith(`i-${collection}-`))) {
                unknown.add(`${relative(ROOT, join(ROOT, file))}: ${token}`);
            }
        }
    }
    return [...unknown];
}

describe('mọi class icon đều thuộc một bộ icon đã nạp', () => {
    it('dashboard', () => {
        const files = sourceFiles('resources/js', ['resources/js/landing', 'resources/js/i18n/generated']);

        expect(unknownIcons(files, iconCollections('tailwind.config.js'))).toEqual([]);
    });

    it('trang công khai', () => {
        const files = sourceFiles('resources/js/landing', []);

        expect(unknownIcons(files, iconCollections('tailwind.landing.config.js'))).toEqual([]);
    });
});
