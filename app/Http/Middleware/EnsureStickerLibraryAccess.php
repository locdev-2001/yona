<?php

namespace App\Http\Middleware;

use App\Models\Account;
use App\Models\User;
use App\Services\Stickers\StickerLibraryAccess;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// Cổng của API dashboard quản lý kho sticker. `account`: kho riêng của account
// đang mở (đặt sau account.scope); `platform`: kho nền tảng; `transfer`: chuyển
// bộ giữa kho nền tảng và kho riêng của account đang mở (đặt sau account.scope).
class EnsureStickerLibraryAccess
{
    public const ACCOUNT_LIBRARY = 'account';

    public const PLATFORM_LIBRARY = 'platform';

    public const PACK_TRANSFER = 'transfer';

    public function __construct(private readonly StickerLibraryAccess $access) {}

    public function handle(Request $request, Closure $next, string $library): Response
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $allowed = match ($library) {
            self::ACCOUNT_LIBRARY => $this->allowsAccountLibrary($request, $user),
            self::PLATFORM_LIBRARY => $this->access->canManagePlatformLibrary($user),
            self::PACK_TRANSFER => $this->allowsPackTransfer($request, $user),
        };

        abort_unless($allowed, 403, __('errors.sticker_library.forbidden'));

        return $next($request);
    }

    private function allowsAccountLibrary(Request $request, User $user): bool
    {
        $account = $request->attributes->get('currentAccount');

        return $account instanceof Account && $this->access->canManageAccountLibrary($user, $account);
    }

    private function allowsPackTransfer(Request $request, User $user): bool
    {
        $account = $request->attributes->get('currentAccount');

        return $account instanceof Account && $this->access->canMovePacks($user, $account);
    }
}
