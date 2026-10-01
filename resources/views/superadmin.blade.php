{{-- Layout của console quản trị: CSS + entry riêng, không dùng chung bundle
     dashboard (khu này không có chế độ tối). --}}
<!DOCTYPE html>
<html data-installation-name="{{ config('yona.branding.installation_name') }}" lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="w-full h-full">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title inertia>{{ config('app.name', 'Yona') }}</title>
        @include('partials.favicon')
        @include('partials.analytics')
        @viteReactRefresh
        @vite(['resources/scss/superadmin.scss', 'resources/js/superadmin/main.tsx'])
        @inertiaHead
    </head>
    <body class="antialiased w-full h-full">
        @inertia
    </body>
</html>
