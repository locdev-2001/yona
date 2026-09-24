<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Conversation;
use Illuminate\Http\Request;

abstract class Controller
{
    // Tương đương check_authorization của Api::V1::Accounts::BaseController +
    // policy "administrator": 401 với đúng chuỗi lỗi bản gốc.
    protected function authorizeAdministrator(Request $request): void
    {
        $accountUser = $request->attributes->get('currentAccountUser');

        abort_unless(
            $accountUser instanceof AccountUser && $accountUser->isAdministrator(),
            401,
            'You are not authorized to do this action'
        );
    }

    // Conversations::BaseController#conversation: tra theo display_id +
    // ConversationPolicy#show? (admin, inbox member hoặc team member).
    protected function fetchConversationForUser(Request $request, Account $account, int $displayId): Conversation
    {
        $conversation = $account->conversations()->where('display_id', $displayId)->firstOrFail();

        $accountUser = $request->attributes->get('currentAccountUser');

        abort_unless(
            $conversation->isVisibleTo($request->user(), $accountUser instanceof AccountUser ? $accountUser : null),
            401,
            'You are not authorized to do this action'
        );

        return $conversation;
    }
}
