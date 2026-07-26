<?php

namespace App\Modules\Identity\Resolve;

use App\Models\Profile;
use App\Models\ProfileIdentity;
use App\Modules\Identity\Contracts\IdentityResolver;
use App\Modules\Identity\Data\ObservedIdentity;
use App\Modules\Identity\Data\ResolvedIdentity;
use App\Modules\Identity\Merge\MergeProfilesService;
use App\Modules\Identity\Merge\ProfileIdentificationService;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

class IdentityResolveService implements IdentityResolver
{
    public function __construct(
        private readonly ProfileIdentificationService $identification,
        private readonly MergeProfilesService $merge,
    ) {}

    public function resolve(string $workspaceId, string $key, string $value, ?string $channelAccountId = null): ?ResolvedIdentity
    {
        $identity = $this->findIdentity($workspaceId, $key, $value, $channelAccountId);

        return $identity === null ? null : $this->present($identity);
    }

    public function observe(ObservedIdentity $observation): ResolvedIdentity
    {
        $identity = $this->findIdentity(
            $observation->workspaceId,
            $observation->key,
            $observation->value,
            $observation->channelAccountId,
        );

        if ($identity !== null) {
            return $this->present($this->enrich($identity, $observation));
        }

        try {
            return $this->present($this->create($observation));
        } catch (QueryException $e) {
            // Hai webhook cùng một bí danh chạy song song: cả hai miss, cả hai
            // INSERT, một cái đụng unique. Tra lại là đúng đắn hơn khóa trước —
            // đường này chạy trên mọi tin đến.
            $identity = $this->findIdentity(
                $observation->workspaceId,
                $observation->key,
                $observation->value,
                $observation->channelAccountId,
            );

            if ($identity === null) {
                throw $e;
            }

            return $this->present($this->enrich($identity, $observation));
        }
    }

    public function link(string $profileId, ObservedIdentity $observation): ResolvedIdentity
    {
        $existing = $this->findIdentity(
            $observation->workspaceId,
            $observation->key,
            $observation->value,
            $observation->channelAccountId,
        );

        $target = Profile::findOrFail($profileId);

        if ($existing === null) {
            $identity = $this->attach($target, $observation);
            $this->identification->refresh($target);

            return $this->present($identity);
        }

        // Bí danh này đã thuộc một hồ sơ khác ⇒ hai hồ sơ là một người. Gộp.
        if ($existing->profile_id !== $target->id) {
            [$winner, $loser] = $this->merge->pickWinner($existing->profile, $target);
            $this->merge->merge($winner, $loser);
        }

        return $this->present($this->enrich($existing->refresh(), $observation));
    }

    private function attach(Profile $profile, ObservedIdentity $observation): ProfileIdentity
    {
        return ProfileIdentity::create([
            'workspace_id' => $observation->workspaceId,
            'profile_id' => $profile->id,
            'key' => $observation->key,
            'value' => $observation->value,
            'source' => $observation->source,
            'channel_account_id' => $observation->channelAccountId,
            'channels' => $observation->channels,
            'display_name' => $observation->displayName,
            'channel_profiles' => $this->channelProfile($observation),
            'attributes' => $observation->attributes,
            'is_verified' => $observation->isVerified,
            'first_seen_at' => now(),
            'last_seen_at' => now(),
        ]);
    }

    private function findIdentity(string $workspaceId, string $key, string $value, ?string $channelAccountId): ?ProfileIdentity
    {
        $query = ProfileIdentity::query()
            ->where('workspace_id', $workspaceId)
            ->where('key', $key)
            ->where('value', $value);

        // uid của kênh chỉ duy nhất trong phạm vi một tài khoản kênh; SĐT và email
        // duy nhất trong phạm vi workspace. Hai phạm vi khác nhau, hai truy vấn.
        $channelAccountId === null
            ? $query->whereNull('channel_account_id')
            : $query->where('channel_account_id', $channelAccountId);

        return $query->first();
    }

    private function create(ObservedIdentity $observation): ProfileIdentity
    {
        return DB::transaction(function () use ($observation) {
            $profile = Profile::create([
                'workspace_id' => $observation->workspaceId,
                'first_seen_at' => now(),
                'last_seen_at' => now(),
            ]);

            $identity = $this->attach($profile, $observation);

            $this->identification->refresh($profile);

            return $identity->refresh();
        });
    }

    /**
     * Làm mới những gì vừa biết thêm — KHÔNG xóa thứ đã biết.
     *
     * Tên rỗng từ một lần gặp sau không được ghi đè tên đã có: nhà cung cấp trả
     * thiếu trường là chuyện thường, và mất tên là mất thứ người dùng nhìn thấy.
     */
    private function enrich(ProfileIdentity $identity, ObservedIdentity $observation): ProfileIdentity
    {
        $identity->last_seen_at = now();

        if ($observation->displayName !== null && $observation->displayName !== '') {
            $identity->display_name = $observation->displayName;
        }

        if ($observation->channels !== []) {
            $identity->channels = array_values(array_unique([...$identity->channels, ...$observation->channels]));
        }

        if ($observation->attributes !== []) {
            $identity->attributes = [...$identity->attributes, ...$observation->attributes];
        }

        $identity->channel_profiles = [...$identity->channel_profiles, ...$this->channelProfile($observation)];

        // Đã xác minh chỉ đi một chiều: một lần gặp sau không chứng minh được
        // điều ngược lại.
        if ($observation->isVerified) {
            $identity->is_verified = true;
        }

        $identity->save();

        return $identity;
    }

    /** @return array<string, array{name: string|null, avatar: string|null, seen_at: string}> */
    private function channelProfile(ObservedIdentity $observation): array
    {
        if ($observation->channels === []) {
            return [];
        }

        $entry = [
            'name' => $observation->displayName,
            'avatar' => $observation->avatarUrl,
            'seen_at' => now()->toIso8601String(),
        ];

        return array_fill_keys($observation->channels, $entry);
    }

    private function present(ProfileIdentity $identity): ResolvedIdentity
    {
        $profile = $identity->profile;

        // Hồ sơ đã bị gộp thì trả về hồ sơ gốc. Đi ĐÚNG MỘT BƯỚC — gộp luôn làm
        // phẳng chuỗi nên không bao giờ cần bước thứ hai.
        $effective = $profile->merged_into_id !== null
            ? Profile::find($profile->merged_into_id) ?? $profile
            : $profile;

        return new ResolvedIdentity(
            identityId: $identity->id,
            profileId: $effective->id,
            isIdentified: (bool) $effective->is_identified,
            displayName: $identity->display_name,
            avatarUrl: $identity->channel_profiles[array_key_first($identity->channel_profiles) ?? '']['avatar'] ?? null,
        );
    }
}
