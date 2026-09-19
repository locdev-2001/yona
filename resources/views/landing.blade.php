<!DOCTYPE html>
{{-- Trang chủ công khai `/`. Bề mặt riêng như survey/portal: blade + entry Vite
     riêng, không nạp bundle dashboard. Font self-host qua @font-face trong
     landing.css, không nhúng link tới nhà cung cấp ngoài. --}}
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" dir="ltr">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>{{ $landingConfig['strings']['meta']['title'] }}</title>
        <meta name="description" content="{{ $landingConfig['strings']['meta']['description'] }}">
        <meta property="og:type" content="website">
        <meta property="og:url" content="{{ url()->current() }}">
        <meta property="og:title" content="{{ $landingConfig['strings']['meta']['title'] }}">
        <meta property="og:description" content="{{ $landingConfig['strings']['meta']['description'] }}">
        <meta property="og:image" content="{{ url('/open-graph-1200x630.png') }}">
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:image" content="{{ url('/twitter-x-card-1200x675.png') }}">
        <script>
            window.landingConfig = @json($landingConfig);
        </script>
        @include('partials.favicon')
        @include('partials.analytics')
        @viteReactRefresh
        @vite(['resources/css/landing.css', 'resources/js/landing/main.tsx'])
    </head>
    <body>
        <div id="app"></div>
        {{-- Widget chat của chính Yona (bản chạy thật ở yona.vn) — chỉ trang chủ,
             không nhúng vào partials.analytics vì partial đó dùng chung cho
             dashboard/superadmin/survey. --}}
        <script>
            (function(d,t) {
                var BASE_URL="https://yona.vn";
                var g=d.createElement(t),s=d.getElementsByTagName(t)[0];
                g.src=BASE_URL+"/packs/js/sdk.js";
                g.async = true;
                s.parentNode.insertBefore(g,s);
                g.onload=function(){
                    window.chatwootSDK.run({
                        websiteToken: 'NgH6pmjf9Eseb1UzomLNCDXP',
                        baseUrl: BASE_URL
                    })
                }
            })(document,"script");
        </script>
    </body>
</html>
