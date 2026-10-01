import assert from 'node:assert/strict';
import test from 'node:test';

import {
    CUSTOM_STICKER_METHOD,
    INVALID_CUSTOM_STICKER,
    customStickerLayout,
    customStickerParams,
    parseCustomSticker,
    sendCustomSticker,
} from './custom-sticker.mjs';
import { buildAllowlist, invokeMethod } from './zca-adapter.mjs';

const ALLOWED = new Set(['yona.test']);
const STATIC_URL = 'https://yona.test/storage/stickers/1/7/static-128.png';
const ANIMATION_URL = 'https://yona.test/storage/stickers/1/7/sticker-256.webp';
const FILE_SERVICE = 'https://files.zalo.test';

/**
 * Giả `api.custom` đúng ngữ nghĩa zca-js 2.1.2: khai thuộc tính không ghi, không cấu hình lại được;
 * bản đồ dịch vụ nằm trên `api`, `ctx` của callback KHÔNG có (từng làm production hỏng).
 */
function fakeZcaApi(response = { msgId: 5501 }, zpwServiceMap = { file: [FILE_SERVICE] }) {
    const requests = [];
    const ctx = { imei: 'fake-imei' };
    const utils = {
        encodeAES: (plain) => `enc(${plain})`,
        makeURL: (base, params) => `${base}?${new URLSearchParams(params)}`,
        request: async (url, options) => {
            requests.push({ url, options });
            return { fake: true };
        },
        resolve: async () => response,
    };
    const api = {
        zpwServiceMap,
        custom(name, callback) {
            Object.defineProperty(api, name, {
                value: (props) => callback({ ctx, utils, props }),
                writable: false,
                enumerable: false,
                configurable: false,
            });
        },
    };

    return { api, requests };
}

function sentParams(request) {
    const encrypted = request.options.body.get('params');

    return JSON.parse(encrypted.slice('enc('.length, -1));
}

const sticker = { staticUrl: STATIC_URL, animationUrl: ANIMATION_URL, width: 128, height: 128 };

test('parseCustomSticker: không có khoá thì null, đủ dạng thì chuẩn hoá, thiếu ảnh động dùng ảnh tĩnh', () => {
    assert.equal(parseCustomSticker(undefined, ALLOWED), null);
    assert.equal(parseCustomSticker(null, ALLOWED), null);
    assert.deepEqual(
        parseCustomSticker({ static_url: STATIC_URL, animation_url: ANIMATION_URL, width: 128, height: '128' }, ALLOWED),
        sticker
    );
    assert.deepEqual(parseCustomSticker({ static_url: STATIC_URL, width: 128, height: 128 }, ALLOWED), {
        ...sticker,
        animationUrl: STATIC_URL,
    });
});

test('parseCustomSticker: sai dạng thì ném lỗi 400, không rơi sang đường khác', () => {
    for (const bad of [
        {},
        'x',
        { static_url: '', width: 128, height: 128 },
        { static_url: STATIC_URL, width: 0, height: 128 },
        { static_url: STATIC_URL, width: 128, height: 4096 },
        { static_url: STATIC_URL, width: 1.5, height: 128 },
    ]) {
        assert.throws(() => parseCustomSticker(bad, ALLOWED), { message: INVALID_CUSTOM_STICKER });
    }
});

test('parseCustomSticker: URL ngoài allowlist (tĩnh hay động) bị chặn', () => {
    assert.throws(
        () => parseCustomSticker({ static_url: 'https://evil.test/a.png', width: 128, height: 128 }, ALLOWED),
        { message: 'fetch_host_not_allowed' }
    );
    assert.throws(
        () => parseCustomSticker({ static_url: STATIC_URL, animation_url: 'https://evil.test/a.webp', width: 128, height: 128 }, ALLOWED),
        { message: 'fetch_host_not_allowed' }
    );
    assert.throws(
        () => parseCustomSticker({ static_url: 'file:///etc/passwd', width: 128, height: 128 }, ALLOWED),
        { message: 'fetch_scheme_not_allowed' }
    );
});

function decodedProperties(params) {
    const properties = JSON.parse(params.properties);

    return { ...properties, ext: JSON.parse(properties.ext) };
}

const ANIMATION_WEBP = JSON.stringify({ width: 128, height: 128, url: ANIMATION_URL });

// Dạng `ai` khớp tin sticker tự tạo mà Zalo desktop hiện đúng: pStickerType chỉ tới được server
// khi nằm trong jcp (đặt thẳng trong params thì bị bỏ, tin rơi sang bộ vẽ photo sticker cũ).
const AI_FIELDS = {
    oriUrl: ANIMATION_URL,
    thumbUrl: ANIMATION_URL,
    hdUrl: ANIMATION_URL,
    contentId: 1700,
    thumb_width: 128,
    thumb_height: 128,
    webp: ANIMATION_WEBP,
    jcp: JSON.stringify({ pStickerType: 1 }),
};

const LAYOUT_CASES = [
    { layout: 'ai', fields: AI_FIELDS, ext: { shouldParseLinkOrContact: 0 } },
    { layout: 'ai_direct', fields: AI_FIELDS, ext: { shouldParseLinkOrContact: 0 } },
    {
        layout: 'photo',
        fields: {
            oriUrl: STATIC_URL,
            thumbUrl: STATIC_URL,
            hdUrl: STATIC_URL,
            contentId: 1700,
            thumb_width: 128,
            thumb_height: 128,
            webp: ANIMATION_WEBP,
        },
        ext: { sSrcStr: '@STICKER', sSrcType: 0 },
    },
    {
        layout: 'plain',
        fields: { oriUrl: ANIMATION_URL, thumbUrl: ANIMATION_URL, hdUrl: ANIMATION_URL },
        ext: { shouldParseLinkOrContact: 0 },
    },
];

for (const { layout, fields, ext } of LAYOUT_CASES) {
    test(`customStickerParams: dạng ${layout} gửi đúng trường cho bộ vẽ tương ứng của Zalo`, () => {
        const params = customStickerParams({ sticker, threadId: 987, isGroup: false, clientId: 1700, layout });

        assert.deepEqual(params, {
            clientId: 1700,
            title: '',
            width: 128,
            height: 128,
            properties: params.properties,
            ...fields,
            zsource: -1,
            ttl: 0,
            toId: '987',
        });
        assert.deepEqual(decodedProperties(params), { subType: 0, color: -1, size: -1, type: 3, ext });
        assert.equal('pStickerType' in params, false);
    });
}

test('customStickerLayout: mặc định ai, giá trị lạ hay trống cũng về ai', () => {
    assert.equal(customStickerLayout(undefined), 'ai');
    assert.equal(customStickerLayout(''), 'ai');
    assert.equal(customStickerLayout('gif'), 'ai');
    assert.equal(customStickerLayout(' Plain '), 'plain');
    assert.equal(customStickerLayout('photo'), 'photo');
    assert.equal(customStickerLayout('AI_DIRECT'), 'ai_direct');
    assert.deepEqual(
        customStickerParams({ sticker, threadId: 1, isGroup: false, clientId: 1 }),
        customStickerParams({ sticker, threadId: 1, isGroup: false, clientId: 1, layout: 'ai' })
    );
});

test('customStickerParams: nhóm mang grid + visibility 0, không có toId', () => {
    const params = customStickerParams({ sticker, threadId: '555', isGroup: true, clientId: 1 });

    assert.equal(params.grid, '555');
    assert.equal(params.visibility, 0);
    assert.equal('toId' in params, false);
});

test('sendCustomSticker: gọi photo_url của dịch vụ file theo loại luồng, tham số mã hoá, trả nguyên kết quả zca', async () => {
    const { api, requests } = fakeZcaApi();

    const direct = await sendCustomSticker(api, { sticker, threadId: '987', isGroup: false });
    await sendCustomSticker(api, { sticker, threadId: '555', isGroup: true });

    assert.deepEqual(direct, { msgId: 5501 });
    assert.equal(requests[0].url, `${FILE_SERVICE}/api/message/photo_url?nretry=0`);
    assert.equal(requests[1].url, `${FILE_SERVICE}/api/group/photo_url?nretry=0`);
    assert.equal(requests[0].options.method, 'POST');
    assert.equal(sentParams(requests[0]).toId, '987');
    assert.equal(sentParams(requests[1]).grid, '555');
    assert.equal(sentParams(requests[0]).jcp, JSON.stringify({ pStickerType: 1 }));
});

test('sendCustomSticker: dạng chọn ở bridge đi tới tham số gửi Zalo', async () => {
    const { api, requests } = fakeZcaApi();

    await sendCustomSticker(api, { sticker, threadId: '987', isGroup: false, layout: 'plain' });

    assert.equal('contentId' in sentParams(requests[0]), false);
    assert.equal('jcp' in sentParams(requests[0]), false);
});

test('sendCustomSticker: phiên dùng lại không đăng ký lại (custom() không cho khai trùng)', async () => {
    const { api, requests } = fakeZcaApi();

    await sendCustomSticker(api, { sticker, threadId: '1', isGroup: false });
    await sendCustomSticker(api, { sticker, threadId: '2', isGroup: false });

    assert.equal(requests.length, 2);
});

test('method sticker tự tạo không lộ ra dispatcher /zca', async () => {
    const { api } = fakeZcaApi();
    await sendCustomSticker(api, { sticker, threadId: '1', isGroup: false });

    const allowlist = buildAllowlist(api);

    assert.equal(allowlist.has(CUSTOM_STICKER_METHOD), false);
    assert.throws(() => invokeMethod(api, allowlist, CUSTOM_STICKER_METHOD, [{}]), (error) => error.code === 'METHOD_NOT_ALLOWED');
});

test('sendCustomSticker: phiên chưa có bản đồ dịch vụ tệp thì báo lỗi rõ, không gọi Zalo', async () => {
    const { api, requests } = fakeZcaApi(undefined, null);

    await assert.rejects(() => sendCustomSticker(api, { sticker, threadId: '42', isGroup: false }), /custom_sticker_file_service_missing/);
    assert.equal(requests.length, 0);
});

const HOSTED_URL = 'https://b-f9-zpc.zdn.vn/1/sticker.jpg';

function fakeHost(result = (sent) => ({ ...sent, staticUrl: HOSTED_URL, animationUrl: HOSTED_URL })) {
    const calls = [];
    const hostSticker = async (api, sent, target) => {
        calls.push({ api, sent, target });
        return result(sent);
    };

    return { hostSticker, calls };
}

test('sendCustomSticker: dạng ai gửi URL ảnh đã đưa lên CDN Zalo cho mọi trường ảnh', async () => {
    const { api, requests } = fakeZcaApi();
    const { hostSticker, calls } = fakeHost();

    await sendCustomSticker(api, { sticker, threadId: '555', isGroup: true, layout: 'ai', hostSticker });

    assert.deepEqual(calls, [{ api, sent: sticker, target: { threadId: '555', isGroup: true } }]);
    const params = sentParams(requests[0]);
    assert.deepEqual(
        [params.oriUrl, params.thumbUrl, params.hdUrl, JSON.parse(params.webp).url],
        [HOSTED_URL, HOSTED_URL, HOSTED_URL, HOSTED_URL]
    );
    assert.equal(params.jcp, JSON.stringify({ pStickerType: 1 }));
});

test('sendCustomSticker: đưa lên CDN Zalo hỏng thì vẫn gửi URL của Yona và ghi cảnh báo không lộ URL', async () => {
    const { api, requests } = fakeZcaApi();
    const { hostSticker } = fakeHost(() => {
        throw new Error('upload_failed https://b-f9-zpc.zdn.vn/token');
    });
    const warnings = [];

    const result = await sendCustomSticker(api, { sticker, threadId: '987', isGroup: false, hostSticker, warn: (...args) => warnings.push(args) });

    assert.deepEqual(result, { msgId: 5501 });
    assert.equal(sentParams(requests[0]).oriUrl, ANIMATION_URL);
    assert.equal(warnings.length, 1);
    assert.equal(String(warnings[0]).includes('zdn.vn'), false);
});

for (const layout of ['ai_direct', 'photo', 'plain']) {
    test(`sendCustomSticker: dạng ${layout} không đưa ảnh lên Zalo`, async () => {
        const { api, requests } = fakeZcaApi();
        const { hostSticker, calls } = fakeHost();

        await sendCustomSticker(api, { sticker, threadId: '987', isGroup: false, layout, hostSticker });

        assert.equal(calls.length, 0);
        assert.equal(sentParams(requests[0]).hdUrl.startsWith('https://yona.test/'), true);
    });
}
