{{-- Layout của console quản trị: chỉ nạp CSS Administrate + entry riêng, không
     dùng chung bundle dashboard (khu này không có chế độ tối). --}}
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="w-full h-full">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="initial-scale=1">
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
