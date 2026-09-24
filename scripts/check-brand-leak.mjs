// Gác cổng tên nền tảng cũ.
//
// Mặc định quét mọi file git theo dõi (nội dung + tên file; file nhị phân chỉ quét
// dưới public/ vì đó là thứ trình duyệt tải về, vd tag ID3 trong mp3). `--build`
// quét bundle đã build — chỉ cho qua chuỗi contract mà mã nhúng cũ của khách còn
// gọi. `--report` in kết quả nhưng luôn thoát 0 (dùng khi còn đang dọn dần).
//
// Mẫu tìm và danh sách được phép: scripts/brand-leak-allowlist.mjs.
import { execFileSync } from 'node:child_process';
import { globSync, readFileSync } from 'node:fs';
import path from 'node:path';

import {
    ANY_TOKEN,
    LEGACY_BRAND_PATTERN,
    LEGACY_CONTRACT_TOKENS,
    SOURCE_ALLOWLIST,
} from './brand-leak-allowlist.mjs';

const root = path.resolve(import.meta.dirname, '..');
const args = new Set(process.argv.slice(2));
const buildMode = args.has('--build');
const reportOnly = args.has('--report');

const BUILD_GLOBS = ['public/build/**/*.{js,css,html}', 'public/packs/js/sdk.js'];
const BINARY_SCAN_PREFIX = 'public/';
const BINARY_SNIFF_BYTES = 8000;

const pattern = LEGACY_BRAND_PATTERN.source;
// Nguồn: lấy cả tiền tố đường dẫn/thuộc tính để allowlist khớp đúng ngữ cảnh.
const SOURCE_TOKEN = new RegExp(`[\\w$@.:/-]*(?:${pattern})[\\w.:/-]*`, 'gi');
// Bundle: lấy đúng định danh/chuỗi, bỏ tiền tố `window.` mà minifier có thể giữ hoặc bỏ.
const BUILD_TOKEN = new RegExp(`[\\w$-]*(?:${pattern})[\\w:-]*`, 'gi');

function tokenAllowed(token, allowedTokens) {
    if (allowedTokens === ANY_TOKEN) return true;

    return allowedTokens.some(allowed => (allowed instanceof RegExp ? allowed.test(token) : allowed === token));
}

function pathMatches(entryPath, file) {
    if (entryPath instanceof RegExp) return entryPath.test(file);

    return entryPath.endsWith('/') ? file.startsWith(entryPath) : entryPath === file;
}

function sourceTokenAllowed(file, token) {
    return SOURCE_ALLOWLIST.some(entry => pathMatches(entry.path, file) && tokenAllowed(token, entry.tokens));
}

function isBinary(buffer) {
    return buffer.subarray(0, BINARY_SNIFF_BYTES).includes(0);
}

function scanText(file, content, tokenPattern, isAllowed) {
    const findings = [];
    content.split('\n').forEach((line, index) => {
        if (!LEGACY_BRAND_PATTERN.test(line)) return;
        // `\n` trong chuỗi JSON/JS không được dính vào token (`\nwindow.x` → `window.x`).
        for (const token of line.replace(/\\[nrt]/g, ' ').match(tokenPattern) ?? []) {
            if (!isAllowed(file, token)) findings.push({ file, line: index + 1, token });
        }
    });

    return findings;
}

function scanSource() {
    const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
    const findings = [];

    for (const file of files) {
        if (LEGACY_BRAND_PATTERN.test(file) && !sourceTokenAllowed(file, file)) {
            findings.push({ file, line: 0, token: '(tên file)' });
        }

        let buffer;
        try {
            buffer = readFileSync(path.join(root, file));
        } catch {
            continue; // file đã xoá khỏi cây làm việc nhưng chưa commit
        }

        if (isBinary(buffer)) {
            if (file.startsWith(BINARY_SCAN_PREFIX) && LEGACY_BRAND_PATTERN.test(buffer.toString('latin1'))) {
                findings.push({ file, line: 0, token: '(nội dung nhị phân)' });
            }
            continue;
        }

        findings.push(...scanText(file, buffer.toString('utf8'), SOURCE_TOKEN, sourceTokenAllowed));
    }

    return findings;
}

function scanBuild() {
    const files = BUILD_GLOBS.flatMap(glob => globSync(glob, { cwd: root }));
    if (files.length === 0) {
        console.error('Không thấy bundle nào — chạy `npm run build` trước.');
        process.exit(1);
    }

    return files.flatMap(file =>
        scanText(file, readFileSync(path.join(root, file), 'utf8'), BUILD_TOKEN, (_file, token) =>
            tokenAllowed(token, LEGACY_CONTRACT_TOKENS),
        ),
    );
}

function summarize(findings) {
    const byTopDir = new Map();
    for (const { file } of findings) {
        const top = file.includes('/') ? file.slice(0, file.indexOf('/')) : file;
        byTopDir.set(top, (byTopDir.get(top) ?? 0) + 1);
    }

    return [...byTopDir.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([dir, count]) => `${dir} ${count}`)
        .join(' · ');
}

const findings = buildMode ? scanBuild() : scanSource();
const scope = buildMode ? 'bundle' : 'nguồn';

if (findings.length === 0) {
    console.log(`check:brand (${scope}): sạch.`);
    process.exit(0);
}

for (const { file, line, token } of findings) {
    console.log(line ? `${file}:${line}: ${token}` : `${file}: ${token}`);
}
const fileCount = new Set(findings.map(finding => finding.file)).size;
console.log(`\ncheck:brand (${scope}): ${findings.length} chỗ trong ${fileCount} file — ${summarize(findings)}`);

process.exit(reportOnly ? 0 : 1);
