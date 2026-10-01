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
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Geist+Mono:wght@100..900&display=swap" rel="stylesheet">
        @viteReactRefresh
        @vite(['resources/css/admin/app.css', 'resources/js/superadmin/main.tsx'])
        @inertiaHead
    </head>
    <body class="flex min-h-full w-full flex-auto flex-col">
        @inertia
    </body>
</html>
