{{-- Layout màn đăng nhập console quản trị — không nạp CSS Administrate, đúng
     như layout devise riêng của bản gốc. --}}
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title inertia>{{ config('app.name', 'Yona') }}</title>
        @viteReactRefresh
        @vite(['resources/scss/superadmin-auth.scss', 'resources/js/superadmin/main.tsx'])
        @inertiaHead
    </head>
    <body class="h-full w-full">
        @inertia
    </body>
</html>
