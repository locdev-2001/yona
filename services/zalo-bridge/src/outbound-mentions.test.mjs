import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toZcaMentions } from './outbound-mentions.mjs';

const TEXT = '@Bình và @An xem giúp';

test('giữ mục hợp lệ và sắp theo vị trí', () => {
    assert.deepEqual(
        toZcaMentions(
            [
                { uid: '777', pos: 9, len: 3 },
                { uid: '555', pos: 0, len: 5 },
            ],
            TEXT,
        ),
        [
            { uid: '555', pos: 0, len: 5 },
            { uid: '777', pos: 9, len: 3 },
        ],
    );
});

test('bỏ uid rỗng, pos âm, len 0, số không nguyên và mục tràn khỏi chữ', () => {
    assert.deepEqual(
        toZcaMentions(
            [
                { uid: '', pos: 0, len: 5 },
                { uid: '1', pos: -1, len: 3 },
                { uid: '2', pos: 0, len: 0 },
                { uid: '3', pos: 1.5, len: 3 },
                { uid: 4, pos: 0, len: 5 },
                { uid: '5', pos: 18, len: 10 },
                null,
                'x',
            ],
            TEXT,
        ),
        [],
    );
});

test('bỏ mục chồng lên mục trước', () => {
    assert.deepEqual(
        toZcaMentions(
            [
                { uid: '555', pos: 0, len: 5 },
                { uid: '556', pos: 2, len: 5 },
            ],
            TEXT,
        ),
        [{ uid: '555', pos: 0, len: 5 }],
    );
});

test('tối đa 50 mục', () => {
    const text = 'x'.repeat(200);
    const raw = Array.from({ length: 60 }, (_, i) => ({ uid: String(i), pos: i * 2, len: 1 }));
    assert.equal(toZcaMentions(raw, text).length, 50);
});

test('input không phải mảng hoặc chữ rỗng → []', () => {
    assert.deepEqual(toZcaMentions(null, TEXT), []);
    assert.deepEqual(toZcaMentions({ uid: '1', pos: 0, len: 1 }, TEXT), []);
    assert.deepEqual(toZcaMentions([{ uid: '1', pos: 0, len: 1 }], ''), []);
});
