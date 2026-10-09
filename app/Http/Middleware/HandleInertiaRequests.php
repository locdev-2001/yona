<?php

namespace App\Http\Middleware;

use App\Models\Sticker;
use App\Services\Branding\BrandAssets;
use App\Services\Notification\VapidService;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user() ? [
                    ...$request->user()->only([
                        'id', 'name', 'display_name', 'email', 'availability', 'ui_settings', 'type', 'pubsub_token',
                    ]),
                    'avatar_url' => $request->user()->avatarUrl(),
                    'message_signature' => $request->user()->message_signature,
                    // Trình duyệt mất đăng ký đẩy (xoá dữ liệu trang khi đóng) vẫn biết
                    // người này từng bật để tự đăng ký lại.
                    'has_push_subscription' => fn () => $request->user()->browserPushSubscriptions()->exists(),
                ] : null,
            ],
            'globalConfig' => [
                // Thương hiệu lấy từ config('yona.branding') — nguồn duy nhất dùng
                // chung với trang chủ, widget và email; viết cứng ở đây từng làm
                // đường dẫn logo tối lệch tên tệp thật và trả 404.
                'installationName' => config('yona.branding.installation_name'),
                'logo' => fn () => app(BrandAssets::class)->logo(),
                'logoDark' => fn () => app(BrandAssets::class)->logoDark(),
                'logoThumbnail' => fn () => app(BrandAssets::class)->logoThumbnail(),
                // Ngôn ngữ giao diện bật được — menu avatar, Ctrl+K, màn Widget chat chọn từ đây.
                'availableLocales' => config('yona.available_locales'),
                'termsURL' => config('yona.terms_url'),
                'privacyURL' => config('yona.privacy_url'),
                'fbAppId' => config('services.facebook.app_id'),
                'fbApiVersion' => config('services.facebook.api_version'),
                // vapidPublicKey trong cấu hình client: có khoá mới hiện phần thông
                // báo đẩy. Closure chỉ chạy khi render trang, và chỉ tra khoá cho
                // người đã đăng nhập — trang công khai, request JSON không đụng tới.
                'vapidPublicKey' => fn () => $request->user() !== null ? app(VapidService::class)->publicKey() : null,
            ],
            'flash' => [
                'alert' => $request->session()->get('alert'),
            ],
            'stickerDisplaySize' => Sticker::displaySize(),
        ];
    }
}
