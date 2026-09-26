<!DOCTYPE html>
{{-- Trang chạy trong iframe của SDK. Cấu hình kênh KHÔNG render sẵn vào HTML,
     app tự dựng phiên bằng POST /api/v1/widget/config. --}}
<html data-installation-name="{{ config('yona.branding.installation_name') }}" lang="{{ str_replace('_', '-', app()->getLocale()) }}" dir="ltr">
    <head>
        <meta charset="utf-8">
        {{-- Trang riêng của từng khách (link có token, khung chat nhúng): không cho máy tìm kiếm lập chỉ mục. --}}
        <meta name="robots" content="noindex, nofollow">
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0">
        <title>{{ config('yona.branding.installation_name', config('app.name', 'Yona')) }}</title>
        @vite(['resources/scss/widget.scss', 'resources/js/widget/main.tsx'])
    </head>
    <body class="h-full">
        <div id="app" class="h-full"></div>
    </body>
</html>
