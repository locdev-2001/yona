{{-- Layout màn đăng nhập console quản trị: cùng CSS với console, không có khung
     điều hướng. --}}
<!DOCTYPE html>
<html data-installation-name="{{ config('yona.branding.installation_name') }}" lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="flex min-h-full w-full antialiased">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title inertia>{{ config('app.name', 'Yona') }}</title>
        @include('partials.favicon')
        @include('partials.analytics')
        @viteReactRefresh
        @vite(['resources/css/admin/app.css', 'resources/js/superadmin/main.tsx'])
        @inertiaHead
    </head>
    <body class="flex min-h-full w-full flex-auto flex-col">
        @inertia
    </body>
</html>
