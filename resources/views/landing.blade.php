<!DOCTYPE html>
{{-- Mọi trang của bề mặt công khai (`/`, `/zalo-ca-nhan`, `/dat-lich-demo`).
     Bề mặt riêng như survey/portal: blade + entry Vite riêng, không nạp bundle
     dashboard. Font self-host qua @font-face trong landing.css, không nhúng link
     tới nhà cung cấp ngoài.

     MỘT blade cho mọi trang: `landingConfig.page` quyết định component nào được
     mount. Thêm blade mới là thêm một chỗ nữa phải khai trong content của
     tailwind.landing.config.js, quên thì class riêng của trang đó rụng khỏi CSS. --}}
<html data-installation-name="{{ config('yona.branding.installation_name') }}" lang="{{ str_replace('_', '-', app()->getLocale()) }}" dir="ltr">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>{{ $landingConfig['meta']['title'] }}</title>
        <meta name="description" content="{{ $landingConfig['meta']['description'] }}">
        {{-- Trang cảm ơn không có gì để xếp hạng, và lọt vào kết quả tìm kiếm thì
             khách vào đó trước khi gửi form. Trang 404 thì không có gì để lập chỉ
             mục, và canonical về một URL không tồn tại là tự mâu thuẫn. --}}
        @if (in_array($landingConfig['page'], ['demo_thanks', 'not_found'], true))
            <meta name="robots" content="noindex, follow">
        @endif
        @if ($landingConfig['page'] !== 'not_found')
            <link rel="canonical" href="{{ $landingConfig['seo']['canonical'] }}">
            @foreach ($landingConfig['seo']['alternates'] as $alternate)
                <link rel="alternate" hreflang="{{ str_replace('_', '-', $alternate['locale']) }}" href="{{ $alternate['url'] }}">
            @endforeach
            <link rel="alternate" hreflang="x-default" href="{{ $landingConfig['seo']['default'] }}">
        @endif
        <meta property="og:type" content="website">
        <meta property="og:url" content="{{ $landingConfig['seo']['canonical'] }}">
        <meta property="og:title" content="{{ $landingConfig['meta']['title'] }}">
        <meta property="og:description" content="{{ $landingConfig['meta']['description'] }}">
        <meta property="og:image" content="{{ url('/open-graph-1200x630.png') }}">
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:image" content="{{ url('/twitter-x-card-1200x675.png') }}">
        <script>
            window.landingConfig = @json($landingConfig);
        </script>
        {{-- JSON-LD sinh ở server: bot đọc HTML thô, không chờ React mount. --}}
        @foreach (\App\Support\LandingStructuredData::make($landingConfig['page'], $landingConfig['meta']) as $luocDo)
            <script type="application/ld+json">@json($luocDo, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)</script>
        @endforeach
        @include('partials.favicon')
        @include('partials.analytics')
        @viteReactRefresh
        @vite(['resources/css/landing.css', 'resources/js/landing/main.tsx'])
    </head>
    <body data-page="{{ $landingConfig['page'] }}">
        <div id="app">{!! \App\Support\LandingPrerender::html($landingConfig) !!}</div>
        {{-- Widget chat của chính Yona (bản chạy thật ở yona.vn) — mọi trang công
             khai, không nhúng vào partials.analytics vì partial đó dùng chung cho
             dashboard/superadmin/survey. Trang 404 thì không: nó cũng là trang lỗi
             của Help Center và link khảo sát của tenant, khách của tenant không
             nên thấy khung chat của Yona. Landing chạy ở máy dev không tạo được dữ
             liệu production khi hộp thư này đặt Tên miền được phép là yona.vn. --}}
        @if ($landingConfig['page'] !== 'not_found')
        {!! \App\Support\WidgetEmbedScript::render('https://yona.vn', 'NgH6pmjf9Eseb1UzomLNCDXP') !!}
        @endif
    </body>
</html>
