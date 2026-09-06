<?php

namespace App\Jobs;

use App\Models\Account;
use App\Models\Conversation;
use App\Models\User;
use App\Support\CurrentUser;
use App\Support\DateRangeHelper;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Str;

// Port từ refs/chatwoot/app/jobs/bulk_actions_job.rb (nhánh Conversation).
class BulkActionsJob extends ApplicationJob
{
    public const SUPPORTED_MODEL = 'Conversation';

    /** @param array<string, mixed> $params */
    public function __construct(
        public readonly Account $account,
        public readonly ?User $user,
        public readonly array $params,
    ) {
        $this->onQueue('medium');
    }

    public function handle(): void
    {
        $records = $this->recordsToUpdate();

        if ($records === null) {
            return;
        }

        // Current.user của bản gốc — quyết định tên chủ thể trong activity message.
        CurrentUser::runAs($this->user, fn () => $this->bulkUpdate($records));
    }

    /** @param Collection<int, Conversation> $records */
    private function bulkUpdate(Collection $records): void
    {
        // Bản gốc gỡ nhãn cho TOÀN BỘ hội thoại trước, rồi mới sang vòng thêm nhãn
        // + đổi trường của từng hội thoại.
        foreach ($records as $conversation) {
            $conversation->removeLabels($this->params['labels']['remove'] ?? null);
        }

        $fields = $this->availableFields();
        $snoozedUntil = $this->params['snoozed_until'] ?? null;

        foreach ($records as $conversation) {
            $conversation->addLabels($this->params['labels']['add'] ?? null);

            if (filled($snoozedUntil)) {
                $conversation->snoozed_until = DateRangeHelper::parseDateTime((string) $snoozedUntil);
            }

            if ($fields !== null) {
                $conversation->update($fields);
            }
        }
    }

    /** @return array<string, mixed>|null */
    private function availableFields(): ?array
    {
        $fields = $this->params['fields'] ?? null;

        if (! is_array($fields)) {
            return null;
        }

        // status = null bị bỏ (không ghi đè trạng thái hiện tại).
        if (array_key_exists('status', $fields) && $fields['status'] === null) {
            unset($fields['status']);
        }

        if (array_key_exists('status', $fields)) {
            $fields['status'] = Conversation::statusFromName((string) $fields['status']);
        }

        // Khác bản gốc: team_id = 0 phải về null, cột có khóa ngoại thật.
        if (array_key_exists('team_id', $fields) && ! ((int) $fields['team_id'] > 0)) {
            $fields['team_id'] = null;
        }

        return $fields;
    }

    /** @return Collection<int, Conversation>|null */
    private function recordsToUpdate(): ?Collection
    {
        if (Str::studly((string) ($this->params['type'] ?? '')) !== self::SUPPORTED_MODEL) {
            return null;
        }

        $query = Conversation::query()
            ->where('account_id', $this->account->id)
            ->whereIn('display_id', (array) ($this->params['ids'] ?? []));

        // Conversations::PermissionFilterService: agent chỉ đụng được hội thoại
        // thuộc inbox mình là member.
        $accountUser = $this->user?->accountUsers()->where('account_id', $this->account->id)->first();

        if ($accountUser === null || ! $accountUser->isAdministrator()) {
            $inboxIds = $this->user?->inboxes()->where('inboxes.account_id', $this->account->id)->pluck('inboxes.id') ?? collect();
            $query->whereIn('inbox_id', $inboxIds);
        }

        return $query->get();
    }
}
