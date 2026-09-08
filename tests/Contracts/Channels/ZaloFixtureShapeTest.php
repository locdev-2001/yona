<?php

use Illuminate\Support\Arr;
use Illuminate\Support\Str;

/**
 * Khoá hình dạng bộ fixture vàng `tests/Fixtures/channels/zalo/real/*.json`
 * (zalo-deep-audit 7.4). Fixture là payload THẬT của bridge đã che PII: sai một
 * khoá là driver đọc trượt mà test vẫn xanh nhờ nhánh không tồn tại ngoài đời.
 *
 * Ba thứ được khoá ở đây:
 *   1. mọi file phải khai trong bảng dưới (thêm fixture mà quên khai = đỏ);
 *   2. khoá bắt buộc theo từng loại tin, gồm cả khoá lồng trong `listener_data`;
 *   3. PII giả PHẢI nhất quán — uid, tên người, host media đều lấy từ bảng cố
 *      định, nên không có uid/tên/URL thật nào lọt vào repo.
 */
const ZALO_REAL_DIR = 'tests/Fixtures/channels/zalo/real';

// Bảng PII giả dùng chung cho cả bộ.
const ZALO_FAKE_UIDS = [
    '7700000000000001', // tài khoản Zalo của tenant (Chủ Shop)
    '8800000000000002', // khách 1-1 — Khách A
    '9900000000000003', // nhóm — Nhóm Khách Sỉ
    '8800000000000004', // Khách B (nói trong nhóm)
    '8800000000000005', // Khách C (bị nhắc tên)
    '8800000000000006', // Khách D (người trong danh thiếp)
    '8800000000000007', // Khách E (gửi lời mời kết bạn)
];

const ZALO_FAKE_NAMES = [
    'Khách A', 'Khách B', 'Khách C', 'Khách D', 'Khách E', 'Chủ Shop', 'Nhóm Khách Sỉ',
];

// `qr.thanhtoan.test` = bên thứ ba khách chia sẻ link tới (thẻ liên kết) — không phải host của Zalo.
const ZALO_ALLOWED_HOSTS = ['cdn.zalo.test', 'zalo.test', 'zinstant.zalo.test', 'maps.google.com', 'qr.thanhtoan.test'];

/** Khoá bắt buộc cho MỌI payload `type: inbound` (đúng envelope index.mjs dựng). */
const ZALO_INBOUND_KEYS = [
    'type', 'connection_id', 'bot_id', 'personal_uid', 'peer_uid', 'thread_id', 'thread_type',
    'source_id', 'is_self', 'direction', 'user.name', 'user.avatar', 'platform_sent_at',
    'inbound_kind', 'msg_type', 'listener_data.msgId', 'listener_data.cliMsgId', 'listener_data.msgType',
    'listener_data.uidFrom', 'listener_data.ts',
];

const ZALO_RELAY_KEYS = ['type', 'event_type', 'connection_id', 'bot_id', 'personal_uid', 'payload'];

/**
 * Fixture → khoá bắt buộc riêng của loại đó.
 *
 * @return array<string, list<string>>
 */
function zaloFixtureShapes(): array
{
    return [
        'text' => [...ZALO_INBOUND_KEYS, 'content'],
        'sticker' => [...ZALO_INBOUND_KEYS, 'sticker.id', 'sticker.catId', 'sticker.type', 'sticker.stickerUrl', 'sticker.stickerSpriteUrl', 'sticker.url', 'sticker.thumbnail', 'sticker.text'],
        'image' => [...ZALO_INBOUND_KEYS, 'content', 'media_url', 'media_filename'],
        'gif' => [...ZALO_INBOUND_KEYS, 'content', 'media_url', 'media_filename'],
        'file' => [...ZALO_INBOUND_KEYS, 'content', 'media_url', 'media_filename'],
        'business_card' => [...ZALO_INBOUND_KEYS, 'content', 'business_card.name', 'business_card.title', 'business_card.thumbnail', 'business_card.url', 'business_card.qr_code_url', 'business_card.phone', 'business_card.contact_uid'],
        // Thẻ liên kết: CÙNG msgType `chat.recommended` với danh thiếp, tách nhau
        // bằng `listener_data.content.action` (`recommened.link` vs `recommened.user`).
        'link_card' => [...ZALO_INBOUND_KEYS, 'content', 'link_preview.url', 'link_preview.image', 'link_preview.source', 'listener_data.content.action', 'listener_data.content.href', 'listener_data.content.params'],
        'bank_card' => [...ZALO_INBOUND_KEYS, 'content', 'bank_card.bank_name', 'bank_card.bank_bin', 'bank_card.account_number', 'bank_card.account_holder', 'bank_card.logo_url', 'bank_card.qr_url'],
        // Nhắc hẹn đi đường `chat.ecard`: dữ liệu thẻ nằm trong listener_data.content.
        'reminder_created' => [...ZALO_INBOUND_KEYS, 'content', 'listener_data.content.title', 'listener_data.content.description', 'listener_data.content.href', 'listener_data.content.params'],
        'reminder_due' => [...ZALO_INBOUND_KEYS, 'content', 'listener_data.content.title', 'listener_data.content.description', 'listener_data.content.href', 'listener_data.content.params'],
        // Toạ độ nằm trong CHUỖI JSON listener_data.content.params, địa chỉ ở description.
        'location' => [...ZALO_INBOUND_KEYS, 'location.latitude', 'location.longitude', 'location.address', 'location.url', 'listener_data.content.description', 'listener_data.content.params'],
        'quote' => [...ZALO_INBOUND_KEYS, 'content', 'quote.msg_id', 'quote.cli_msg_id', 'quote.quote_ts', 'quote.text', 'quote.sender_name'],
        'echo_webchat' => [...ZALO_INBOUND_KEYS, 'content', 'bridge_outbound_echo'],
        'group_text' => [...ZALO_INBOUND_KEYS, 'content', 'thread.type', 'thread.id', 'thread.name', 'sender_uid', 'sender.external_id', 'sender.name', 'mentions'],
        'reaction' => [...ZALO_RELAY_KEYS, 'payload.0.data.uidFrom', 'payload.0.data.content.rIcon', 'payload.0.data.content.rMsg.0.gMsgID', 'payload.0.isSelf'],
        'undo' => [...ZALO_RELAY_KEYS, 'source_id', 'payload.0.data.content.globalMsgId', 'payload.0.isSelf'],
        'seen' => [...ZALO_RELAY_KEYS, 'payload.0.0.data.msgId', 'payload.0.0.isSelf'],
        'delivered' => [...ZALO_RELAY_KEYS, 'payload.0.0.data.msgId', 'payload.0.0.data.deliveredUids', 'payload.0.0.isSelf'],
        'typing' => [...ZALO_RELAY_KEYS, 'payload.0.data.uid', 'payload.0.threadId', 'payload.0.isSelf'],
        'friend_request' => ['type', 'connection_id', 'bot_id', 'personal_uid', 'user.uid', 'user.name', 'user.avatar', 'message', 'source_id'],
    ];
}

/** @return array<string, array<string, mixed>> */
function zaloRealFixtures(): array
{
    $files = glob(base_path(ZALO_REAL_DIR.'/*.json')) ?: [];

    return collect($files)
        ->mapWithKeys(fn (string $path) => [
            basename($path, '.json') => json_decode((string) file_get_contents($path), true, flags: JSON_THROW_ON_ERROR),
        ])
        ->all();
}

/** Mọi giá trị chuỗi/số trong payload, kèm đường dẫn khoá — để soi PII. */
function zaloFlatten(mixed $value, string $prefix = ''): array
{
    if (! is_array($value)) {
        return [$prefix => $value];
    }

    $flat = [];
    foreach ($value as $key => $child) {
        $flat += zaloFlatten($child, $prefix === '' ? (string) $key : "{$prefix}.{$key}");
    }

    return $flat;
}

it('bộ fixture vàng khai đủ và không thừa file', function () {
    expect(array_keys(zaloRealFixtures()))->toEqualCanonicalizing(array_keys(zaloFixtureShapes()));
});

it('mỗi fixture ghi nguồn gốc payload', function () {
    foreach (zaloRealFixtures() as $name => $payload) {
        expect(Arr::has($payload, ['_source.message_id', '_source.captured_at', '_source.origin']))
            ->toBeTrue("fixture {$name} thiếu khối _source")
            ->and($payload['_source']['origin'])->toBeIn(['captured', 'contract']);
    }
});

it('mỗi fixture giữ đủ khoá bắt buộc của loại tin đó', function () {
    foreach (zaloFixtureShapes() as $name => $keys) {
        $payload = zaloRealFixtures()[$name];

        foreach ($keys as $key) {
            expect(Arr::has($payload, $key))->toBeTrue("fixture {$name} thiếu khoá {$key}");
        }
    }
});

it('PII trong fixture là giả và nhất quán', function () {
    $uidKeys = ['personal_uid', 'peer_uid', 'thread_id', 'threadId', 'uidFrom', 'idTo', 'uid',
        'sender_uid', 'external_id', 'contact_uid', 'srcId'];
    $nameKeys = ['name', 'dName', 'sender_name', 'account_holder'];

    foreach (zaloRealFixtures() as $fixture => $payload) {
        foreach (zaloFlatten($payload) as $path => $value) {
            $leaf = Str::afterLast($path, '.');

            if (in_array($leaf, $uidKeys, true) && filled($value) && $value !== '0') {
                expect((string) $value)->toBeIn(ZALO_FAKE_UIDS, "{$fixture}.{$path} không dùng uid giả");
            }

            if (in_array($leaf, $nameKeys, true) && filled($value)) {
                expect((string) $value)->toBeIn([...ZALO_FAKE_NAMES, 'KHACH A'], "{$fixture}.{$path} không dùng tên giả");
            }

            if (is_string($value) && Str::startsWith($value, 'http')) {
                expect(parse_url($value, PHP_URL_HOST))->toBeIn(ZALO_ALLOWED_HOSTS, "{$fixture}.{$path} trỏ ra host thật");
            }
        }
    }
});

it('các fixture nối được thành một kịch bản: cùng tài khoản, source_id không trùng', function () {
    $fixtures = zaloRealFixtures();
    $sourceIds = [];

    foreach ($fixtures as $name => $payload) {
        expect($payload['personal_uid'])->toBe(ZALO_FAKE_UIDS[0], "fixture {$name} lệch tài khoản tenant");

        if (($payload['type'] ?? '') === 'inbound') {
            $sourceIds[] = $payload['source_id'];
        }
    }

    expect($sourceIds)->toHaveCount(count(array_unique($sourceIds)));

    // Sự kiện trạng thái phải trỏ vào tin có thật trong bộ (echo của tenant),
    // nếu không thì test "đã xem/đã nhận" xanh trên một tin không tồn tại.
    $echoSourceId = $fixtures['echo_webchat']['source_id'];
    expect($fixtures['seen']['payload'][0][0]['data']['msgId'])->toBe($echoSourceId)
        ->and($fixtures['delivered']['payload'][0][0]['data']['msgId'])->toBe($echoSourceId)
        ->and($fixtures['reaction']['payload'][0]['data']['content']['rMsg'][0]['gMsgID'])->toBe($echoSourceId)
        ->and((string) $fixtures['undo']['payload'][0]['data']['content']['globalMsgId'])
        ->toBe($fixtures['quote']['source_id']);
});
