{{-- Port từ public/api/v1/portals/_hero.html.erb --}}
@php($portalLogo = $portal->fileBaseData())
<section id="portal-bg" class="w-full bg-white shadow-inner">
  <div id="portal-bg-gradient" class="pt-8 pb-8 md:pt-14 md:pb-6 min-h-[240px] md:min-h-[260px]">
    <div class="mx-auto max-w-5xl px-4 md:px-8 flex flex-col items-start">
       <span class="text-sm leading-[24px] font-semibold text-slate-600 mb-1 {{ $portalLogo ? 'block lg:hidden' : 'hidden' }}">{{ $portal->localizedValue('name', $locale) }}</span>
      <h1 class="text-2xl md:text-4xl text-slate-900 font-semibold leading-normal">
        {{ $portal->localizedValue('header_text', $locale) }}
      </h1>
      <p class="text-slate-600 text-start text-lg leading-normal pt-2 pb-4">{{ __('public_portal.hero.sub_title') }}</p>
      <div id="search-wrap" class="w-full relative z-30"></div>
      @if ($recommendedCategories->isNotEmpty())
        <div class="mt-5 flex items-center gap-2 flex-wrap text-sm">
          <span class="text-slate-500">{{ __('public_portal.sidebar.recommended_label') }}</span>
          @foreach ($recommendedCategories as $category)
            <a href="{{ $links::category($portal->slug, $category->locale, $category->slug, false) }}"
               class="recommended-pill inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-solid border-slate-200 text-slate-700 transition">
              @if (filled($category->icon))<span class="inline-flex items-center text-xs leading-none">{!! $links::emojiOrIcon($category->icon, $category->icon_color) !!}</span>@endif
              {{ $category->name }}
            </a>
          @endforeach
        </div>
      @endif
    </div>
  </div>
</section>
