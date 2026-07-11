import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    contentLabelFromObject,
    enrichInboundBody,
    parseBankCardHtml,
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
