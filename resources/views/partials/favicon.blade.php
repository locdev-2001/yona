{{-- Icon trình duyệt/thiết bị + web app manifest, dùng chung cho mọi bề mặt
     blade. Favicon lấy từ BrandAssets (ảnh Super Admin tải lên, chưa có thì bộ
     tệp mặc định ở public/). --}}
@foreach (app(\App\Services\Branding\BrandAssets::class)->faviconLinks() as $faviconLink)
<link rel="icon" {!! collect($faviconLink)->map(fn ($value, $name) => $name.'="'.e($value).'"')->implode(' ') !!}>
@endforeach
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="{{ route('site_manifest') }}">
<meta name="theme-color" content="{{ config('yona.branding.theme_color') }}">
