{{-- Port từ public/api/v1/portals/_header.html.erb --}}
@php($portalLogo = $portal->fileBaseData())
@php($homeLink = $links::home($portal->slug, $portal->defaultLocale() ?: $locale, false))
@php($publicLocales = $portal->publicLocaleCodes())
<header class="sticky top-0 z-50 w-full bg-white shadow-sm">
  <nav class="hidden sm:flex max-w-5xl px-4 mx-auto md:px-8" aria-label="Top">
    <div class="flex items-center w-full py-5 overflow-hidden">
      <a href="{{ $homeLink }}" class="flex items-center min-w-0 h-10">
        @if ($portalLogo)
          <img src="{{ $portalLogo['file_url'] }}" class="w-auto h-10 ltr:mr-2 rtl:ml-2" draggable="false" />
        @endif
        <span class="text-lg font-semibold text-slate-900 truncate {{ $portalLogo ? 'hidden lg:block' : 'hidden sm:block' }}">{{ $portal->localizedValue('name', $locale) }}</span>
      </a>
    </div>

    {{-- Go to homepage link section --}}
    <div class="flex items-center justify-between gap-2 sm:gap-5">
      @if ($portal->homepage_link)
        <div class="px-1 py-2 ltr:ml-8 rtl:mr-8 cursor-pointer block">
          <div class="flex-grow flex-shrink-0">
            <a id="header-action-button" target="_blank" rel="noopener noreferrer nofollow" href="{{ $portal->homepage_link }}" class="flex flex-row items-center gap-1 text-sm font-medium whitespace-nowrap text-slate-800 stroke-slate-700">
              @include('public.portal.icons.redirect')
              {{ __('public_portal.header.go_to_homepage') }}
            </a>
          </div>
        </div>
      @endif

      {{-- Locale switcher section --}}
      @if (count($publicLocales) > 1)
        <div id="header-action-button" class="flex items-center stroke-slate-700 text-slate-800">
          <div class="flex items-center gap-1 px-1 py-2 cursor-pointer">
            @include('public.portal.icons.globe')
            <select
              data-portal-slug="{{ $portal->slug }}"
              class="w-24 overflow-hidden text-sm font-medium leading-tight bg-white appearance-none cursor-pointer text-ellipsis whitespace-nowrap focus:outline-none focus:shadow-outline locale-switcher"
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
      <a href="{{ $homeLink }}" class="flex items-center min-w-0 h-10 text-lg font-semibold text-slate-900">
        @if ($portalLogo)
          <img src="{{ $portalLogo['file_url'] }}" class="w-auto h-10 ltr:mr-2 rtl:ml-2" draggable="false" />
        @endif
         <span class="text-lg font-semibold text-slate-900 truncate {{ $portalLogo ? 'hidden' : 'sm:hidden block' }}">{{ $portal->localizedValue('name', $locale) }}</span>
      </a>

      @include('public.portal.partials.mobile-menu')
    </div>
  </nav>
</header>
