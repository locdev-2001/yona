<?php

namespace App\Http\Middleware;

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
                ] : null,
            ],
            'globalConfig' => [
                // Thương hiệu lấy từ config('yona.branding') — nguồn duy nhất dùng
                // chung với trang chủ, widget và email; viết cứng ở đây từng làm
                // đường dẫn logo tối lệch tên tệp thật và trả 404.
                'installationName' => config('yona.branding.installation_name'),
                'logo' => config('yona.branding.logo'),
                'logoDark' => config('yona.branding.logo_dark'),
                'signupEnabled' => config('yona.signup_enabled'),
                'isMfaEnabled' => (bool) config('yona.mfa_enabled'),
                'termsURL' => config('yona.terms_url'),
                'privacyURL' => config('yona.privacy_url'),
                'fbAppId' => config('services.facebook.app_id'),
                'fbApiVersion' => config('services.facebook.api_version'),
            ],
            'flash' => [
                'alert' => $request->session()->get('alert'),
            ],
        ];
    }
}
