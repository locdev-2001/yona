<?php

use App\Models\ContactInbox;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

// Port từ refs/chatwoot/app/channels/room_channel.rb#ensure_stream: mỗi user
// nghe 2 kênh private — pubsub_token riêng và account_{id} dùng chung.
// Thứ tự QUAN TRỌNG: Laravel duyệt pattern theo thứ tự đăng ký, pattern
// `{pubsubToken}` khớp mọi tên kênh nên phải nằm CUỐI, nếu không nó nuốt
// luôn `account_{id}` và so token với chuỗi "account_1" → 403.
Broadcast::channel('account_{accountId}', function (User $user, string $accountId) {
    return $user->accountUsers()->where('account_id', (int) $accountId)->exists();
});

// Khách của widget cũng nghe pubsub_token của chính mình (RoomChannel
// #current_user nhánh `params[:user_id].blank?` → ContactInbox.find_by!).
// Guard `web` thử trước để agent giữ nguyên hành vi cũ; guard `widget` tra
// contact_inbox theo pubsub_token gửi kèm trong body auth.
Broadcast::channel('{pubsubToken}', function (User|ContactInbox $listener, string $pubsubToken) {
    return $listener->pubsub_token === $pubsubToken;
}, ['guards' => ['web', 'widget']]);
