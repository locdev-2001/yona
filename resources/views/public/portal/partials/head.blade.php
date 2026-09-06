{{-- Port từ layouts/_portal_head.html.erb --}}
<meta charset="utf-8">
<meta name="viewport" content="initial-scale=1">
<meta name="viewport" content="width=device-width, initial-scale=1">

@vite(['resources/scss/portal.scss', 'resources/js/portal/main.ts'])
<style>
  .appearance-menu[data-current-theme="system"] .check-mark-icon:is(.light-theme, .dark-theme),
  .appearance-menu[data-current-theme="dark"] .check-mark-icon:is(.light-theme, .system-theme),
  .appearance-menu[data-current-theme="light"] .check-mark-icon:is(.dark-theme, .system-theme) {
    display: none;
  }
</style>
@hasSection('head')
    @yield('head')
@else
    <title>{{ $portal->displayTitle($locale) }}</title>
@endif

@if ($portal->fileBaseData())
    <link rel="icon" href="{{ $portal->fileBaseData()['file_url'] }}">
@endif

@unless ($isPlainLayout)
    @include('public.portal.partials.analytics')
@endunless

@if (filled($theme))
    {{-- Đặt sẵn localStorage để script bên dưới bật đúng theme, tránh nháy màu. --}}
    <script>localStorage.theme = @json($theme);</script>
@endif

<script>
  if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
    document.documentElement.classList.add('light')
  }
</script>
