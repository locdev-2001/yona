<!DOCTYPE html>
{{-- Trang chủ công khai `/` — mang từ nhánh `main`. Bề mặt riêng như
     survey/portal: blade + entry Vite riêng, không nạp bundle dashboard. --}}
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" dir="ltr">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>{{ $landingConfig['strings']['hero']['eyebrow'] }} · {{ $landingConfig['brand']['name'] }}</title>
        <meta name="description" content="{{ $landingConfig['strings']['hero']['subtitle'] }}">
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=inter:400,500,600,700" rel="stylesheet">
        <script>
            window.landingConfig = @json($landingConfig);
            // Đặt lớp `dark` trước khi vẽ để không chớp nền sáng; cùng khoá
            // localStorage `color_scheme` với dashboard (dashboard/helper/themeHelper).
            (function () {
                try {
                    var scheme = JSON.parse(localStorage.getItem('color_scheme') || '"auto"');
                    var dark = scheme === 'dark' || (scheme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                    if (dark) {
                        document.documentElement.classList.add('dark');
                        document.documentElement.style.setProperty('color-scheme', 'dark');
                    }
                } catch (e) { /* noop */ }
            })();
        </script>
        @viteReactRefresh
        @vite(['resources/css/landing.css', 'resources/js/landing/main.tsx'])
    </head>
    <body class="min-h-screen">
        <div id="app"></div>
    </body>
</html>
