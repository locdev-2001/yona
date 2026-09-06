<?php

namespace App\Console\Commands;

use App\Models\Account;
use App\Models\Contact;
use App\Support\AnonymousName;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Collection;

/**
 * Đổi tên khách vô danh còn mang tên máy kiểu haikunator ("odd-wave-872") sang
 * tên dễ đọc của App\Support\AnonymousName ("Gấu mèo ẩn danh").
 *
 * Chạy lại được nhiều lần: tên mới không còn khớp mẫu haikunator nên lượt sau bỏ qua.
 */
class RenameAnonymousContacts extends Command
{
    /** Mẫu tên do haikunator sinh: hai từ thường nối bằng gạch nối, kết bằng số. */
    private const LEGACY_NAME_PATTERN = '^[a-z]+-[a-z]+-[0-9]+$';

    protected $signature = 'contacts:rename-anonymous
        {--account=* : Chỉ xử lý những account này (mặc định: mọi account)}
        {--dry-run : Chỉ liệt kê contact sẽ bị đổi tên, không ghi gì}';

    protected $description = 'Đổi tên contact vô danh còn mang tên haikunator sang tên dễ đọc';

    public function handle(): int
    {
        $accounts = $this->accounts();

        if ($accounts->isEmpty()) {
            $this->components->warn('Không tìm thấy account nào khớp --account.');

            return self::FAILURE;
        }

        $total = 0;
        foreach ($accounts as $account) {
            $total += $this->processAccount($account);
        }

        $this->components->info(
            $this->option('dry-run')
                ? "Thử chạy: $total contact sẽ được đổi tên."
                : "Đã đổi tên $total contact."
        );

        return self::SUCCESS;
    }

    private function processAccount(Account $account): int
    {
        $renamed = 0;

        foreach ($this->legacyContacts($account)->cursor() as $contact) {
            if ($this->option('dry-run')) {
                $this->line(sprintf('  account %d · #%d  %s', $account->id, $contact->id, $contact->name));
                $renamed++;

                continue;
            }

            $oldName = $contact->name;
            $contact->update(['name' => AnonymousName::forAccount($account)]);
            $this->line(sprintf('  account %d · #%d  %s → %s', $account->id, $contact->id, $oldName, $contact->name));
            $renamed++;
        }

        return $renamed;
    }

    /** @return HasMany<Contact, Account> */
    private function legacyContacts(Account $account): HasMany
    {
        return $account->contacts()
            ->whereRaw('name ~ ?', [self::LEGACY_NAME_PATTERN])
            ->orderBy('id');
    }

    /** @return Collection<int, Account> */
    private function accounts(): Collection
    {
        $ids = array_filter((array) $this->option('account'));

        return Account::query()
            ->when($ids !== [], fn (Builder $query) => $query->whereIn('id', $ids))
            ->orderBy('id')
            ->get();
    }
}
