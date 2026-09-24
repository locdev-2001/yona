<?php

namespace App\Http\Resources\Platform;

use App\Models\AccountUser;
use App\Models\User;

final class PlatformUserResource
{
    public static function toArray(User $user): array
    {
        $user->loadMissing('accountUsers.account');
        $activeAccountUser = self::activeAccountUser($user);

        $payload = [
            'access_token' => $user->accessToken?->token,
            'account_id' => $activeAccountUser?->account_id,
            'available_name' => $user->availableName(),
            'avatar_url' => $user->avatarUrl(),
            'confirmed' => $user->isConfirmed(),
            'display_name' => $user->display_name,
            'message_signature' => $user->message_signature,
            'email' => $user->email,
            'id' => $user->id,
            'name' => $user->name,
            'provider' => $user->provider,
            'pubsub_token' => $user->pubsub_token,
        ];

        if (filled($user->custom_attributes)) {
            $payload['custom_attributes'] = $user->custom_attributes;
        }

        $payload['role'] = $activeAccountUser === null ? null : AccountUser::ROLE_NAMES[$activeAccountUser->role];
        $payload['ui_settings'] = (object) ($user->ui_settings ?? []);
        $payload['uid'] = $user->uid;
        $payload['accounts'] = $user->accountUsers->map(fn (AccountUser $accountUser) => [
            'id' => $accountUser->account_id,
            'name' => $accountUser->account?->name,
            'active_at' => $accountUser->active_at?->toJSON(),
            'role' => AccountUser::ROLE_NAMES[$accountUser->role],
        ])->values()->all();

        return $payload;
    }

    // Port từ users/token.json.jbuilder.
    public static function tokenPayload(User $user): array
    {
        return [
            'access_token' => $user->accessToken?->token,
            'expiry' => null,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'display_name' => $user->display_name,
                'email' => $user->email,
                'pubsub_token' => $user->pubsub_token,
            ],
        ];
    }

    // User#active_account_user — account_user hoạt động gần nhất.
    private static function activeAccountUser(User $user): ?AccountUser
    {
        return $user->accountUsers
            ->sortByDesc(fn (AccountUser $accountUser) => $accountUser->active_at?->getTimestamp() ?? 0)
            ->first();
    }
}
