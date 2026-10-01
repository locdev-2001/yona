<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Services\Admin\Operations\AccountOverview;
use Inertia\Inertia;
use Inertia\Response;

// Account 360: mọi thông tin vận hành của một account trên một trang.
class AccountOverviewController extends Controller
{
    public function __construct(private readonly AccountOverview $overview) {}

    public function show(int $id): Response
    {
        $account = $this->overview->find($id);

        return Inertia::render('superadmin/AccountOverview', [
            ...$this->overview->build($account),
            'csrf' => csrf_token(),
        ]);
    }
}
