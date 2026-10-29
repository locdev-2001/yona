<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Concerns\ServesStickerLibrary;
use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Sticker;
use App\Support\SuperAdminArea;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

// Kho sticker nền tảng (kho chung) của Yona: mọi account đều thấy bộ đã xuất bản.
class StickerPacksController extends Controller
{
    use ServesStickerLibrary;

    public const API_BASE_URL = '/'.SuperAdminArea::PREFIX.'/api';

    private const ACCOUNTS_TAB = 'accounts';

    private const ACCOUNT_LIBRARIES_PER_PAGE = 20;

    public function page(Request $request): Response
    {
        $showsAccountLibraries = $request->query('tab') === self::ACCOUNTS_TAB;
        $search = trim((string) $request->query('q', ''));

        return Inertia::render('superadmin/StickerPacks', [
            'apiBaseUrl' => self::API_BASE_URL,
            'accountLibraries' => $showsAccountLibraries ? $this->accountLibraries($search) : null,
            'accountLibrariesSearch' => $search,
        ]);
    }

    // Tài khoản có kho sticker riêng, gộp trong một câu: số bộ, số sticker đã xử lý xong, lần thêm gần nhất.
    private function accountLibraries(string $search): LengthAwarePaginator
    {
        return DB::table('sticker_packs')
            ->join('accounts', 'accounts.id', '=', 'sticker_packs.account_id')
            ->leftJoin('stickers', fn ($join) => $join->on('stickers.sticker_pack_id', '=', 'sticker_packs.id')
                ->where('stickers.status', Sticker::STATUS_READY))
            ->when($search !== '', fn ($query) => $query->where(fn ($match) => $match
                ->where('accounts.name', 'ilike', '%'.addcslashes($search, '%_\\').'%')
                ->when(ctype_digit($search), fn ($byId) => $byId->orWhere('accounts.id', (int) $search))))
            ->groupBy('accounts.id', 'accounts.name')
            ->select([
                'accounts.id',
                'accounts.name',
                DB::raw('COUNT(DISTINCT sticker_packs.id) AS pack_count'),
                DB::raw('COUNT(stickers.id) AS sticker_count'),
                DB::raw('GREATEST(MAX(sticker_packs.created_at), MAX(stickers.created_at)) AS last_added_at'),
            ])
            ->orderByDesc('last_added_at')
            ->orderBy('accounts.id')
            ->paginate(self::ACCOUNT_LIBRARIES_PER_PAGE)
            ->withQueryString()
            ->through(fn (object $row) => [
                'id' => (int) $row->id,
                'name' => $row->name,
                'packCount' => (int) $row->pack_count,
                'stickerCount' => (int) $row->sticker_count,
                'lastAddedAt' => $row->last_added_at ? Carbon::parse($row->last_added_at)->toIso8601String() : null,
            ]);
    }

    protected function libraryOwner(Request $request): ?Account
    {
        return null;
    }
}
