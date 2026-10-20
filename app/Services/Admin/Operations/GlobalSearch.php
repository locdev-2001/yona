<?php

namespace App\Services\Admin\Operations;

use App\Models\Account;
use App\Models\Contact;
use App\Models\Inbox;
use App\Models\User;
use App\Support\SuperAdminArea;
use Illuminate\Database\Eloquent\Builder;

// Tìm nhanh toàn hệ thống cho bảng lệnh (Ctrl+K) của console: account, người
// dùng, hộp thư, liên hệ — mỗi loại vài kết quả. Số nguyên khớp đúng id.
final class GlobalSearch
{
    public const PER_TYPE = 5;

    public const MIN_LENGTH = 2;

    /** @return list<array{type: string, id: int, title: string, subtitle: ?string, url: string}> */
    public function search(string $query, int $perType = self::PER_TYPE): array
    {
        $query = trim($query);

        if (mb_strlen($query) < self::MIN_LENGTH && ! ctype_digit($query)) {
            return [];
        }

        $like = '%'.DataBrowser::escapeLike($query).'%';
        $id = ctype_digit($query) && strlen($query) < 19 ? (int) $query : null;

        return [
            ...$this->accounts($like, $id, $perType),
            ...$this->users($like, $id, $perType),
            ...$this->inboxes($like, $id, $perType),
            ...$this->contacts($query, $like, $id, $perType),
        ];
    }

    private function accounts(string $like, ?int $id, int $limit): array
    {
        return $this->matching(Account::query()->personal(), ['name'], $like, $id)
            ->limit($limit)
            ->get(['id', 'name', 'status'])
            ->map(fn (Account $account) => $this->result('account', $account->id, (string) $account->name,
                "#{$account->id}".($account->isActive() ? '' : ' · '.__('admin_operations.SEARCH.SUSPENDED')),
                SuperAdminArea::url("accounts/{$account->id}/overview")))
            ->all();
    }

    private function users(string $like, ?int $id, int $limit): array
    {
        return $this->matching(User::query(), ['name', 'display_name', 'email'], $like, $id)
            ->limit($limit)
            ->get(['id', 'name', 'email'])
            ->map(fn (User $user) => $this->result('user', $user->id, (string) $user->name, $user->email,
                SuperAdminArea::url("users/{$user->id}")))
            ->all();
    }

    private function inboxes(string $like, ?int $id, int $limit): array
    {
        return $this->matching(Inbox::query()->with('account:id,name'), ['name'], $like, $id)
            ->limit($limit)
            ->get(['id', 'name', 'account_id', 'channel_type'])
            ->map(fn (Inbox $inbox) => $this->result('inbox', $inbox->id, (string) $inbox->name,
                implode(' · ', array_filter([$inbox->account?->name, str_replace('Channel::', '', (string) $inbox->channel_type)])),
                SuperAdminArea::url("accounts/{$inbox->account_id}/overview")))
            ->all();
    }

    private function contacts(string $query, string $like, ?int $id, int $limit): array
    {
        // Số gõ kiểu 090 123 4567 vẫn khớp bản ghi lưu +84901234567: bỏ dấu cách và số 0 đầu.
        $digits = ltrim((string) preg_replace('/\D+/', '', $query), '0');
        $phoneLike = strlen($digits) >= 6 && $digits !== $query ? '%'.$digits.'%' : null;

        return $this->matching(Contact::query()->with('account:id,name'), ['name', 'email', 'phone_number'], $like, $id, $phoneLike)
            ->limit($limit)
            ->get(['id', 'name', 'email', 'phone_number', 'account_id'])
            ->map(fn (Contact $contact) => $this->result('contact', $contact->id, (string) ($contact->name ?: $contact->phone_number ?: $contact->email ?: "#{$contact->id}"),
                implode(' · ', array_filter([$contact->phone_number, $contact->email, $contact->account?->name])),
                SuperAdminArea::url("data/contacts?filter[id]={$contact->id}")))
            ->all();
    }

    /** @param  list<string>  $columns */
    private function matching(Builder $builder, array $columns, string $like, ?int $id, ?string $phoneLike = null): Builder
    {
        return $builder->where(function (Builder $inner) use ($columns, $like, $id, $phoneLike) {
            foreach ($columns as $column) {
                $inner->orWhere($column, 'ilike', $like);
            }
            if ($id !== null) {
                $inner->orWhere($inner->getModel()->getKeyName(), $id);
            }
            if ($phoneLike !== null) {
                $inner->orWhere('phone_number', 'ilike', $phoneLike);
            }
        })->orderByDesc('id');
    }

    /** @return array{type: string, id: int, title: string, subtitle: ?string, url: string} */
    private function result(string $type, int $id, string $title, ?string $subtitle, string $url): array
    {
        return ['type' => $type, 'id' => $id, 'title' => $title, 'subtitle' => $subtitle ?: null, 'url' => $url];
    }
}
