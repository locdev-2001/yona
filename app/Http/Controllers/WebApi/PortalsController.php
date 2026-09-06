<?php

namespace App\Http\Controllers\WebApi;

use App\Exceptions\MessageValidationException;
use App\Http\Controllers\Controller;
use App\Http\Resources\PortalResource;
use App\Models\Account;
use App\Models\Article;
use App\Models\Attachment;
use App\Models\Portal;
use App\Notifications\PortalCnameInstructions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

// Port từ Api::V1::Accounts::PortalsController.
// Bỏ `ssl_status` (enterprise).
class PortalsController extends Controller
{
    private const CONFIG_KEYS = [
        'default_locale', 'layout', 'allowed_locales', 'draft_locales',
        'social_profiles', 'locale_translations', 'popular_content', 'analytics',
    ];

    private const SOCIAL_PROFILE_KEYS = ['facebook', 'x', 'instagram', 'linkedin', 'youtube', 'tiktok', 'github', 'whatsapp'];

    public function index(Request $request, Account $account): JsonResponse
    {
        $portals = $account->portals()->orderBy('id')->get();

        return response()->json([
            'payload' => PortalResource::forAccount($portals, $account),
            'meta' => [
                'current_page' => (int) $request->query('page', 1),
                'portals_count' => $portals->count(),
            ],
        ]);
    }

    public function show(Request $request, Account $account, string $slug): JsonResponse
    {
        $portal = $this->fetchPortal($account, $slug);
        $articles = Article::search(Article::forPortal($portal), ['locale' => $request->query('locale')])->get();

        return response()->json(
            (new PortalResource($portal, $account, $articles, $request->user()))->toArray($request)
        );
    }

    public function store(Request $request, Account $account): JsonResponse
    {
        $this->authorizeAdministrator($request);

        if (($analyticsError = $this->analyticsError($request)) !== null) {
            return $analyticsError;
        }

        $portal = new Portal([
            ...$this->portalParams($request),
            ...$this->liveChatWidgetParams($request, $account),
            'account_id' => $account->id,
        ]);
        $portal->custom_domain = self::parseCustomDomain($portal->custom_domain);

        if (($message = $portal->validationSentence()) !== null) {
            return response()->json(['message' => $message], 422);
        }

        $portal->save();
        $this->attachLogo($request, $portal);

        return response()->json((new PortalResource($portal, $account))->toArray($request));
    }

    public function update(Request $request, Account $account, string $slug): JsonResponse
    {
        $this->authorizeAdministrator($request);

        if (($analyticsError = $this->analyticsError($request)) !== null) {
            return $analyticsError;
        }

        $portal = $this->fetchPortal($account, $slug);
        $widgetParams = $this->liveChatWidgetParams($request, $account);

        $response = DB::transaction(function () use ($request, $portal, $widgetParams) {
            // lock! của bản gốc: hai lần lưu song song không được ghi đè config của nhau.
            $portal->newQuery()->whereKey($portal->id)->lockForUpdate()->first();

            if ($request->has('portal')) {
                $portal->fill([...$this->portalParams($request), ...$widgetParams]);

                if (($message = $portal->validationSentence()) !== null) {
                    return response()->json(['message' => $message], 422);
                }

                $portal->save();
            }

            $this->attachLogo($request, $portal);

            return null;
        });

        return $response ?? response()->json((new PortalResource($portal->refresh(), $account))->toArray($request));
    }

    public function destroy(Request $request, Account $account, string $slug): Response
    {
        $this->authorizeAdministrator($request);
        $this->fetchPortal($account, $slug)->delete();

        return response()->noContent(200);
    }

    // Bản gốc gọi `update(archive: true)` — cột không tồn tại nên endpoint này
    // luôn nổ; ở đây đặt đúng cột `archived` (xem "Khác biệt cố ý").
    public function archive(Request $request, Account $account, string $slug): Response
    {
        $this->authorizeAdministrator($request);
        $this->fetchPortal($account, $slug)->update(['archived' => true]);

        return response()->noContent(200);
    }

    public function destroyLogo(Request $request, Account $account, string $slug): Response
    {
        $this->authorizeAdministrator($request);
        $this->fetchPortal($account, $slug)->logo?->delete();

        return response()->noContent(200);
    }

    public function sendInstructions(Request $request, Account $account, string $slug): JsonResponse
    {
        $this->authorizeAdministrator($request);
        $portal = $this->fetchPortal($account, $slug);
        $email = (string) $request->input('email', '');

        if ($email === '') {
            return response()->json(['error' => 'Email is required'], 422);
        }

        if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            return response()->json(['error' => 'Invalid email format'], 422);
        }

        if ((string) $portal->custom_domain === '') {
            return response()->json(['error' => 'Custom domain is not configured'], 422);
        }

        Notification::route('mail', $email)->notify(new PortalCnameInstructions($portal));

        return response()->json(['message' => 'Instructions sent successfully']);
    }

    private function fetchPortal(Account $account, string $slug): Portal
    {
        return $account->portals()->where('slug', $slug)->firstOrFail();
    }

    /** @return array<string, mixed> */
    private function portalParams(Request $request): array
    {
        $params = collect($request->input('portal', []))
            ->only(['color', 'custom_domain', 'header_text', 'homepage_link', 'name', 'page_title', 'slug', 'archived'])
            ->all();

        $config = $request->input('portal.config');

        if (is_array($config)) {
            $params['config'] = $this->configParams($config);
        }

        return $params;
    }

    /**
     * @param  array<string, mixed>  $config
     * @return array<string, mixed>
     */
    private function configParams(array $config): array
    {
        $permitted = collect($config)->only(self::CONFIG_KEYS)->all();

        if (isset($permitted['social_profiles']) && is_array($permitted['social_profiles'])) {
            $permitted['social_profiles'] = collect($permitted['social_profiles'])->only(self::SOCIAL_PROFILE_KEYS)->all();
        }

        if (isset($permitted['locale_translations']) && is_array($permitted['locale_translations'])) {
            $permitted['locale_translations'] = collect($permitted['locale_translations'])
                ->map(fn (mixed $fields) => collect(is_array($fields) ? $fields : [])
                    ->only(['name', 'page_title', 'header_text'])->all())
                ->all();
        }

        if (isset($permitted['popular_content']) && is_array($permitted['popular_content'])) {
            $permitted['popular_content'] = collect($permitted['popular_content'])
                ->map(fn (mixed $entry) => collect(is_array($entry) ? $entry : [])
                    ->only(['category_ids', 'article_ids'])->all())
                ->all();
        }

        if (isset($permitted['analytics']) && is_array($permitted['analytics'])) {
            $permitted['analytics'] = collect($permitted['analytics'])
                ->only(array_keys(Portal::ANALYTICS_CONFIG_FORMATS))->all();
        }

        return $permitted;
    }

    private function analyticsError(Request $request): ?JsonResponse
    {
        $analytics = $request->input('portal.config.analytics');

        if ($analytics === null || $analytics === [] || $analytics === '') {
            return null;
        }

        $valid = is_array($analytics)
            && collect(array_keys($analytics))->every(fn (mixed $key) => isset(Portal::ANALYTICS_CONFIG_FORMATS[(string) $key]))
            && collect($analytics)->every(fn (mixed $value) => is_string($value));

        return $valid ? null : response()->json(['error' => 'Invalid analytics configuration'], 422);
    }

    /** @return array<string, mixed> */
    private function liveChatWidgetParams(Request $request, Account $account): array
    {
        if (! $request->has('inbox_id')) {
            return [];
        }

        $inboxId = $request->input('inbox_id');

        if ((string) $inboxId === '') {
            return ['channel_web_widget_id' => null];
        }

        $inbox = $account->inboxes()->whereKey((int) $inboxId)->firstOrFail();

        return $inbox->isWebWidget() ? ['channel_web_widget_id' => $inbox->channel_id] : [];
    }

    // process_attached_logo: blob_id là tham chiếu đã ký từ /upload; id số nghĩa
    // là FE gửi lại logo đang có → không làm gì.
    private function attachLogo(Request $request, Portal $portal): void
    {
        $blobId = $request->input('blob_id');

        if (! is_string($blobId) || $blobId === '' || is_numeric($blobId)) {
            return;
        }

        try {
            $attributes = Attachment::resolveSignedUpload($blobId, $portal->account_id);
        } catch (MessageValidationException) {
            return;
        }

        $portal->logo?->delete();
        $portal->logo()->create($attributes);
        $portal->unsetRelation('logo');
    }

    private static function parseCustomDomain(?string $domain): ?string
    {
        if ((string) $domain === '') {
            return null;
        }

        $host = parse_url((string) $domain, PHP_URL_HOST);

        return is_string($host) && $host !== '' ? $host : $domain;
    }
}
