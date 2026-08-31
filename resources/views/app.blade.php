<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title inertia>{{ config('app.name', 'Yona') }}</title>
        @php($isAuthPage = str_starts_with($page['component'] ?? '', 'v3/'))
        @viteReactRefresh
        @vite([$isAuthPage ? 'resources/scss/v3.scss' : 'resources/scss/app.scss', 'resources/js/app.tsx'])
        @inertiaHead
    </head>
    <body class="h-full w-full">
        <script>
            (function () {
                let scheme = 'auto';
                try {
                    scheme = JSON.parse(localStorage.getItem('color_scheme')) || 'auto';
                } catch (e) {
                    scheme = localStorage.getItem('color_scheme') || 'auto';
                }
                const osOnDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if ((scheme === 'auto' && osOnDark) || scheme === 'dark') {
                    document.body.classList.add('dark');
                    document.documentElement.style.setProperty('color-scheme', 'dark');
                } else {
                    document.documentElement.style.setProperty('color-scheme', 'light');
                }
            })();
        </script>
        @inertia
    </body>
</html>
