// Audit đủ 146 method: tìm phantom (trong set nhưng không có method thật) +
// method nguy hiểm chưa phân loại (không thuộc set nào). Đóng HIGH-1/HIGH-2.
import fs from 'node:fs';
import {
    DESTRUCTIVE_METHODS, OUTBOUND_SEND_METHODS, MEDIA_METHODS, BINARY_METHODS, ADAPTER_DENY,
} from './zca-adapter.mjs';

const all = new Set(fs.readFileSync('/tmp/zca146.txt', 'utf8').split('\n').filter(Boolean));
const sets = { DESTRUCTIVE: DESTRUCTIVE_METHODS, OUTBOUND: OUTBOUND_SEND_METHODS, MEDIA: MEDIA_METHODS, BINARY: BINARY_METHODS, DENY: ADAPTER_DENY };

console.log('146 list size =', all.size);
for (const [name, s] of Object.entries(sets)) console.log(`${name} size=${s.size}`);

// Phantom: entry trong set nhưng KHÔNG phải method thật
const classified = new Set([...DESTRUCTIVE_METHODS, ...OUTBOUND_SEND_METHODS, ...MEDIA_METHODS, ...BINARY_METHODS, ...ADAPTER_DENY]);
const phantoms = [...classified].filter((m) => !all.has(m));
console.log('\nPHANTOM (trong set, KHÔNG có method thật):', phantoms);

// EXHAUSTIVE (re-review NEW-1): liệt kê MỌI mutation chưa gated — KHÔNG dựa danger-regex hụt.
// READ (get/fetch/find/search/parse/last/keepAlive) = an toàn cho dispatcher. Còn lại phải soi.
const unclassified = [...all].filter((m) => !classified.has(m));
const readRe = /^(get|fetch|find|search|parse|last|keepAlive)/i;
const mutationUnclassified = unclassified.filter((m) => !readRe.test(m)).sort();
console.log('\nMUTATION (non-read) CHƯA GATED — soi phân loại TỪNG cái:');
for (const m of mutationUnclassified) console.log('  -', m);
console.log('\nREAD unclassified (cho qua dispatcher OK):', unclassified.filter((m) => readRe.test(m)).length);
console.log('Tổng unclassified =', unclassified.length, '· mutation cần soi =', mutationUnclassified.length);
