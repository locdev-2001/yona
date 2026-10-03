<?php

use App\Models\Channel\Email;
use App\Services\Imap\FetchEmailService;
use App\Services\Imap\ImapSyncCursor;

it('cursor giữ riêng UID lỗi để thử lại và không chặn thư mới', function () {
    $channel = Email::factory()->create();
    $cursor = new ImapSyncCursor($channel, ['uidvalidity' => 100]);
    $cursor->select([9, 5, 7]);
    $cursor->completed(5);
    $cursor->completed(9);
    $cursor->checkpoint();

    expect($channel->refresh()->imap_sync_state['last_uid'])->toBe(9);
    $next = new ImapSyncCursor($channel, ['uidvalidity' => 100]);
    expect($next->criteria('01-Oct-2026'))->toBe(['UID 7,10:*'])
        ->and($next->select([5, 7, 9]))->toBe([7]);
});

it('UIDVALIDITY đổi thì quét lại toàn hộp thư và chống trùng bằng Message-ID', function () {
    $channel = Email::factory()->create();
    $cursor = new ImapSyncCursor($channel, ['uidvalidity' => 100]);
    $cursor->select([500]);
    $cursor->completed(500);
    $cursor->checkpoint();

    $next = new ImapSyncCursor($channel, ['uidvalidity' => 200]);
    expect($next->criteria('01-Oct-2026'))->toBe(['ALL'])
        ->and($next->select([1, 2]))->toBe([1, 2]);
    $next->completed(1);
    $next->checkpoint();

    expect($channel->refresh()->imap_sync_state)->toMatchArray(['uidvalidity' => 200, 'last_uid' => 2, 'pending_uids' => [2]]);
});

it('không nhảy qua thư khi cửa sổ có hơn 500 thư', function () {
    $channel = Email::factory()->create();
    $cursor = new ImapSyncCursor($channel, ['uidvalidity' => 100]);
    expect($cursor->select(array_reverse(range(1, 700))))->toBe(range(1, FetchEmailService::MAX_MESSAGES_PER_SYNC));
    foreach (range(1, 500) as $uid) {
        $cursor->completed($uid);
    }
    $cursor->checkpoint();

    $next = new ImapSyncCursor($channel, ['uidvalidity' => 100]);
    expect($next->select(range(501, 700)))->toBe(range(501, 700));
});

it('lượt đầu không có thư trong cửa sổ thì giữ UIDNEXT để không nhập lại thư cũ', function () {
    $channel = Email::factory()->create();
    $cursor = new ImapSyncCursor($channel, ['uidvalidity' => 100, 'uidnext' => 501]);
    $cursor->select([]);
    $cursor->checkpoint();

    $next = new ImapSyncCursor($channel, ['uidvalidity' => 100]);
    expect($next->criteria('01-Oct-2026'))->toBe(['UID 501:*'])
        ->and($next->select([500]))->toBe([]);
});

it('đổi tài khoản IMAP không mang cursor của hộp thư cũ sang', function () {
    $channel = Email::factory()->create(['imap_login' => 'first@example.test']);
    $cursor = new ImapSyncCursor($channel, ['uidvalidity' => 100]);
    $cursor->select([500]);
    $cursor->completed(500);
    $cursor->checkpoint();
    $channel->update(['imap_login' => 'second@example.test']);

    $next = new ImapSyncCursor($channel, ['uidvalidity' => 100]);
    expect($next->criteria('01-Oct-2026'))->toBe(['SINCE "01-Oct-2026"'])
        ->and($next->select([1]))->toBe([1]);
});

it('thiếu UIDVALIDITY thì không lưu cursor có thể bỏ sót thư', function () {
    $channel = Email::factory()->create();
    $cursor = new ImapSyncCursor($channel, []);
    $cursor->select([1]);
    $cursor->completed(1);
    $cursor->checkpoint();

    expect($channel->refresh()->imap_sync_state)->toBeNull();
});

it('nhiều thư lỗi không chiếm hết lượt quét và vẫn nhận thư mới', function () {
    $channel = Email::factory()->create();
    $cursor = new ImapSyncCursor($channel, ['uidvalidity' => 100]);
    $cursor->select(range(1, 500));
    $cursor->checkpoint();

    $next = new ImapSyncCursor($channel, ['uidvalidity' => 100]);
    $selected = $next->select(range(1, 900));
    expect($selected)->toBe([...range(1, 100), ...range(501, 900)]);
    foreach (range(501, 900) as $uid) {
        $next->completed($uid);
    }
    $next->checkpoint();
    expect($channel->refresh()->imap_sync_state['last_uid'])->toBe(900)
        ->and(array_slice($channel->imap_sync_state['pending_uids'], 0, 100))->toBe(range(101, 200));
});

it('thư đang chờ đã bị xóa trên máy chủ thì bỏ UID đó khỏi danh sách thử lại', function () {
    $channel = Email::factory()->create();
    $cursor = new ImapSyncCursor($channel, ['uidvalidity' => 100]);
    $cursor->select([41]);
    $cursor->checkpoint();

    $next = new ImapSyncCursor($channel, ['uidvalidity' => 100]);
    expect($next->criteria('01-Oct-2026'))->toBe(['UID 41,42:*']);
    $next->select([]);
    $next->checkpoint();
    expect($channel->refresh()->imap_sync_state['pending_uids'])->toBe([]);
});
