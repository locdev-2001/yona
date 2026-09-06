{{-- Port từ public/api/v1/portals/_mobile_menu.html.erb --}}
@php($hasMultipleLocales = count($portal->publicLocaleCodes()) > 1)

<input type="checkbox" id="mobile-menu-toggle" class="peer/menu hidden" />

<label for="mobile-menu-toggle" class="relative p-2 text-slate-700 dark:text-slate-200 cursor-pointer z-[60] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" aria-label="Toggle menu">
  @include('public.portal.icons.hamburger')
</label>

<div class="fixed inset-0 z-[1000] invisible select-none opacity-0 peer-checked/menu:visible peer-checked/menu:opacity-100 transition-all duration-300 sm:hidden">
  <div class="w-full h-full bg-white dark:bg-slate-900 shadow-xl transition-transform duration-300 ease-out">
    <div class="flex flex-col h-full">
      <div class="flex items-center justify-end py-5 px-4 border-b border-slate-100 dark:border-slate-800">
        <label for="mobile-menu-toggle" class="p-2 text-slate-700 dark:text-slate-200 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" aria-label="Close menu">
          @include('public.portal.icons.close')
        </label>
      </div>

      <div class="flex-1 overflow-y-auto px-5 pb-5 pt-2 flex flex-col gap-4">

        <!-- Theme Switcher Section -->
        <div class="flex flex-col gap-2">
          <h3 class="text-base font-medium text-slate-700 dark:text-slate-300 my-2">
            {{ __('public_portal.header.appearance.title') }}
          </h3>
          <div id="mobile-appearance-dropdown" data-current-theme="{{ $theme }}" class="appearance-menu space-y-1">
            <button class="mobile-theme-button group flex items-center gap-3 justify-start w-full py-2 hover:text-slate-700 dark:hover:text-slate-200 text-slate-800 dark:text-slate-100 transition-colors stroke-slate-800 dark:stroke-slate-100" data-theme="system">
              @include('public.portal.icons.monitor')
              <span class="text-lg font-medium">{{ __('public_portal.header.appearance.system') }}</span>
              <span class="check-mark-icon system-theme">
                @include('public.portal.icons.check-mark')
              </span>
            </button>
            <button class="mobile-theme-button group flex items-center gap-3 justify-start w-full py-2 hover:text-slate-700 dark:hover:text-slate-200 text-slate-800 dark:text-slate-100 transition-colors stroke-slate-800 dark:stroke-slate-100" data-theme="light">
              @include('public.portal.icons.sun')
              <span class="text-lg font-medium">{{ __('public_portal.header.appearance.light') }}</span>
              <span class="check-mark-icon light-theme">
                @include('public.portal.icons.check-mark')
              </span>
            </button>
            <button class="mobile-theme-button group flex items-center gap-3 justify-start py-2 hover:text-slate-700 dark:hover:text-slate-200 text-slate-800 dark:text-slate-100 transition-colors stroke-slate-800 dark:stroke-slate-100" data-theme="dark">
              @include('public.portal.icons.moon')
              <span class="text-lg font-medium">{{ __('public_portal.header.appearance.dark') }}</span>
              <span class="check-mark-icon dark-theme">
                @include('public.portal.icons.check-mark')
              </span>
            </button>
          </div>
        </div>

        @if ($hasMultipleLocales)
          <span class="h-px bg-slate-100/70 dark:bg-slate-800/70 w-full"></span>
        @endif

        <!-- Locale Switcher -->
        @if ($hasMultipleLocales)
          <div id="header-action-button" class="flex flex-col gap-2">
            <h3 class="text-base font-medium text-slate-700 dark:text-slate-300 my-2">
              {{ __('public_portal.header.language') }}
            </h3>
            <div class="flex items-center gap-3 py-2 cursor-pointer stroke-slate-800 dark:stroke-slate-100">
            @include('public.portal.icons.globe')
              <select
                data-portal-slug="{{ $portal->slug }}"
                class="flex-1 bg-transparent text-lg font-medium cursor-pointer focus:outline-none locale-switcher text-slate-800 dark:text-slate-100 hover:text-slate-700 dark:hover:text-slate-200"
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

        <span class="h-px bg-slate-100/70 dark:bg-slate-800/70 w-full"></span>

        <!-- Homepage Link -->
        @if ($portal->homepage_link)
          <a href="{{ $portal->homepage_link }}" target="_blank" rel="noopener noreferrer nofollow" class="flex items-center gap-3 py-2 cursor-pointer stroke-slate-800 dark:stroke-slate-100 text-slate-800 dark:text-slate-100 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
            @include('public.portal.icons.redirect')
            <span class="text-lg font-medium">{{ __('public_portal.header.visit_website') }}</span>
          </a>
        @endif
      </div>
    </div>
  </div>
</div>
