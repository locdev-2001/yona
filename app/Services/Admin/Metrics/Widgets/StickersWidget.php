<?php

namespace App\Services\Admin\Metrics\Widgets;

use App\Services\Admin\Metrics\DateRange;
use App\Services\Admin\Metrics\MetricWidget;
use App\Services\Admin\Metrics\WidgetSize;
use App\Support\SuperAdminArea;
use Illuminate\Support\Facades\DB;

final class StickersWidget extends MetricWidget
{
    public function key(): string
    {
        return 'stickers';
    }

    public function defaultSize(): WidgetSize
    {
        return WidgetSize::Small;
    }

    public function dependsOnRange(): bool
    {
        return false;
    }

    // Kho chung = bộ không thuộc account nào; kho riêng = bộ của từng account.
    public function compute(DateRange $range): array
    {
        $packs = DB::table('sticker_packs')
            ->selectRaw(
                'count(*) filter (where account_id is null) as shared_packs,'
                .' count(*) filter (where account_id is null and published_at is not null) as shared_published_packs,'
                .' count(distinct account_id) as accounts_with_private_library',
            )
            ->first();

        $stickers = DB::table('stickers')
            ->join('sticker_packs', 'sticker_packs.id', '=', 'stickers.sticker_pack_id')
            ->selectRaw(
                'count(*) filter (where sticker_packs.account_id is null) as shared_stickers,'
                .' count(*) filter (where sticker_packs.account_id is not null) as private_stickers',
            )
            ->first();

        return [
            'sharedPacks' => (int) $packs->shared_packs,
            'sharedPublishedPacks' => (int) $packs->shared_published_packs,
            'sharedStickers' => (int) $stickers->shared_stickers,
            'accountsWithPrivateLibrary' => (int) $packs->accounts_with_private_library,
            'privateStickers' => (int) $stickers->private_stickers,
            'url' => SuperAdminArea::url('sticker-packs'),
        ];
    }
}
