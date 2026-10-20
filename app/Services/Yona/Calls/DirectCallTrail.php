<?php

namespace App\Services\Yona\Calls;

use App\Models\Call;
use App\Models\Message;
use App\Models\User;
use App\Services\Calls\CallStatus;
use App\Services\Calls\Kinds\CallTrail;
use App\Services\Users\PersonalAccounts;
use App\Services\Yona\YonaRelay;
use Carbon\CarbonInterval;

// Dấu vết cuộc gọi 1-1: khi phòng đóng, mỗi bên một tin nhật ký cuộc gọi trong hội thoại của mình,
// như một tin nhắn thường: người gọi thấy tin đi, người nhận thấy tin đến. `content` là lời theo vai
// và ngôn ngữ hộp thư (xem trước trong danh sách, tìm kiếm); `content_attributes.call` theo hợp đồng
// nhật ký cuộc gọi chung của mọi kênh (media, direction, outcome, duration_seconds) để bong bóng vẽ.
// Hai bản mang chung `source_id` nên không bị gửi ra kênh và không ghi trùng.
final readonly class DirectCallTrail implements CallTrail
{
    private const DURATION_PARTS = 2;

    public const SOURCE_PREFIX = 'yona-call:';

    // Trạng thái kết thúc → kết cục trong hợp đồng nhật ký cuộc gọi.
    private const OUTCOMES = [
        'ended' => 'completed',
        'missed' => 'missed',
        'declined' => 'declined',
        'cancelled' => 'canceled',
    ];

    // Người nhận đã tự nghe hoặc tự từ chối thì tin đó không tính là chưa đọc.
    private const CALLEE_HANDLED = ['ended', 'declined'];

    // Trạng thái kết thúc → [khoá cho người gọi, khoá cho người nhận].
    private const OUTCOME_KEYS = [
        'missed' => ['DIRECT_NO_ANSWER', 'DIRECT_MISSED'],
        'declined' => ['DIRECT_DECLINED_BY_PEER', 'DIRECT_YOU_DECLINED'],
        'cancelled' => ['DIRECT_CANCELLED', 'DIRECT_MISSED'],
    ];

    public function __construct(
        private PersonalAccounts $accounts,
        private YonaRelay $relay,
    ) {}

    public function roomStarted(Call $call): void {}

    public function roomFinished(Call $call): void
    {
        $caller = User::query()->find($call->caller_id);
        $callee = User::query()->find($call->callee_id);

        if ($caller === null || $callee === null || in_array($call->status, [CallStatus::Ringing, CallStatus::Active], true)) {
            return;
        }

        $durationSeconds = $call->answered_at === null ? null : (int) $call->answered_at->diffInSeconds($call->ended_at);
        $this->post($call, $caller, $callee, 0, $durationSeconds);
        $this->post($call, $callee, $caller, 1, $durationSeconds);
    }

    private function post(Call $call, User $owner, User $peer, int $side, ?int $durationSeconds): void
    {
        $account = $this->accounts->ensureFor($owner);
        $locale = $account->locale ?? (string) config('app.locale');
        $conversation = $this->relay->openWith($account, $peer);

        $content = $call->status === CallStatus::Ended && $durationSeconds !== null
            ? __($call->media->value === 'video' ? 'calls.ACTIVITY.DIRECT_ENDED_VIDEO' : 'calls.ACTIVITY.DIRECT_ENDED_VOICE', [
                'duration' => CarbonInterval::seconds($durationSeconds)->cascade()->locale($locale)->forHumans(['parts' => self::DURATION_PARTS]),
            ], $locale)
            : __('calls.ACTIVITY.'.(self::OUTCOME_KEYS[$call->status->value][$side] ?? 'DIRECT_MISSED'), [], $locale);

        $isCaller = $side === 0;
        $sourceId = self::SOURCE_PREFIX.$call->id;

        if ($conversation->messages()->where('source_id', $sourceId)->exists()) {
            return;
        }

        $conversation->messages()->create([
            'account_id' => $conversation->account_id,
            'inbox_id' => $conversation->inbox_id,
            'message_type' => $isCaller ? Message::TYPE_OUTGOING : Message::TYPE_INCOMING,
            'sender_type' => $isCaller ? $owner->getMorphClass() : $conversation->contact?->getMorphClass(),
            'sender_id' => $isCaller ? $owner->id : $conversation->contact_id,
            'source_id' => $sourceId,
            'content' => $content,
            'content_attributes' => [
                'call' => [
                    'id' => $call->id,
                    'kind' => $call->kind,
                    'status' => $call->status->value,
                    'media' => $call->media->value === 'video' ? 'video' : 'voice',
                    'direction' => $isCaller ? 'outbound' : 'inbound',
                    'outcome' => self::OUTCOMES[$call->status->value] ?? 'missed',
                    'duration_seconds' => $durationSeconds,
                ],
            ],
        ]);

        if (! $isCaller && in_array($call->status->value, self::CALLEE_HANDLED, true)) {
            $conversation->forceFill(['agent_last_seen_at' => now()])->save();
        }
    }
}
