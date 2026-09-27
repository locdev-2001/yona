// Gác cổng cho `tailwind/surfaces.cjs`.
//
// Mỗi bề mặt công khai (widget, survey, portal, superadmin, v3) sinh utility
// Tailwind từ một danh sách glob hẹp thay vì cả `resources/js`. Nếu ai đó thêm
// import sang thư mục ngoài danh sách, Tailwind vẫn build xanh nhưng class của
// component mới bị cắt mất — lỗi chỉ lộ ra trên trình duyệt.
//
// Script dựng lại module graph thật bằng Rollup rồi đối chiếu với glob. Lệch =
// fail, kèm đúng file cần thêm.
import { globSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { build } from 'vite';
import react from '@vitejs/plugin-react';

import { viteAliases } from '../vite.aliases.js';

const root = path.resolve(import.meta.dirname, '..');
const surfaces = createRequire(import.meta.url)('../tailwind/surfaces.cjs');

const alias = viteAliases(root);

/** Mọi file nguồn mà entry của bề mặt kéo vào, tính theo đường dẫn tương đối repo. */
async function moduleGraph(entries) {
    const inputs = entries.flatMap(pattern => globSync(pattern, { cwd: root }));
    if (inputs.length === 0) {
        throw new Error(`Không có entry nào khớp: ${entries.join(', ')}`);
    }

    const modules = new Set();

    await build({
        root,
        configFile: false,
        logLevel: 'silent',
        resolve: { alias },
        plugins: [
            react(),
            {
                name: 'collect-modules',
                generateBundle(_options, bundle) {
                    for (const chunk of Object.values(bundle)) {
                        if (chunk.type !== 'chunk') continue;
                        for (const id of Object.keys(chunk.modules)) {
                            // Chỉ file nguồn mới chứa tên class; .json/.css/ảnh thì không.
                            if (!id.startsWith(`${root}/resources/`)) continue;
                            if (!/\.(ts|tsx|js|jsx)$/.test(id)) continue;
                            modules.add(path.relative(root, id));
                        }
                    }
                },
            },
        ],
        build: {
            write: false,
            rollupOptions: { input: inputs.map(input => path.join(root, input)) },
        },
    });

    return modules;
}

/** Tập file mà `content` của Tailwind thật sự quét. */
function scannedFiles(content) {
    const files = new Set();
    for (const pattern of content) {
        for (const file of globSync(pattern.replace(/^\.\//, ''), { cwd: root })) {
            files.add(file);
        }
    }
    return files;
}

let failed = false;

for (const [name, surface] of Object.entries(surfaces)) {
    const [modules, scanned] = [await moduleGraph(surface.entries), scannedFiles(surface.content)];
    const missing = [...modules].filter(file => !scanned.has(file)).sort();

    if (missing.length === 0) {
        console.log(`✓ ${name}: ${modules.size} module, tất cả nằm trong content globs`);
        continue;
    }

    failed = true;
    console.error(`✗ ${name}: ${missing.length} module bị Tailwind bỏ qua — class của chúng sẽ không được sinh ra:`);
    for (const file of missing) console.error(`    ./${file}`);
    console.error(`  Thêm vào \`content\` của '${name}' trong tailwind/surfaces.cjs.`);
}

process.exit(failed ? 1 : 0);
