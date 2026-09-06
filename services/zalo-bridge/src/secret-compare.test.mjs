import test from 'node:test';
import assert from 'node:assert/strict';

import { safeEqual } from './secret-compare.mjs';

test('khớp đúng chuỗi', () => {
    assert.equal(safeEqual('s3cr3t', 's3cr3t'), true);
});

test('lệch một ký tự, lệch độ dài, hoặc rỗng đều từ chối', () => {
    assert.equal(safeEqual('s3cr3t', 's3cr3T'), false);
    assert.equal(safeEqual('s3cr3t', 's3cr3t-dai-hon'), false);
    assert.equal(safeEqual('', ''), false);
    assert.equal(safeEqual('s3cr3t', ''), false);
    assert.equal(safeEqual(undefined, 's3cr3t'), false);
    assert.equal(safeEqual(null, null), false);
});
