<?php

namespace App\Jobs\Conversations;

use App\Jobs\ApplicationJob;
use App\Models\Account;
use App\Models\Conversation;
use App\Services\MessageTemplates\Template\AutoResolve;
use Illuminate\Database\Eloquent\Collection;

// Đóng hội thoại nguội của MỘT account; scheduler rải job này cho từng account.
class ResolutionJob extends ApplicationJob
{
    public function __construct(public readonly Account $account)
    {
        $this->onQueue('low');
    }

    public function handle(): void
    {
        foreach ($this->resolvableConversations() as $conversation) {
            (new AutoResolve($conversation))->perform();

            $label = $this->account->setting('auto_resolve_label');

            if (filled($label)) {
                $conversation->addLabels($label);
            }

            $conversation->toggleStatus();
        }
    }

    /** @return Collection<int, Conversation> */
    private function resolvableConversations(): iterable
    {
        return $this->account->conversations()
            ->resolvable(
                $this->account->setting('auto_resolve_after'),
                (bool) $this->account->setting('auto_resolve_ignore_waiting'),
            )
            // Hồ sơ khách vừa bị xóa nhưng hội thoại chưa dọn xong: `mute?` của
            // bản gốc nổ khi contact null, nên bỏ qua hẳn nhóm mồ côi này.
            ->whereNotNull('contact_id')
            ->limit(config('limits.bulk_actions'))
            ->get();
    }
}
