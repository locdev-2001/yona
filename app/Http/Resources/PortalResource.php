<?php

namespace App\Http\Resources;

use App\Models\Account;
use App\Models\Article;
use App\Models\Category;
use App\Models\Portal;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Collection;

// Port từ api/v1/accounts/portals/_portal.json.jbuilder (+ _portal_config).
// `articles` = tập bài đã lọc mà controller đưa vào để tính meta; null nghĩa là
// ngữ cảnh index/create/update — bản gốc truyền mảng rỗng nên các đếm phụ là null.
class PortalResource extends JsonResource
{
    /** @param Collection<int, Article>|null $articles */
    public function __construct(
        Portal $resource,
        private readonly Account $account,
        private readonly ?Collection $articles = null,
        private readonly ?User $currentUser = null,
    ) {
        parent::__construct($resource);
    }

    /** @param iterable<Portal> $portals */
    public static function forAccount(iterable $portals, Account $account): array
    {
        return collect($portals)
            ->map(fn (Portal $portal) => (new self($portal, $account))->toArray(request()))
            ->values()
            ->all();
    }

    public function toArray(Request $request): array
    {
        /** @var Portal $portal */
        $portal = $this->resource;

        $payload = [
            'id' => $portal->id,
            'color' => $portal->color,
            'custom_domain' => $portal->custom_domain,
            'header_text' => $portal->header_text,
            'homepage_link' => $portal->homepage_link,
            'name' => $portal->name,
            'page_title' => $portal->page_title,
            'slug' => $portal->slug,
            'archived' => $portal->archived,
            'account_id' => $portal->account_id,
            'config' => [
                'allowed_locales' => $this->allowedLocales($portal),
                'default_locale' => $portal->defaultLocale(),
                'layout' => $portal->layout(),
                'social_profiles' => (object) $portal->socialProfiles(),
                'locale_translations' => (object) $portal->localeTranslations(),
                'popular_content' => (object) $portal->popularContent(),
                'analytics' => (object) $portal->analytics(),
            ],
        ];

        $inbox = $portal->channelWebWidget?->inbox;
        if ($inbox !== null) {
            $payload['inbox'] = (new InboxResource($inbox, true))->toArray($request);
        }

        $logo = $portal->fileBaseData();
        if ($logo !== null) {
            $payload['logo'] = $logo;
        }

        $payload['meta'] = $this->meta($portal);

        if ($portal->ssl_settings) {
            $payload['ssl_settings'] = [
                'status' => $portal->ssl_settings['cf_status'] ?? null,
                'verification_errors' => $portal->ssl_settings['cf_verification_errors'] ?? null,
            ];
        }

        return $payload;
    }

    /** @return list<array<string, mixed>> */
    private function allowedLocales(Portal $portal): array
    {
        return collect($portal->allowedLocaleCodes())
            ->map(fn (string $locale) => [
                'code' => $locale,
                'articles_count' => Article::search(Article::forPortal($portal), ['locale' => $locale])->count(),
                'categories_count' => Category::forPortal($portal)->searchByLocale($locale)->count(),
                'draft' => $portal->isDraftLocale($locale),
            ])
            ->all();
    }

    /** @return array<string, mixed> */
    private function meta(Portal $portal): array
    {
        $articles = $this->articles;

        $meta = [
            'all_articles_count' => $articles?->count() ?? 0,
            'archived_articles_count' => $articles?->where('status', 'archived')->count(),
            'published_count' => $articles?->where('status', 'published')->count(),
            'draft_articles_count' => $articles?->where('status', 'draft')->count(),
        ];

        if ($this->currentUser !== null && $articles !== null && $articles->isNotEmpty()) {
            $meta['mine_articles_count'] = $articles->where('author_id', $this->currentUser->id)->count();
        }

        $meta['categories_count'] = $portal->categories()->count();
        $meta['default_locale'] = $portal->defaultLocale();

        return $meta;
    }
}
