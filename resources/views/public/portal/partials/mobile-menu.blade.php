{{-- Port từ public/api/v1/portals/_mobile_menu.html.erb --}}
@php($hasMultipleLocales = count($portal->publicLocaleCodes()) > 1)

<input type="checkbox" id="mobile-menu-toggle" class="peer/menu hidden" />

<label for="mobile-menu-toggle" class="relative p-2 text-slate-700 cursor-pointer z-[60] hover:bg-slate-100 rounded-lg transition-colors" aria-label="Toggle menu">
  @include('public.portal.icons.hamburger')
</label>

<div class="fixed inset-0 z-[1000] invisible select-none opacity-0 peer-checked/menu:visible peer-checked/menu:opacity-100 transition-all duration-300 sm:hidden">
  <div class="w-full h-full bg-white shadow-xl transition-transform duration-300 ease-out">
    <div class="flex flex-col h-full">
      <div class="flex items-center justify-end py-5 px-4 border-b border-slate-100">
        <label for="mobile-menu-toggle" class="p-2 text-slate-700 cursor-pointer hover:bg-slate-100 rounded-lg transition-colors" aria-label="Close menu">
          @include('public.portal.icons.close')
        </label>
      </div>

      <div class="flex-1 overflow-y-auto px-5 pb-5 pt-2 flex flex-col gap-4">

        <!-- Locale Switcher -->
        @if ($hasMultipleLocales)
          <div id="header-action-button" class="flex flex-col gap-2">
            <h3 class="text-base font-medium text-slate-700 my-2">
              {{ __('public_portal.header.language') }}
            </h3>
            <div class="flex items-center gap-3 py-2 cursor-pointer stroke-slate-800">
            @include('public.portal.icons.globe')
              <select
                data-portal-slug="{{ $portal->slug }}"
                class="flex-1 bg-transparent text-lg font-medium cursor-pointer focus:outline-none locale-switcher text-slate-800 hover:text-slate-700"
              >
                @if ($portal->isDraftLocale($locale))
                  <option selected disabled value="{{ $locale }}">{{ ($languages[$locale] ?? $locale).' ('.$locale.')' }}</option>
                @endif
                @foreach ($portal->publicLocaleCodes() as $code)
                  <option @selected($code === $locale) value="{{ $code }}">{{ ($languages[$code] ?? $code).' ('.$code.')' }}</option>
                @endforeach
              </select>
            </div>
          </div>
        @endif

        <span class="h-px bg-slate-100/70 w-full"></span>

        <!-- Homepage Link -->
        @if ($portal->homepage_link)
          <a href="{{ $portal->homepage_link }}" target="_blank" rel="noopener noreferrer nofollow" class="flex items-center gap-3 py-2 cursor-pointer stroke-slate-800 text-slate-800 hover:text-slate-700 transition-colors">
            @include('public.portal.icons.redirect')
            <span class="text-lg font-medium">{{ __('public_portal.header.visit_website') }}</span>
          </a>
        @endif
      </div>
    </div>
  </div>
</div>
