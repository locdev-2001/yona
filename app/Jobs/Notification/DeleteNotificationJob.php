<?php

namespace App\Jobs\Notification;

use App\Jobs\ApplicationJob;
use App\Models\Account;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Facades\DB;

// Port từ refs/chatwoot/app/jobs/notification/delete_notification_job.rb.
class DeleteNotificationJob extends ApplicationJob
{
    public const TYPE_ALL = 'all';

    public const TYPE_READ = 'read';

    public function __construct(
        private readonly User $user,
        private readonly Account $account,
        private readonly string $type = self::TYPE_ALL,
    ) {
        $this->onQueue('low');
    }

    public function handle(): void
    {
        $query = Notification::query()
            ->where('user_id', $this->user->id)
            ->where('account_id', $this->account->id)
            ->when($this->type === self::TYPE_READ, fn ($builder) => $builder->whereNotNull('read_at'));

        DB::transaction(fn () => $query->get()->each(fn (Notification $notification) => $notification->delete()));
    }
}
