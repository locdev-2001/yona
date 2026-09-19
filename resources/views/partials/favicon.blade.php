{{-- Icon trình duyệt/thiết bị + web app manifest. Tệp nằm ở public/ (bộ brand
     kit Yona), dùng chung cho mọi bề mặt blade nên gom về một partial. --}}
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="{{ route('site_manifest') }}">
<meta name="theme-color" content="{{ config('yona.branding.theme_color') }}">
