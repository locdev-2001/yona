<?php

namespace App\Http\Controllers\Chat;

use App\Http\Controllers\Controller;
use App\Models\Chat;
use App\Services\Users\PrivacySettings;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ChatPagesController extends Controller
{
    public function index(?Chat $chat = null): Response
    {
        return Inertia::render('dashboard/conversation/ConversationView', [
            'conversationId' => $chat?->id ?? 0,
        ]);
    }

    public function profile(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('chat/Profile', [
            'profile' => [
                'name' => $user->availableName(),
                'username' => $user->username,
                'bio' => $user->bio,
                'avatar_url' => $user->avatarUrl(),
                'privacy' => PrivacySettings::resolve($user->privacy),
            ],
        ]);
    }
}
