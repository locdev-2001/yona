{{-- Layout màn đăng nhập console quản trị — không nạp CSS Administrate, đúng
     như layout devise riêng của bản gốc. --}}
<!DOCTYPE html>
<html data-installation-name="{{ config('yona.branding.installation_name') }}" lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title inertia>{{ config('app.name', 'Yona') }}</title>
        @include('partials.favicon')
        @include('partials.analytics')
        @viteReactRefresh
        @vite(['resources/scss/superadmin-auth.scss', 'resources/js/superadmin/main.tsx'])
        @inertiaHead
    </head>
    <body class="h-full w-full">
        @inertia
    </body>
</html>
