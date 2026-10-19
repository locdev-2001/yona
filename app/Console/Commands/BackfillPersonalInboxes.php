<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\Users\Username;
use App\Services\Yona\YonaInboxes;
use Illuminate\Console\Command;

/**
 * Đưa mọi người dùng đang có về mô hình hộp thư cá nhân: gán @username cho người chưa
 * có (gợi ý từ email), và bảo đảm mỗi người có hộp thư cá nhân kèm kênh Yona.
 *
 * Chạy lại được nhiều lần: người đã có username và hộp thư thì bỏ qua.
 */
class BackfillPersonalInboxes extends Command
{
    protected $signature = 'users:backfill-personal-inboxes
        {--dry-run : Chỉ liệt kê việc sẽ làm, không ghi gì}';

    protected $description = 'Gán @username và tạo hộp thư cá nhân + kênh Yona cho mọi người dùng còn thiếu';

    public function handle(YonaInboxes $yonaInboxes): int
    {
        $isDryRun = (bool) $this->option('dry-run');
        $assigned = 0;
        $rows = [];

        User::query()->orderBy('id')->each(function (User $user) use ($yonaInboxes, $isDryRun, &$assigned, &$rows) {
            $username = $user->username;

            if ($username === null) {
                $username = Username::suggest($user->email, $user);
                $assigned++;

                if (! $isDryRun) {
                    $user->forceFill(['username' => $username])->save();
                }
            }

            $account = $isDryRun ? null : $yonaInboxes->ensureFor($user)->account;
            $rows[] = [$user->id, $user->email, '@'.$username, $account?->id ?? '-'];
        });

        $this->table(['user', 'email', 'username', 'account'], $rows);
        $this->components->info(($isDryRun ? 'Sẽ gán' : 'Đã gán')." username cho {$assigned} người dùng.");

        return self::SUCCESS;
    }
}
