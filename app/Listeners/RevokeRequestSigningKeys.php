<?php

namespace App\Listeners;

use App\Http\RequestSigning\SigningKeyStore;
use App\Http\RequestSigning\Subjects\DashboardSigningSubject;
use App\Models\User;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;

// Đăng nhập lại hay đăng xuất là xoay khoá: khoá phiên cũ của người dùng hết hiệu lực.
class RevokeRequestSigningKeys
{
    public function __construct(private readonly SigningKeyStore $keys) {}

    public function handle(Login|Logout $event): void
    {
        if ($event->user instanceof User) {
            $this->keys->revokeSubject(DashboardSigningSubject::forUser($event->user->getAuthIdentifier()));
        }
    }
}
