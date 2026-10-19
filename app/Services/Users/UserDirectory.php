<?php

namespace App\Services\Users;

use App\Models\User;
use Illuminate\Support\Collection;

// Tìm người dùng để nhắn tin và dựng thẻ hồ sơ công khai. Chỉ người đã chọn
// username mới tìm thấy được; không bao giờ trả email hay số điện thoại.
class UserDirectory
{
    public const MIN_QUERY_LENGTH = 2;

    public const MAX_RESULTS = 20;

    /** @return Collection<int, array<string, mixed>> */
    public function search(User $viewer, string $query): Collection
    {
        $term = trim(ltrim(trim($query), '@'));

        if (mb_strlen($term) < self::MIN_QUERY_LENGTH) {
            return collect();
        }

        $usernamePrefix = addcslashes(Username::normalize($term), '%_\\').'%';
        $nameTerm = '%'.addcslashes($term, '%_\\').'%';

        return User::query()
            ->whereNotNull('username')
            ->whereKeyNot($viewer->getKey())
            ->where(fn ($match) => $match
                ->where('username', 'like', $usernamePrefix)
                ->orWhereRaw('search_fold(coalesce(display_name, name)) like search_fold(?)', [$nameTerm]))
            ->orderByRaw('CASE WHEN username = ? THEN 0 WHEN username LIKE ? THEN 1 ELSE 2 END', [Username::normalize($term), $usernamePrefix])
            ->orderBy('username')
            ->limit(self::MAX_RESULTS)
            ->get()
            ->map(fn (User $user) => $this->card($user));
    }

    /** @return array<string, mixed> */
    public function card(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->availableName(),
            'username' => $user->username,
            'avatar_url' => $user->avatarUrl(),
            'bio' => $user->bio,
        ];
    }
}
