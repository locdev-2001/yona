<?php

namespace App\Http\Controllers\Public\Portals;

use App\Http\Controllers\Controller;
use App\Models\Portal;
use App\Services\Branding\BrandAssets;
use App\Support\HelpCenter\PortalLinks;
use Illuminate\Http\Request;

// Port từ Public::Api::V1::Portals::BaseController.
// Portal bị lưu trữ (archived) coi như không tồn tại.
abstract class BaseController extends Controller
{
    protected function portal(string $slug): Portal
    {
        return Portal::query()->where('slug', self::withoutFormat($slug))->where('archived', false)->firstOrFail();
    }

    // Route gốc cho phép hậu tố định dạng (`articles.json`, `show.md`).
    protected static function withoutFormat(string $value): string
    {
        return preg_replace('/\.(json|md|png|xml)$/i', '', $value) ?? $value;
    }

    // Bản gốc dùng `respond_to`: cùng URL trả JSON cho API, HTML cho người đọc.
    protected function wantsJson(Request $request): bool
    {
        return $request->wantsJson() || str_ends_with($request->path(), '.json');
    }

    protected function isPlainLayout(Request $request): bool
    {
        return $request->query('show_plain_layout') === 'true';
    }

    protected function portalLayout(Portal $portal): string
    {
        return in_array($portal->layout(), Portal::LAYOUTS, true) ? $portal->layout() : 'classic';
    }

    /**
     * Dữ liệu dùng chung cho mọi trang `/hc` — layout Blade đọc từ đây.
     *
     * @return array<string, mixed>
     */
    protected function portalViewData(Request $request, Portal $portal, ?string $locale): array
    {
        $isPlainLayout = $this->isPlainLayout($request);

        return [
            'portal' => $portal,
            'locale' => $locale ?: $portal->defaultLocale(),
            'isPlainLayout' => $isPlainLayout,
            'portalLayout' => $this->portalLayout($portal),
            'languages' => config('portal_languages'),
            'globalConfig' => [
                'LOGO_THUMBNAIL' => app(BrandAssets::class)->logoThumbnail(),
                'BRAND_NAME' => config('yona.branding.brand_name'),
                'BRAND_URL' => config('yona.branding.widget_brand_url'),
                'INSTALLATION_NAME' => config('yona.branding.installation_name'),
            ],
            'links' => PortalLinks::class,
        ];
    }
}
