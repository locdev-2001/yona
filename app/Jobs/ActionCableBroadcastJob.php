<?php

namespace App\Jobs;

use App\Events\EventType;
use App\Events\RealtimeBroadcast;
use App\Http\Resources\ConversationResource;
use App\Models\Account;

// Port từ refs/chatwoot/app/jobs/action_cable_broadcast_job.rb.
class ActionCableBroadcastJob extends ApplicationJob
{
    public const CONVERSATION_UPDATE_EVENTS = [
        EventType::CONVERSATION_READ,
        EventType::CONVERSATION_UPDATED,
        EventType::TEAM_CHANGED,
        EventType::ASSIGNEE_CHANGED,
        EventType::CONVERSATION_STATUS_CHANGED,
    ];

    /** @param list<string> $members */
    public function __construct(
        public readonly array $members,
        public readonly string $eventName,
        public readonly array $data,
    ) {
        $this->onQueue('critical');
    }

    public function handle(): void
    {
        if ($this->members === []) {
            return;
        }

        $broadcastData = $this->prepareBroadcastData();

        foreach ($this->members as $member) {
            broadcast(new RealtimeBroadcast($member, $this->eventName, $broadcastData));
        }
    }

    // Với event cập nhật hội thoại, đọc lại bản mới nhất khi job chạy để
    // client không nhận dữ liệu cũ khi các event tới sai thứ tự lúc tải cao
    // (giống gốc: payload thay hoàn toàn, chỉ giữ account_id).
    private function prepareBroadcastData(): array
    {
        if (! in_array(EventType::tryFrom($this->eventName), self::CONVERSATION_UPDATE_EVENTS, true)) {
            return $this->data;
        }

        $conversation = Account::query()->findOrFail($this->data['account_id'])
            ->conversations()
            ->where('display_id', $this->data['id'])
            ->firstOrFail();

        return [...ConversationResource::pushEventData($conversation), 'account_id' => $this->data['account_id']];
    }
}
