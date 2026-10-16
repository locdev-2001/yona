<!DOCTYPE html>
{{-- Trang công khai theo token (`/m/{token}`, phase-05 §C) — không layout dashboard,
     không đăng nhập, giống survey.blade.php. Mở trực tiếp (link Zalo/SMS) hoặc
     trong iframe của Sheet widget (widget tự vẽ phần khung, trang chỉ vẽ nội dung). --}}
<html data-installation-name="{{ config('yona.branding.installation_name') }}" lang="{{ str_replace('_', '-', app()->getLocale()) }}" dir="ltr">
    <head>
        <meta charset="utf-8">
        {{-- Trang riêng của từng khách (link có token, khung chat nhúng): không cho máy tìm kiếm lập chỉ mục. --}}
        <meta name="robots" content="noindex, nofollow">
        <title>{{ config('yona.branding.installation_name', config('app.name', 'Yona')) }}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0">
        <script>
            window.globalConfig = @json($globalConfig);
        </script>
        @include('partials.favicon')
        @include('partials.analytics')
        @viteReactRefresh
        @vite(['resources/scss/flows.scss', 'resources/js/flows/main.tsx'])
    </head>
    <body class="h-full">
        <div id="app" class="h-full"></div>
    </body>
</html>
