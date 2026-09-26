{{-- Port từ layouts/_portal_head.html.erb --}}
<meta charset="utf-8">
<meta name="viewport" content="initial-scale=1">
<meta name="viewport" content="width=device-width, initial-scale=1">

@vite(['resources/scss/portal.scss', 'resources/js/portal/main.ts'])
@hasSection('head')
    @yield('head')
@else
    <title>{{ $portal->displayTitle($locale) }}</title>
@endif

@if ($portal->fileBaseData())
    <link rel="icon" href="{{ $portal->fileBaseData()['file_url'] }}">
@else
    {{-- Portal chưa tải logo riêng thì dùng icon của hệ thống. --}}
    @include('partials.favicon')
@endif

@unless ($isPlainLayout)
    @include('public.portal.partials.analytics')
@endunless
