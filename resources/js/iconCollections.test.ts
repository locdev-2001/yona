import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// Class icon `i-<bộ>-<tên>` chỉ ra CSS khi bộ đó được nạp trong cấu hình Tailwind và
// tên có thật trong bộ. Sai một trong hai thì build vẫn xanh, còn nút dùng icon đó
// hiện trống — nút phát tin ghi âm từng trống như vậy vì thiếu một bộ icon.
//
// Một họ icon một vai: Lucide cho giao diện, logos/simple-icons/devicon cho logo
// thương hiệu, `yona` cho số ít icon tự vẽ không bộ nào thay được.
const ROOT = process.cwd();
const ALLOWED = ['lucide', 'yona', 'logos', 'simple-icons', 'devicon'];
const TOKEN = /(?<![\w-])i-[a-z0-9]+(?:-[a-z0-9]+)+/g;

function loadedCollections(configFile: string): string[] {
    const source = readFileSync(join(ROOT, configFile), 'utf8');
    const block = source.match(/getIconCollections\(\[([\s\S]*?)\]\)/);
    const names = [...(block?.[1] ?? '').matchAll(/'([a-z0-9-]+)'/g)].map(match => match[1]);
    // Bộ tự vẽ của repo (theme/yona-icons) khai thẳng trong collections, không qua getIconCollections.
    return /yona:\s*\{\s*icons/.test(source) ? ['yona', ...names] : names;
}

function sourceFiles(dir: string, skip: string[], pattern = /\.(tsx?|jsx?)$/): string[] {
    return readdirSync(join(ROOT, dir)).flatMap(name => {
        const path = join(dir, name);
        if (skip.some(prefix => path.startsWith(prefix))) return [];
        if (statSync(join(ROOT, path)).isDirectory()) return sourceFiles(path, skip, pattern);
        return pattern.test(name) && !/\.test\./.test(name) ? [path] : [];
    });
}

const DASHBOARD_FILES = sourceFiles('resources/js', ['resources/js/landing', 'resources/js/i18n/generated']);
const LANDING_FILES = sourceFiles('resources/js/landing', []);
const ALL_FILES = [...sourceFiles('resources/js', ['resources/js/i18n/generated']), ...sourceFiles('resources/views', [], /\.php$/)];

// Tách `i-simple-icons-x` thành bộ + tên theo bộ có tiền tố dài nhất khớp.
function splitToken(token: string): { collection: string; name: string } | null {
    const collection = [...ALLOWED]
        .sort((a, b) => b.length - a.length)
        .find(candidate => token.startsWith(`i-${candidate}-`));
    return collection ? { collection, name: token.slice(collection.length + 3) } : null;
}

function iconTokens(files: string[]): Map<string, string> {
    const tokens = new Map<string, string>();
    for (const file of files) {
        for (const [token] of readFileSync(join(ROOT, file), 'utf8').matchAll(TOKEN)) {
            if (!tokens.has(token)) tokens.set(token, relative(ROOT, join(ROOT, file)));
        }
    }
    return tokens;
}

function iconNames(collection: string): Set<string> {
    if (collection === 'yona') {
        const source = readFileSync(join(ROOT, 'theme/yona-icons.js'), 'utf8');
        return new Set([...source.matchAll(/^ {2}'?([a-z0-9-]+)'?: \{/gm)].map(match => match[1]));
    }
    const data = JSON.parse(
        readFileSync(join(ROOT, `node_modules/@iconify-json/${collection}/icons.json`), 'utf8'),
    ) as { icons: Record<string, unknown> };
    return new Set(Object.keys(data.icons));
}

function unknownIcons(files: string[], collections: string[]): string[] {
    return [...iconTokens(files)]
        .filter(([token]) => !collections.some(collection => token.startsWith(`i-${collection}-`)))
        .map(([token, file]) => `${file}: ${token}`);
}

describe('mọi class icon đều thuộc một bộ icon đã nạp', () => {
    it('dashboard', () => {
        expect(unknownIcons(DASHBOARD_FILES, loadedCollections('tailwind.config.js'))).toEqual([]);
    });

    it('trang công khai', () => {
        expect(unknownIcons(LANDING_FILES, loadedCollections('tailwind.landing.config.js'))).toEqual([]);
    });

    it('cấu hình chỉ nạp bộ trong danh sách cho phép', () => {
        for (const config of ['tailwind.config.js', 'tailwind.landing.config.js']) {
            expect(loadedCollections(config).filter(collection => !ALLOWED.includes(collection))).toEqual([]);
        }
    });
});

describe('mọi class icon đều có thật', () => {
    it('chỉ dùng bộ trong danh sách cho phép, kể cả Blade', () => {
        expect(unknownIcons(ALL_FILES, ALLOWED)).toEqual([]);
    });

    it('tên icon tồn tại trong bộ của nó (Lucide phải là tên chuẩn, không phải alias)', () => {
        const names = new Map<string, Set<string>>();
        const missing = [...iconTokens(ALL_FILES)].flatMap(([token, file]) => {
            const parts = splitToken(token);
            if (!parts) return [];
            if (!names.has(parts.collection)) names.set(parts.collection, iconNames(parts.collection));
            return names.get(parts.collection)!.has(parts.name) ? [] : [`${file}: ${token}`];
        });

        expect(missing).toEqual([]);
    });
});
