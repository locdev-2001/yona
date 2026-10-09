<!DOCTYPE html>
@use('App\Support\Appearance\ColorScheme')
@php($isAuthPage = str_starts_with($page['component'] ?? '', 'v3/'))
{{-- Trang đăng nhập/đăng ký là bề mặt công khai: luôn sáng. --}}
{{-- Đặt class ngay khi render để không nháy nền sáng; về sau resources/js/dashboard/composables/useColorScheme.ts giữ đồng bộ. --}}
@php($isDark = ! $isAuthPage && ColorScheme::fromUiSettings(data_get($page, 'props.auth.user.ui_settings')) === ColorScheme::Dark)
{{-- dir bắt buộc cho variant ltr:/rtl: của Tailwind (App.vue gốc đặt trên #app; rtl_view động vào nhóm G) --}}
<html data-installation-name="{{ config('yona.branding.installation_name') }}" lang="{{ str_replace('_', '-', app()->getLocale()) }}" dir="ltr" @class(['dark' => $isDark]) style="color-scheme: {{ $isDark ? 'dark' : 'light' }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, interactive-widget=resizes-content">
        <title inertia>{{ config('app.name', 'Yona') }}</title>
        @include('partials.favicon')
        @include('partials.analytics')
        @viteReactRefresh
        @vite([$isAuthPage ? 'resources/scss/v3.scss' : 'resources/scss/app.scss', 'resources/js/app.tsx'])
        @inertiaHead
    </head>
    <body class="h-full w-full">
        @inertia
    </body>
</html>
