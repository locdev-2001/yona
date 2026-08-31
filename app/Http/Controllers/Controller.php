<?php

namespace App\Http\Controllers;

use App\Models\AccountUser;
use Illuminate\Http\Request;

abstract class Controller
{
    // Tương đương check_authorization của Api::V1::Accounts::BaseController +
    // policy "administrator" của Chatwoot: 401 với đúng chuỗi lỗi bản gốc.
    protected function authorizeAdministrator(Request $request): void
    {
        $accountUser = $request->attributes->get('currentAccountUser');

        abort_unless(
            $accountUser instanceof AccountUser && $accountUser->isAdministrator(),
            401,
            'You are not authorized to do this action'
        );
    }
}
