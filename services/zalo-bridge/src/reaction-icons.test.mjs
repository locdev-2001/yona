import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reactionEmoji, zcaReactionCode } from './reaction-icons.mjs';

test('emoji lõi gửi xuống → mã zca', () => {
    assert.equal(zcaReactionCode('👍'), '/-strong');
    assert.equal(zcaReactionCode('❤️'), '/-heart');
    assert.equal(zcaReactionCode('❤'), '/-heart'); // thiếu variation selector vẫn tra được
    assert.equal(zcaReactionCode('😂'), ":')");
    assert.equal(zcaReactionCode('😢'), ':-((');
});

test('mã zca gửi thẳng thì giữ nguyên', () => {
    assert.equal(zcaReactionCode('/-heart'), '/-heart');
    assert.equal(zcaReactionCode(':>'), ':>');
});

test('rỗng / "none" = gỡ cảm xúc (Reactions.NONE)', () => {
    assert.equal(zcaReactionCode(''), '');
    assert.equal(zcaReactionCode('none'), '');
    assert.equal(zcaReactionCode(undefined), '');
});

test('emoji Zalo không có → null (không được lọt xuống zca thành rType -1 = gỡ nhầm)', () => {
    assert.equal(zcaReactionCode('🦄'), null);
    assert.equal(zcaReactionCode('/-khong-co-ma-nay'), null);
});

test('một emoji chỉ ra một mã dù nhiều mã cùng trỏ nó', () => {
    assert.equal(zcaReactionCode('🙏'), '/-thanks'); // '_()_' cũng là 🙏
    assert.equal(zcaReactionCode('👎'), '/-weak'); // '/-bad' cũng là 👎
    assert.equal(zcaReactionCode('😎'), 'x-)'); // 'b-)' cũng là 😎
});

test('chiều đọc khớp bảng của driver Laravel; mã lạ giữ nguyên', () => {
    assert.equal(reactionEmoji('/-strong'), '👍');
    assert.equal(reactionEmoji('/-ma-moi'), '/-ma-moi');
});
