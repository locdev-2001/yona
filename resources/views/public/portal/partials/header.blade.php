{{-- Port từ public/api/v1/portals/_header.html.erb --}}
@php($portalLogo = $portal->fileBaseData())
@php($homeLink = $links::home($portal->slug, $portal->defaultLocale() ?: $locale, $theme, false))
@php($publicLocales = $portal->publicLocaleCodes())
<header class="sticky top-0 z-50 w-full bg-white shadow-sm dark:bg-slate-900">
  <nav class="hidden sm:flex max-w-5xl px-4 mx-auto md:px-8" aria-label="Top">
    <div class="flex items-center w-full py-5 overflow-hidden">
      <a href="{{ $homeLink }}" class="flex items-center min-w-0 h-10">
        @if ($portalLogo)
          <img src="{{ $portalLogo['file_url'] }}" class="w-auto h-10 ltr:mr-2 rtl:ml-2" draggable="false" />
        @endif
        <span class="text-lg font-semibold text-slate-900 truncate dark:text-white {{ $portalLogo ? 'hidden lg:block' : 'hidden sm:block' }}">{{ $portal->localizedValue('name', $locale) }}</span>
      </a>
    </div>

    {{-- Go to homepage link section --}}
    <div class="flex items-center justify-between gap-2 sm:gap-5">
      @if ($portal->homepage_link)
        <div class="px-1 py-2 ltr:ml-8 rtl:mr-8 cursor-pointer block">
          <div class="flex-grow flex-shrink-0">
            <a id="header-action-button" target="_blank" rel="noopener noreferrer nofollow" href="{{ $portal->homepage_link }}" class="flex flex-row items-center gap-1 text-sm font-medium whitespace-nowrap text-slate-800 dark:text-slate-100 stroke-slate-700 dark:stroke-slate-200">
              @include('public.portal.icons.redirect')
              {{ __('public_portal.header.go_to_homepage') }}
            </a>
          </div>
        </div>
      @endif

      {{-- Appearance toggle section --}}
      <div class="relative flex-grow flex-shrink-0 px-1 py-2 cursor-pointer">
        <button id="toggle-appearance" class="flex justify-between min-w-[76px] flex-row items-center stroke-slate-700 dark:stroke-slate-200 text-slate-800 dark:text-slate-100 gap-1" type="button">
          <div data-theme="system" class="flex-row items-center gap-1 theme-button {{ $theme === 'system' ? 'flex' : 'hidden' }}">
            @include('public.portal.icons.monitor')
            <span class="text-sm font-medium">{{ __('public_portal.header.appearance.system') }}</span>
          </div>
          <div data-theme="light" class="flex-row items-center gap-1 theme-button {{ $theme === 'light' ? 'flex' : 'hidden' }}">
            @include('public.portal.icons.sun')
            <span class="text-sm font-medium">{{ __('public_portal.header.appearance.light') }}</span>
          </div>
          <div data-theme="dark" class="flex-row items-center gap-1 theme-button {{ $theme === 'dark' ? 'flex' : 'hidden' }}">
            @include('public.portal.icons.moon')
            <span class="text-sm font-medium">{{ __('public_portal.header.appearance.dark') }}</span>
          </div>
          <div class="flex items-center px-1 pointer-events-none">
            @include('public.portal.icons.chevron-down')
          </div>
        </button>
        {{-- Appearance dropdown section --}}
        <div id="appearance-dropdown"
             data-current-theme="{{ $theme }}"
             class="appearance-menu absolute hidden flex-col w-32 h-auto bg-white border border-solid rounded dark:bg-slate-900 top-9 ltr:right-1 rtl:left-1 border-slate-100 dark:border-slate-800 shadow-lg transition-all duration-200 ease-out opacity-0 scale-95 data-[dropdown-open=true]:opacity-100 data-[dropdown-open=true]:scale-100 data-[dropdown-open=true]:flex"
             aria-hidden="true"
             data-dropdown="appearance-dropdown">
          <button class="desktop-theme-button flex flex-row items-center justify-between gap-1 px-2 py-2 border-b border-solid border-slate-100 dark:border-slate-800 stroke-slate-700 dark:stroke-slate-200 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" data-theme="system">
            <div class="flex flex-row items-center gap-1">
              @include('public.portal.icons.monitor')
              <span class="text-xs font-medium">{{ __('public_portal.header.appearance.system') }}</span>
            </div>
            <span class="check-mark-icon system-theme">
              @include('public.portal.icons.check-mark')
            </span>
          </button>
          <button class="desktop-theme-button flex flex-row items-center justify-between gap-1 px-2 py-2 border-b border-solid border-slate-100 dark:border-slate-800 stroke-slate-700 dark:stroke-slate-200 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" data-theme="light">
            <div class="flex flex-row items-center gap-1">
              @include('public.portal.icons.sun')
              <span class="text-xs font-medium">{{ __('public_portal.header.appearance.light') }}</span>
            </div>
            <span class="check-mark-icon light-theme">
              @include('public.portal.icons.check-mark')
            </span>
          </button>
          <button class="desktop-theme-button flex flex-row items-center justify-between gap-1 px-2 py-2 stroke-slate-700 dark:stroke-slate-200 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors rounded-b" data-theme="dark">
            <div class="flex flex-row items-center gap-1">
              @include('public.portal.icons.moon')
              <span class="text-xs font-medium">{{ __('public_portal.header.appearance.dark') }}</span>
            </div>
            <span class="check-mark-icon dark-theme">
              @include('public.portal.icons.check-mark')
            </span>
          </button>
        </div>
      </div>

      {{-- Locale switcher section --}}
      @if (count($publicLocales) > 1)
        <div id="header-action-button" class="flex items-center stroke-slate-700 dark:stroke-slate-200 text-slate-800 dark:text-slate-100">
          <div class="flex items-center gap-1 px-1 py-2 cursor-pointer">
            @include('public.portal.icons.globe')
            <select
              data-portal-slug="{{ $portal->slug }}"
              class="w-24 overflow-hidden text-sm font-medium leading-tight bg-white appearance-none cursor-pointer dark:bg-slate-900 text-ellipsis whitespace-nowrap focus:outline-none focus:shadow-outline locale-switcher"
            >
              @if ($portal->isDraftLocale($locale))
                <option selected disabled value="{{ $locale }}">{{ ($languages[$locale] ?? $locale).' ('.$locale.')' }}</option>
              @endif
              @foreach ($publicLocales as $code)
                <option @selected($code === $locale) value="{{ $code }}">{{ ($languages[$code] ?? $code).' ('.$code.')' }}</option>
              @endforeach
            </select>
            @include('public.portal.icons.chevron-down')
          </div>
        </div>
      @endif
    </div>
  </nav>

  <nav class="flex sm:hidden max-w-5xl px-4 mx-auto" aria-label="Mobile Top">
    <div class="flex items-center justify-between w-full py-5">
      <a href="{{ $homeLink }}" class="flex items-center min-w-0 h-10 text-lg font-semibold text-slate-900 dark:text-white">
        @if ($portalLogo)
          <img src="{{ $portalLogo['file_url'] }}" class="w-auto h-10 ltr:mr-2 rtl:ml-2" draggable="false" />
        @endif
         <span class="text-lg font-semibold text-slate-900 truncate dark:text-white {{ $portalLogo ? 'hidden' : 'sm:hidden block' }}">{{ $portal->localizedValue('name', $locale) }}</span>
      </a>

      @include('public.portal.partials.mobile-menu')
    </div>
  </nav>
</header>
