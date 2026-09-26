{{-- Port từ app/views/layouts/portal.html.erb (+ portal.html+plain.erb).
     Biến dùng chung do BaseController::portalViewData cấp. --}}
<!DOCTYPE html>
<html data-installation-name="{{ config('yona.branding.installation_name') }}" lang="{{ str_replace('_', '-', $locale) }}">
    <head>
        @include('public.portal.partials.head')
    </head>
    <body class="font-default bg-white">
        @unless ($isPlainLayout)
            @include('public.portal.partials.analytics-noscript')
        @endunless
        <div id="portal" class="antialiased">
            <main class="flex flex-col min-h-screen main-content" role="main">
                @unless ($isPlainLayout)
                    @include('public.portal.partials.header')
                @endunless
                @yield('content')
                @unless ($isPlainLayout)
                    @include('public.portal.partials.footer')
                @endunless
            </main>
        </div>
        @include('public.portal.partials.scripts')
    </body>
</html>
