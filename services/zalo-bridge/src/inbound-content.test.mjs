import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    applyGroupContextToPayload,
    applyInboundDescriptorToPayload,
    captionBesideLink,
    contentLabelFromObject,
    enrichInboundBody,
    mediaCaptionFromContent,
    parseBankCardHtml,
    isLocationMsgType,
    normalizeMentions,
    parseInboundLinkPreview,
    parseInboundLocation,
    parseVietQrEmv,
    parseZinstantBankCardSource,
} from './inbound-content.mjs';

test('zinstant.bankcard → nhãn tiếng Việt (KHÔNG raw JSON) — bug thẻ tài khoản 11/07', () => {
    assert.equal(
        contentLabelFromObject({ action: 'zinstant.bankcard', title: null, href: null }, 'chat.webcontent'),
        '[Tài khoản ngân hàng]'
    );
});

test('zinstant.* khác → [Thẻ Zalo]', () => {
    assert.equal(contentLabelFromObject({ action: 'zinstant.product' }, 'chat.webcontent'), '[Thẻ Zalo]');
});

test('có title thật → dùng title', () => {
    assert.equal(contentLabelFromObject({ title: 'Bài viết A', action: '' }, 'chat.webcontent'), 'Bài viết A');
});

test('webcontent/link không title/action → [Liên kết]', () => {
    assert.equal(contentLabelFromObject({ title: '', action: '' }, 'chat.webcontent'), '[Liên kết]');
    assert.equal(contentLabelFromObject({}, 'chat.link'), '[Liên kết]');
});

test('object lạ → [Tin nhắn]; non-object → rỗng', () => {
    assert.equal(contentLabelFromObject({}, 'chat.unknown'), '[Tin nhắn]');
    assert.equal(contentLabelFromObject('hi', ''), '');
    assert.equal(contentLabelFromObject(null, ''), '');
});

// ── Bank card (zinstant.bankcard) ────────────────────────────────────────────

// EMV thật từ listener_data 11/07 (STK demo Liobank 012345678916, BIN 963369)
const EMV_LIOBANK = '00020101021138560010A0000007270126000696336901120123456789160208QRIBFTTA53037045802VN80300012com.vng.zalo0110ZABANKCARD63047068';

// Fixture rút gọn từ template thật (templateId=11845, data_url?data=html):
// giữ nguyên id/class ngữ nghĩa + CSS content:url + link transfer chứa EMV.
const BANK_CARD_HTML_FIXTURE = `
<style>
._ob_19 { width: 32px; content: url(https://res-zalo.zadn.vn/upload/media/logo_Liobank.png); }
._ob_30 { content: url(https://group-qr.zdn.vn/d/1/220/QRDATA/8/1); width: 100px; }
</style>
<div class="container _ob_3" id="container">
  <div class="_ob_4">
    <div class="bank_bin_element _ob_7"><p id="bank_bin">963369</p></div>
    <div id="bc_sender" class="click_overlay sender _ob_8"></div>
    <div class="card_wrapper _ob_10" id="vw_card">
      <div class="bank_info _ob_13">
        <img class="bank_logo _ob_19">
        <div class="_ob_20"><p class="normal_text _ob_26">Ngân hàng Liobank by OCB</p></div>
      </div>
      <div class="_ob_14">
        <div class="_ob_21">
          <p class="number_text _ob_27">012345678916</p>
          <p class="normal_text pc_element _ob_28"> Phước Lộc </p>
        </div>
        <div class="_ob_22"><img class="qr qr_pc _ob_30"></div>
      </div>
    </div>
  </div>
</div>
<zinstant-attr-theme>[{"_ob_8":{"data-click-data":"https://bankcard-action.zalo.me?action=transfer&amp;content=${EMV_LIOBANK}&amp;ctxt=abc"}}]</zinstant-attr-theme>`;

const BANK_CARD_PARAMS = JSON.stringify({
    item: { data_url: 'https://zinst-stc.zadn.vn/static/3m/11845/x' },
    pcItem: { data_url: 'https://zinst-stc.zadn.vn/static/3m/11845/x?data=html' },
});

test('parseVietQrEmv: EMV VietQR thật → BIN + số tài khoản', () => {
    assert.deepEqual(parseVietQrEmv(EMV_LIOBANK), { bin: '963369', account_number: '012345678916' });
});

test('parseVietQrEmv: payload rác/thiếu tag 38 → null', () => {
    assert.equal(parseVietQrEmv('000201'), null);
    assert.equal(parseVietQrEmv(''), null);
    assert.equal(parseVietQrEmv('not-emv-at-all'), null);
});

test('parseZinstantBankCardSource: ưu tiên pcItem data_url + label tiếng Việt', () => {
    const source = parseZinstantBankCardSource({ action: 'zinstant.bankcard', params: BANK_CARD_PARAMS });
    assert.equal(source.data_url, 'https://zinst-stc.zadn.vn/static/3m/11845/x?data=html');
    assert.equal(source.label, '[Tài khoản ngân hàng]');
});

test('parseZinstantBankCardSource: item không có ?data=html → tự thêm', () => {
    const source = parseZinstantBankCardSource({
        action: 'zinstant.bankcard',
        params: JSON.stringify({ item: { data_url: 'https://zinst-stc.zadn.vn/static/3m/11845/y' } }),
    });
    assert.equal(source.data_url, 'https://zinst-stc.zadn.vn/static/3m/11845/y?data=html');
});

test('parseZinstantBankCardSource: không phải bankcard / params hỏng → null', () => {
    assert.equal(parseZinstantBankCardSource({ action: 'zinstant.product', params: BANK_CARD_PARAMS }), null);
    assert.equal(parseZinstantBankCardSource({ action: 'zinstant.bankcard', params: '{broken' }), null);
    assert.equal(parseZinstantBankCardSource({ action: 'zinstant.bankcard', params: '{}' }), null);
    assert.equal(parseZinstantBankCardSource('text'), null);
});

test('parseBankCardHtml: template thật → đủ tên NH, BIN, STK, chủ TK, logo, QR', () => {
    assert.deepEqual(parseBankCardHtml(BANK_CARD_HTML_FIXTURE), {
        bank_name: 'Ngân hàng Liobank by OCB',
        bank_bin: '963369',
        account_number: '012345678916',
        account_holder: 'Phước Lộc',
        logo_url: 'https://res-zalo.zadn.vn/upload/media/logo_Liobank.png',
        qr_url: 'https://group-qr.zdn.vn/d/1/220/QRDATA/8/1',
    });
});

test('parseBankCardHtml: thiếu EMV → fallback text node cho BIN + STK', () => {
    const noEmv = BANK_CARD_HTML_FIXTURE.replace(/bankcard-action\.zalo\.me[^"]*/, 'https://example.com');
    const card = parseBankCardHtml(noEmv);
    assert.equal(card.bank_bin, '963369');
    assert.equal(card.account_number, '012345678916');
});

test('parseBankCardHtml: HTML không phải bankcard → null', () => {
    assert.equal(parseBankCardHtml('<html><body>hello</body></html>'), null);
    assert.equal(parseBankCardHtml(''), null);
});

test('enrichInboundBody: fetch OK → inbound_kind=bank_card + bank_card đầy đủ', async () => {
    const body = {
        inbound_kind: 'bank_card',
        content: '[Tài khoản ngân hàng]',
        bank_card_source: { data_url: 'https://zinst-stc.zadn.vn/enrich-ok?data=html', label: '[Tài khoản ngân hàng]' },
    };
    const fetchMock = async () => ({ ok: true, text: async () => BANK_CARD_HTML_FIXTURE });
    await enrichInboundBody(body, fetchMock);
    assert.equal(body.inbound_kind, 'bank_card');
    assert.equal(body.bank_card.account_number, '012345678916');
    assert.equal(body.bank_card_source, undefined);
});

test('enrichInboundBody: fetch fail → hạ về text + giữ label (fail-open)', async () => {
    const body = {
        inbound_kind: 'bank_card',
        content: '',
        bank_card_source: { data_url: 'https://zinst-stc.zadn.vn/enrich-fail?data=html', label: '[Tài khoản ngân hàng]' },
    };
    const fetchMock = async () => {
        throw new Error('network down');
    };
    await enrichInboundBody(body, fetchMock);
    assert.equal(body.inbound_kind, 'text');
    assert.equal(body.content, '[Tài khoản ngân hàng]');
    assert.equal(body.bank_card, undefined);
});

test('enrichInboundBody: payload thường (không bank_card_source) → no-op', async () => {
    const body = { inbound_kind: 'text', content: 'hi' };
    await enrichInboundBody(body, async () => {
        throw new Error('không được gọi fetch');
    });
    assert.deepEqual(body, { inbound_kind: 'text', content: 'hi' });
});

test('enrichInboundBody: cùng data_url → cache, chỉ fetch 1 lần', async () => {
    let calls = 0;
    const fetchMock = async () => {
        calls += 1;
        return { ok: true, text: async () => BANK_CARD_HTML_FIXTURE };
    };
    const mkBody = () => ({
        inbound_kind: 'bank_card',
        content: '[Tài khoản ngân hàng]',
        bank_card_source: { data_url: 'https://zinst-stc.zadn.vn/enrich-cached?data=html', label: '[Tài khoản ngân hàng]' },
    });
    const first = mkBody();
    const second = mkBody();
    await enrichInboundBody(first, fetchMock);
    await enrichInboundBody(second, fetchMock);
    assert.equal(calls, 1);
    assert.equal(second.bank_card.account_number, '012345678916');
});

// ── 1.5: chú thích ảnh/video/tệp ────────────────────────────────────────────

test('1.5: chú thích ảnh nằm ở content.title → ra content (trước đây bị lọc mất)', () => {
    assert.equal(
        mediaCaptionFromContent(
            { title: 'Ảnh sản phẩm', href: 'https://cdn.zalo.test/photo.jpg', thumb: 'https://cdn.zalo.test/t.jpg' },
            'chat.photo'
        ),
        'Ảnh sản phẩm'
    );
});

test('1.5: video có chú thích nhiều dòng → giữ nguyên, cắt khoảng trắng thừa', () => {
    assert.equal(
        mediaCaptionFromContent({ title: '  Xem giúp em video này  ', href: 'https://cdn.zalo.test/v.mp4' }, 'chat.video.msg'),
        'Xem giúp em video này'
    );
});

test('1.5: ảnh không chú thích → null (content rỗng, không phải chuỗi "[Link] …")', () => {
    assert.equal(mediaCaptionFromContent({ href: 'https://cdn.zalo.test/photo.jpg' }, 'chat.photo'), null);
    assert.equal(mediaCaptionFromContent({ title: '', href: 'https://cdn.zalo.test/photo.jpg' }, 'chat.photo'), null);
});

test('1.5: title chỉ là chính đường dẫn hoặc tên tệp → không phải chú thích', () => {
    assert.equal(mediaCaptionFromContent({ title: 'https://cdn.zalo.test/photo.jpg' }, 'chat.photo'), null);
    assert.equal(mediaCaptionFromContent({ title: 'IMG_2048.jpg' }, 'chat.photo'), null);
});

test('1.5: share.file — title là TÊN TỆP, chú thích chỉ lấy từ description', () => {
    assert.equal(
        mediaCaptionFromContent({ title: 'bang-gia.xlsx', href: 'https://cdn.zalo.test/f' }, 'share.file'),
        null
    );
    assert.equal(
        mediaCaptionFromContent(
            { title: 'bang-gia.xlsx', description: 'Bảng giá tháng 9', href: 'https://cdn.zalo.test/f' },
            'share.file'
        ),
        'Bảng giá tháng 9'
    );
});

test('1.5: content là chuỗi JSON (lane backfill) vẫn bóc được chú thích', () => {
    assert.equal(
        mediaCaptionFromContent('{"title":"Ảnh hoá đơn","href":"https://cdn.zalo.test/p.jpg"}', 'chat.photo'),
        'Ảnh hoá đơn'
    );
    assert.equal(mediaCaptionFromContent('chuoi thuong', 'chat.photo'), null);
    assert.equal(mediaCaptionFromContent(null, 'chat.photo'), null);
});

// ── 1.11 vị trí · 1.12 link · 1.10 ánh xạ chung ─────────────────────────────

test('1.11: chat.location ra toạ độ + nhãn (trước đây gửi vị trí KHÔNG tạo tin)', () => {
    assert.deepEqual(
        parseInboundLocation({ latitude: 10.762622, longitude: 106.660172, title: 'Chợ Bến Thành', address: 'Lê Lợi, Quận 1' }),
        {
            latitude: 10.762622,
            longitude: 106.660172,
            title: 'Chợ Bến Thành',
            address: 'Lê Lợi, Quận 1',
            url: 'https://maps.google.com/?q=10.762622,106.660172',
        }
    );
});

test('1.11: đọc được mọi cách viết toạ độ Zalo đã gặp (lat/long/lng/lon, chuỗi số)', () => {
    assert.deepEqual(parseInboundLocation({ lat: '10.5', lng: '106.5' }), {
        latitude: 10.5,
        longitude: 106.5,
        url: 'https://maps.google.com/?q=10.5,106.5',
    });
    assert.equal(parseInboundLocation({ lat: 10.5, lon: 106.5 })?.longitude, 106.5);
    assert.equal(parseInboundLocation({ latitude: 10.5, long: 106.5 })?.longitude, 106.5);
});

test('1.11: thiếu toạ độ → null, rơi về đường cũ (không hồi quy)', () => {
    assert.equal(parseInboundLocation({ title: 'Quán cà phê' }), null);
    assert.equal(parseInboundLocation({ lat: 'x', lng: 'y' }), null);
    assert.equal(parseInboundLocation(null), null);
});

test('1.12: chat.link ra contract fallback thay chuỗi "[Link] … https://…" thô', () => {
    assert.deepEqual(
        parseInboundLinkPreview(
            { href: 'https://yona.vn/bang-gia', title: 'Bảng giá Yona', description: 'Gói Team', thumb: 'https://cdn/t.jpg' },
            'chat.link'
        ),
        { url: 'https://yona.vn/bang-gia', title: 'Bảng giá Yona', description: 'Gói Team', thumb: 'https://cdn/t.jpg' }
    );
});

test('1.12: chỉ nhận link/webcontent/recommended và chỉ khi URL là http(s)', () => {
    assert.equal(parseInboundLinkPreview({ href: 'https://a.vn' }, 'chat.text'), null);
    assert.equal(parseInboundLinkPreview({ href: 'zalo://mo-app' }, 'chat.link'), null);
    assert.equal(parseInboundLinkPreview({ url: 'https://a.vn' }, 'chat.webcontent')?.url, 'https://a.vn');
});

test('1.12: chữ khách gõ kèm link giữ lại, chuỗi bridge tự dựng thì bỏ', () => {
    const link = { url: 'https://yona.vn' };
    assert.equal(captionBesideLink('Anh xem giúp em', link), 'Anh xem giúp em');
    assert.equal(captionBesideLink('[Link] Bảng giá https://yona.vn', link), null);
    assert.equal(captionBesideLink('https://yona.vn', link), null);
    assert.equal(captionBesideLink('', link), null);
});

test('1.10: một ánh xạ chung cho MỌI loại tin — hai lane không thể lệch nhau', () => {
    const map = (desc, extras) => applyInboundDescriptorToPayload({}, desc, extras);

    assert.deepEqual(map({ inbound_kind: 'text', text: 'Xin chào' }), { content: 'Xin chào' });
    assert.deepEqual(map({ inbound_kind: 'image', media_url: 'https://cdn/p.jpg', caption: 'Ảnh sản phẩm' }), {
        media_url: 'https://cdn/p.jpg',
        content: 'Ảnh sản phẩm',
    });
    assert.deepEqual(map({ inbound_kind: 'file', media_url: 'https://cdn/f', media_filename: 'bang-gia.xlsx', caption: null }), {
        media_url: 'https://cdn/f',
        media_filename: 'bang-gia.xlsx',
        content: '',
    });
    assert.deepEqual(map({ inbound_kind: 'location', location: { latitude: 1, longitude: 2 } }), {
        location: { latitude: 1, longitude: 2 },
        content: '',
    });
    assert.deepEqual(map({ inbound_kind: 'link', link: { url: 'https://a.vn' }, caption: 'xem nhé' }), {
        link: { url: 'https://a.vn' },
        content: 'xem nhé',
    });
    assert.deepEqual(map({ inbound_kind: 'call', call: { media: 'voice' } }), { call: { media: 'voice' }, content: '' });
    assert.deepEqual(
        map({ inbound_kind: 'bank_card', bank_card_source: { label: '[Tài khoản ngân hàng]', data_url: 'https://x' } }),
        {
            bank_card_source: { label: '[Tài khoản ngân hàng]', data_url: 'https://x' },
            content: '[Tài khoản ngân hàng]',
        }
    );
});

test('1.10: sticker/danh thiếp nhận giá trị lane tự resolve (live gọi API, backfill dựng từ mã)', () => {
    assert.deepEqual(
        applyInboundDescriptorToPayload({}, { inbound_kind: 'sticker', sticker: { id: 1 } }, { sticker: { id: 1, url: 'https://cdn/s.png' } }),
        { sticker: { id: 1, url: 'https://cdn/s.png' } }
    );
    assert.deepEqual(
        applyInboundDescriptorToPayload({}, { inbound_kind: 'business_card', caption: null }, { businessCard: { name: 'A' } }),
        { business_card: { name: 'A' }, content: '' }
    );
});

// ── Vị trí: hình dạng THẬT (g1-inbound-evidence §6, toạ độ giả) ──────────────

test('vị trí: toạ độ nằm trong CHUỖI JSON content.params, địa chỉ ở description', () => {
    // message 878 (07/09/2026): msgType chat.location.new, params là chuỗi JSON.
    const content = {
        title: null,
        description: 'Số 1 Đường Giả Định, Phường Ảo, Quận 1, TP.HCM',
        href: null,
        thumb: null,
        action: null,
        params: '{"isUserLocation":1,"srcId":"0","latitude":10.111111,"longitude":106.222222}',
        type: null,
    };
    assert.deepEqual(parseInboundLocation(content), {
        latitude: 10.111111,
        longitude: 106.222222,
        address: 'Số 1 Đường Giả Định, Phường Ảo, Quận 1, TP.HCM',
        url: 'https://maps.google.com/?q=10.111111,106.222222',
    });
});

test('vị trí: nhận cả chat.location (cũ) và chat.location.new (Zalo hiện tại)', () => {
    assert.equal(isLocationMsgType('chat.location'), true);
    assert.equal(isLocationMsgType('chat.location.new'), true);
    assert.equal(isLocationMsgType('chat.text'), false);
});

test('vị trí: params là object (không phải chuỗi) vẫn đọc được; params hỏng → rơi về tầng ngoài', () => {
    assert.equal(parseInboundLocation({ params: { latitude: 1.5, longitude: 2.5 } })?.latitude, 1.5);
    assert.equal(parseInboundLocation({ params: 'khong-phai-json', lat: 3.5, lng: 4.5 })?.longitude, 4.5);
    assert.equal(parseInboundLocation({ params: '{"isUserLocation":1}' }), null);
});

// ── Mention trong nhóm ───────────────────────────────────────────────────────

test('mention: uid/pos/len của zca → external_id/offset/length, tên lấy từ đoạn @… trong text', () => {
    assert.deepEqual(
        normalizeMentions({
            content: '@Minh Anh xem giúp đơn này nhé',
            mentions: [{ uid: '555000111', pos: 0, len: 9, type: 0 }],
        }),
        [{ external_id: '555000111', name: 'Minh Anh', offset: 0, length: 9 }]
    );
});

test('mention: đọc cả content.mentions; mục thiếu uid/độ dài bị bỏ; không có mention → null', () => {
    assert.deepEqual(
        normalizeMentions({ content: { title: 'chào @An', mentions: [{ uid: '9', pos: 6, len: 3 }] } }),
        [{ external_id: '9', name: 'An', offset: 6, length: 3 }]
    );
    assert.equal(normalizeMentions({ content: 'x', mentions: [{ pos: 0, len: 2 }] }), null);
    assert.equal(normalizeMentions({ content: 'x' }), null);
    assert.equal(normalizeMentions(null), null);
});

// ── Ngữ cảnh nhóm (Q3) ───────────────────────────────────────────────────────

test('nhóm: thread {type,id,name,avatar} + sender {external_id,name,avatar} + mentions', () => {
    const payload = applyGroupContextToPayload(
        {},
        {
            threadId: '7788',
            groupProfile: { name: 'Nhóm Bán Hàng', avatar: 'https://cdn.test/g.jpg' },
            senderUid: '555000111',
            senderName: 'Minh Anh',
            senderAvatar: 'https://cdn.test/u.jpg',
            mentions: [{ external_id: '1', name: 'An', offset: 0, length: 3 }],
        }
    );
    assert.deepEqual(payload.thread, {
        type: 'group',
        id: '7788',
        name: 'Nhóm Bán Hàng',
        avatar: 'https://cdn.test/g.jpg',
    });
    assert.deepEqual(payload.sender, {
        external_id: '555000111',
        name: 'Minh Anh',
        avatar: 'https://cdn.test/u.jpg',
    });
    assert.equal(payload.sender_uid, '555000111');
    assert.equal(payload.mentions.length, 1);
});

test('nhóm: chưa biết tên nhóm/tên người gửi → rơi về id, KHÔNG bỏ trống thread', () => {
    const payload = applyGroupContextToPayload({}, { threadId: '7788', senderUid: '999' });
    assert.deepEqual(payload.thread, { type: 'group', id: '7788', name: '7788' });
    assert.deepEqual(payload.sender, { external_id: '999', name: '999' });
    assert.equal('mentions' in payload, false);
    assert.equal('avatar' in payload.thread, false);
});
