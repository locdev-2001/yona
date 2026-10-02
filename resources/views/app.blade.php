<!DOCTYPE html>
{{-- dir bắt buộc cho variant ltr:/rtl: của Tailwind (App.vue gốc đặt trên #app; rtl_view động vào nhóm G) --}}
<html data-installation-name="{{ config('yona.branding.installation_name') }}" lang="{{ str_replace('_', '-', app()->getLocale()) }}" dir="ltr" style="color-scheme: light">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, interactive-widget=resizes-content">
        <title inertia>{{ config('app.name', 'Yona') }}</title>
        @include('partials.favicon')
        @include('partials.analytics')
        @php($isAuthPage = str_starts_with($page['component'] ?? '', 'v3/'))
        @viteReactRefresh
        @vite([$isAuthPage ? 'resources/scss/v3.scss' : 'resources/scss/app.scss', 'resources/js/app.tsx'])
        @inertiaHead
    </head>
    <body class="h-full w-full">
        @inertia
    </body>
</html>
