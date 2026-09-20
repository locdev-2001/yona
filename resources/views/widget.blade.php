<!DOCTYPE html>
{{-- Port từ app/views/widgets/show.html.erb — trang chạy trong iframe của SDK.
     Khác bản gốc: cấu hình kênh KHÔNG render sẵn vào window.chatwootWebChannel,
     app tự dựng phiên bằng POST /api/v1/widget/config (hợp đồng C2). --}}
<html data-installation-name="{{ config('yona.branding.installation_name') }}" lang="{{ str_replace('_', '-', app()->getLocale()) }}" dir="ltr">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0">
        <title>{{ config('yona.branding.installation_name', config('app.name', 'Yona')) }}</title>
        @vite(['resources/scss/widget.scss', 'resources/js/widget/main.tsx'])
    </head>
    <body class="h-full">
        <div id="app" class="h-full"></div>
    </body>
</html>
