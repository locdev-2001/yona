<?php

namespace App\Http\RequestSigning\Subjects;

use App\Http\Middleware\AuthenticateApiAccessToken;
use App\Models\AgentBot;
use Illuminate\Http\Request;

final class DashboardSigningSubject implements SigningSubject
{
    public static function forUser(int|string $userId): string
    {
        return 'user:'.$userId;
    }

    public function exempt(Request $request): bool
    {
        return (bool) $request->attributes->get(AuthenticateApiAccessToken::AUTHENTICATED_BY_TOKEN, false);
    }

    public function identify(Request $request): ?string
    {
        $caller = $request->user();

        return match (true) {
            $caller instanceof AgentBot => 'agent_bot:'.$caller->getKey(),
            $caller !== null => self::forUser($caller->getAuthIdentifier()),
            default => null,
        };
    }
}
