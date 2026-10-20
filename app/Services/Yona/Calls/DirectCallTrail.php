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

// Dấu vết cuộc gọi 1-1: khi phòng đóng, mỗi bên một tin hoạt động trong hội thoại của mình, lời
// theo vai và theo ngôn ngữ hộp thư của người đó (người gọi thấy "Không ai nghe máy", người nhận
// thấy "Cuộc gọi nhỡ"…). Tin mang `call` để nút Gọi lại dưới tin biết gọi lại kiểu gì.
final readonly class DirectCallTrail implements CallTrail
{
    private const DURATION_PARTS = 2;

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

        $conversation->messages()->create([
            'account_id' => $conversation->account_id,
            'inbox_id' => $conversation->inbox_id,
            'message_type' => Message::TYPE_ACTIVITY,
            'content' => $content,
            'content_attributes' => [
                'call' => [
                    'id' => $call->id,
                    'kind' => $call->kind,
                    'status' => $call->status->value,
                    'media' => $call->media->value,
                    'duration_seconds' => $durationSeconds,
                ],
            ],
        ]);
    }
}
